import { ageOn } from "@lg/shared";
import Link from "next/link";

import { DeskRegister } from "@/components/desk-register";
import { MarkPaid } from "@/components/mark-paid";
import { SendLink } from "@/components/send-link";
import { MemberEditor } from "@/components/member-editor";
import { MemberPhoto } from "@/components/member-photo";
import { requireStaff } from "@/lib/auth";
import { kd, packageLabel, shortDate, type Sub } from "@/lib/data";

const REL: Record<string, string> = { father: "Father", mother: "Mother", grandfather: "Grandfather", grandmother: "Grandmother", brother: "Brother", sister: "Sister", uncle: "Uncle", aunt: "Aunt", guardian: "Legal guardian" };
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
              Guardian: {guardian.full_name}
              {guardian.relationship ? ` · ${REL[guardian.relationship] ?? guardian.relationship}` : ""}
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
              full_name: kid.full_name,
              birth_date: kid.birth_date,
              gender: kid.gender ?? "",
              emergency_phone: kid.emergency_phone ?? "",
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
                    </div>
                    <span className="font-semibold">{kd(s.total)} KD</span>
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
