import { ageOn } from "@lg/shared";

import { requireStaff } from "@/lib/auth";
import { HEALTH, type Kid } from "@/lib/data";

const BELT_COLOR: Record<string, string> = { white: "#F4F4F2", grey: "#9E9E9E", yellow: "#E8C547", orange: "#E08A2E", green: "#3E8E4E" };

function Belt({ belt, stripes }: { belt: string; stripes: number }) {
  const [base, mod] = belt.split("_");
  const main = BELT_COLOR[base] ?? "#9E9E9E";
  const centre = mod === "white" ? "#FFFFFF" : mod === "black" ? "#111111" : main;
  return (
    <span className="inline-flex h-3.5 w-24 overflow-hidden rounded-sm border border-ink-soft align-middle" aria-label={`${belt.replace("_", "-")} belt, ${stripes} stripes`}>
      <span className="flex flex-1 items-center" style={{ background: main }}>
        <span className="block h-[32%] w-full" style={{ background: centre }} />
      </span>
      <span className="flex w-8 justify-end gap-[2px] bg-[#111] pr-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="w-[3px]" style={{ background: i < stripes ? "#fff" : "#3a3a3a" }} />
        ))}
      </span>
    </span>
  );
}

const REL: Record<string, string> = {
  father: "Father",
  mother: "Mother",
  grandfather: "Grandfather",
  grandmother: "Grandmother",
  brother: "Brother",
  sister: "Sister",
  uncle: "Uncle",
  aunt: "Aunt",
  guardian: "Legal guardian",
};

function genderLabel(g: string, adult: boolean) {
  if (g === "male") return adult ? "Male" : "Boy";
  return adult ? "Female" : "Girl";
}

export default async function KidsPage() {
  const { supabase } = await requireStaff();
  const [kidsRes, parentsRes, stripesRes, subsRes] = await Promise.all([
    supabase.from("kids").select("*").order("full_name"),
    supabase.from("profiles").select("id, full_name, phone, relationship").eq("role", "parent"),
    supabase.from("stripes").select("kid_id, belt"),
    supabase.from("subscriptions").select("kid_id, status, end_date").in("status", ["active", "pending_payment"]),
  ]);
  const kids = (kidsRes.data ?? []) as (Kid & { belt_since: string | null; is_self: boolean; gender: string | null; photo_url: string | null })[];
  // private photos: short-lived links, only for staff (database rules)
  const photoPaths = kids.map((k) => k.photo_url).filter((x): x is string => !!x);
  const photos = new Map<string, string>();
  if (photoPaths.length) {
    const { data } = await supabase.storage.from("kid-photos").createSignedUrls(photoPaths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) photos.set(d.path, d.signedUrl);
  }
  const parents = new Map(
    (parentsRes.data ?? []).map((p: { id: string; full_name: string; phone: string | null; relationship: string | null }) => [p.id, p]),
  );
  const stripes = (stripesRes.data ?? []) as { kid_id: string; belt: string }[];
  const subs = (subsRes.data ?? []) as { kid_id: string; status: string; end_date: string }[];

  return (
    <div>
      <h1 className="text-[26px] font-semibold">Members &amp; families</h1>
      <p className="text-ink-soft">
        {kids.filter((k) => !k.is_self).length} kids · {kids.filter((k) => k.is_self).length} adult members · health conditions in red
      </p>
      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[760px] text-[14px]">
          <thead>
            <tr className="border-b border-ink text-left">
              {["Member", "Guardian", "Health", "Swimming", "Jiu-jitsu", "Status"].map((h) => (
                <th key={h} className="label px-3 py-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kids.map((k) => {
              const parent = parents.get(k.parent_id);
              const kidSubs = subs.filter((s) => s.kid_id === k.id);
              const status = kidSubs.some((s) => s.status === "active") ? "Active" : kidSubs.length ? "Waiting for payment" : "Inactive";
              const n = k.belt ? stripes.filter((s) => s.kid_id === k.id && s.belt === k.belt).length : 0;
              return (
                <tr key={k.id} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {k.photo_url && photos.get(k.photo_url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photos.get(k.photo_url)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tile text-xs font-semibold text-swim">
                          {k.full_name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{k.full_name}</div>
                        <div className="text-xs text-ink-soft">
                          {ageOn(k.birth_date)} yrs
                          {k.gender ? ` · ${genderLabel(k.gender, k.is_self || ageOn(k.birth_date) >= 16)}` : ""} · Member {k.member_no}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {k.is_self ? (
                      <div className="font-semibold">Adult member</div>
                    ) : (
                      <div>
                        {parent?.full_name}
                        {parent?.relationship ? <span className="text-ink-soft"> · {REL[parent.relationship] ?? parent.relationship}</span> : null}
                      </div>
                    )}
                    <div className="text-xs text-ink-soft">{parent?.phone}</div>
                    {k.emergency_phone ? <div className="text-xs text-ink-soft">Emergency {k.emergency_phone}</div> : null}
                  </td>
                  <td className="px-3 py-2.5">
                    {k.health_conditions.length || k.health_other ? (
                      <span className="rounded bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                        {[...k.health_conditions.map((h) => HEALTH[h] ?? h), k.health_other].filter(Boolean).join(" · ")}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-soft">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{k.swim_level ? <span className="label text-swim!">Level {k.swim_level}</span> : <span className="text-ink-soft">–</span>}</td>
                  <td className="px-3 py-2.5">
                    {k.belt ? (
                      <span className="flex items-center gap-2">
                        <Belt belt={k.belt} stripes={n} />
                        <span className="text-xs text-ink-soft">{n}/4</span>
                      </span>
                    ) : (
                      <span className="text-ink-soft">–</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
