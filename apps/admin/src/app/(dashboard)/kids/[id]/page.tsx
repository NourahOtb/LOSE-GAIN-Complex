import { ageOn } from "@lg/shared";
import Link from "next/link";

import { ChangeDays } from "@/components/change-days";
import { DeskRegister } from "@/components/desk-register";
import { MarkPaid } from "@/components/mark-paid";
import { SendLink } from "@/components/send-link";
import { MemberEditor } from "@/components/member-editor";
import { MemberPhoto } from "@/components/member-photo";
import { requireStaff } from "@/lib/auth";
import { kuwaitToday } from "@/lib/checkin";
import { kd, packageLabel, REQUEST_KIND as KIND, shortDate, type Sub } from "@/lib/data";

const REL: Record<string, string> = { father: "Father", mother: "Mother", grandfather: "Grandfather", grandmother: "Grandmother", brother: "Brother", sister: "Sister", uncle: "Uncle", aunt: "Aunt", cousin: "Cousin", guardian: "Legal guardian" };
const STATUS: Record<string, string> = { active: "Active", pending_payment: "Waiting for payment", expired: "Expired", cancel_requested: "Cancel requested", cancelled: "Cancelled" };

export default async function MemberPage({ params }: PageProps<"/kids/[id]">) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: kid } = await supabase.from("kids").select("*").eq("id", id).maybeSingle();
  if (!kid) return <p className="text-ink-soft">Member not found.</p>;
  const [{ data: guardian }, { data: subs }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, relationship, account_type").eq("id", kid.parent_id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("kid_id", id).order("start_date", { ascending: false }).limit(20),
  ]);
  let photo: string | null = null;
  if (kid.photo_url) {
    const { data } = await supabase.storage.from("kid-photos").createSignedUrl(kid.photo_url, 3600);
    photo = data?.signedUrl ?? null;
  }
  const age = ageOn(kid.birth_date);
  const todayIso = kuwaitToday();
  const { data: reqs } = await supabase
    .from("requests")
    .select("id, kind, status, pause_start, pause_days, note, created_at")
    .in("subscription_id", (subs ?? []).map((s) => s.id).concat(["00000000-0000-0000-0000-000000000000"]))
    .order("created_at", { ascending: false })
    .limit(10);
  const adult = kid.is_self || age >= 16;

  return (
    <div className="max-w-4xl">
      <Link href="/kids" className="text-sm underline underline-offset-2">
        ← Members &amp; families
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-5">
        <MemberPhoto kidId={kid.id} name={kid.full_name} url={photo} />
        <div>
          <h1 className="text-[28px] font-semibold leading-tight">{kid.full_name}</h1>
          <p className="text-ink-soft">
            {age} yrs · Member {kid.member_no}
            {kid.is_self ? " · Adult member (account holder)" : ""}
          </p>
          {guardian && !kid.is_self ? (
            <p className="text-ink-soft">
              Guardian:{" "}
              <Link href={`/families/${kid.parent_id}`} className="underline underline-offset-2">
                {guardian.full_name}
              </Link>
              {kid.relationship ? ` · ${REL[kid.relationship] ?? kid.relationship}` : ""}
              {guardian.phone ? ` · ${guardian.phone}` : ""}
            </p>
          ) : guardian?.phone ? (
            <p className="text-ink-soft">{guardian.phone}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8 max-lg:grid-cols-1">
        <section aria-labelledby="details">
          <h2 id="details" className="label mb-2">
            Details
          </h2>
          <MemberEditor
            kid={{
              id: kid.id,
              first_name: kid.first_name ?? kid.full_name,
              last_name: kid.last_name ?? "",
              relationship: kid.relationship ?? "",
              birth_date: kid.birth_date,
              gender: kid.gender ?? "",
              emergency_phone: kid.emergency_phone ?? "",
              emergency_relation: kid.emergency_relation ?? "",
              health: kid.health_conditions ?? [],
              health_other: kid.health_other ?? "",
            }}
            adult={adult}
          />
        </section>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="regs">
            <h2 id="regs" className="label mb-2">
              Registrations
            </h2>
            {(subs ?? []).length === 0 ? (
              <p className="text-ink-soft">No registrations yet.</p>
            ) : (
              <ul className="text-[14px]">
                {((subs ?? []) as Sub[]).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{packageLabel(s)}</div>
                      <div className="text-xs text-ink-soft">
                        {shortDate(s.start_date)} → {shortDate(s.end_date)} · {STATUS[s.status] ?? s.status}
                        {s.kind === "classes" && s.status === "active" ? ` · ${s.sessions_total - s.sessions_used} left` : ""}
                      </div>
                      {s.pause_start && s.pause_end && s.pause_end >= todayIso ? (
                        <div className="text-xs font-semibold text-bjj">
                          Paused {shortDate(s.pause_start)} → {shortDate(s.pause_end)}
                        </div>
                      ) : null}
                    </div>
                    <span className="font-semibold">{kd(s.total)} KD</span>
                    {s.kind === "classes" && ["active", "pending_payment"].includes(s.status) ? (
                      <div className="w-full">
                        <ChangeDays subId={s.id} swim={s.swim_days} bjj={s.bjj_days} swimTime={s.start_time} kid={!adult} />
                      </div>
                    ) : null}
                    {s.status === "pending_payment" ? (
                      <div className="flex w-full flex-wrap justify-end gap-2">
                        <MarkPaid id={s.id} />
                        <SendLink id={s.id} kid={kid.full_name} amount={Number(s.total)} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(reqs ?? []).length ? (
            <section aria-labelledby="reqs">
              <h2 id="reqs" className="label mb-2">
                Requests
              </h2>
              <ul className="text-[14px]">
                {(reqs ?? []).map((r) => (
                  <li key={r.id} className="border-b border-line py-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">{KIND[r.kind as keyof typeof KIND]}</span>
                      <span className={`text-xs font-semibold ${r.status === "approved" ? "text-swim" : r.status === "rejected" ? "text-danger" : "text-bjj"}`}>
                        {r.status === "pending" ? (
                          <Link href="/approvals" className="underline underline-offset-2">
                            Waiting
                          </Link>
                        ) : r.status === "approved" ? (
                          "Approved"
                        ) : (
                          "Rejected"
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-ink-soft">
                      {[r.pause_start ? `${r.pause_days} days from ${shortDate(r.pause_start)}` : "", r.note ?? ""].filter(Boolean).join(" · ")}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="desk">
            <h2 id="desk" className="label mb-2">
              Register at the desk
            </h2>
            <DeskRegister kidId={kid.id} adult={adult} female={kid.gender === "female"} />
          </section>
        </div>
      </div>
    </div>
  );
}
