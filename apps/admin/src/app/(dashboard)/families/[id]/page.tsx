import { ageOn } from "@lg/shared";
import Link from "next/link";

import { AddMemberForm, FamilyNewPassword } from "@/components/family-forms";
import { requireStaff } from "@/lib/auth";

const REL: Record<string, string> = { father: "Father", mother: "Mother", grandfather: "Grandfather", grandmother: "Grandmother", brother: "Brother", sister: "Sister", uncle: "Uncle", aunt: "Aunt", cousin: "Cousin", guardian: "Legal guardian" };

export default async function FamilyPage({ params }: PageProps<"/families/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  const [{ data: g }, { data: kids }, { data: login }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, relationship, account_type, preferred_language").eq("id", id).eq("role", "parent").maybeSingle(),
    supabase.from("kids").select("id, full_name, birth_date, gender, is_self, health_conditions, health_other, relationship").eq("parent_id", id).order("created_at"),
    supabase.rpc("family_login", { p_parent: id }),
  ]);
  if (!g) return <p className="text-ink-soft">Family not found.</p>;
  const acc = ((login ?? []) as { email: string; must_change_password: boolean; last_sign_in_at: string | null }[])[0];
  const single = g.account_type === "single";
  const members = kids ?? [];
  const canManage = ["super_admin", "manager", "receptionist"].includes(profile.role);
  const showAdd = canManage && (!single || members.length === 0);

  return (
    <div className="max-w-4xl">
      <Link href="/kids" className="text-sm underline underline-offset-2">
        ← Members &amp; families
      </Link>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight">{g.full_name}</h1>
      <p className="text-ink-soft">
        {single ? "Adult member (just me)" : "Guardian"}
        {g.phone ? ` · ${g.phone}` : ""} · app in {g.preferred_language === "ar" ? "Arabic" : "English"}
      </p>

      <section aria-labelledby="login" className="mt-6">
        <h2 id="login" className="label mb-2">
          App log-in
        </h2>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-4 text-sm">
          <span className="min-w-0 flex-1">
            {acc?.email ?? "—"}
            <span className="block text-xs text-ink-soft">
              {acc?.last_sign_in_at ? `Last log-in ${new Date(acc.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Hasn't logged in yet"}
              {acc?.must_change_password ? " · still on a temporary password" : ""}
            </span>
          </span>
          {canManage && acc ? <FamilyNewPassword parentId={g.id} name={g.full_name} email={acc.email} phone={g.phone} lang={g.preferred_language} /> : null}
        </div>
      </section>

      <section aria-labelledby="members" className="mt-6">
        <h2 id="members" className="label mb-2">
          {single ? "Member" : "Kids"} · {members.length}
        </h2>
        {members.length === 0 ? (
          <p className="text-ink-soft">No {single ? "member details" : "kids"} yet.</p>
        ) : (
          <ul className="text-[14px]">
            {members.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-3 border-b border-line py-2.5">
                <Link href={`/kids/${k.id}`} className="font-semibold underline underline-offset-2">
                  {k.full_name}
                </Link>
                <span className="text-ink-soft">
                  {k.is_self ? "Guardian · " : k.relationship ? `Guardian is their ${(REL[k.relationship] ?? k.relationship).toLowerCase()} · ` : ""}
                  {ageOn(k.birth_date)} yrs{k.gender ? ` · ${k.gender === "male" ? (k.is_self ? "Male" : "Boy") : k.is_self ? "Female" : "Girl"}` : ""}
                </span>
                {(k.health_conditions ?? []).length || k.health_other ? <span className="rounded bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">Health</span> : null}
                <Link href={`/kids/${k.id}#desk`} className="ml-auto text-sm font-semibold underline underline-offset-2">
                  Register →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAdd ? (
        <section aria-labelledby="add" className="mt-6">
          <h2 id="add" className="label mb-2">
            {single ? "Member details" : "Add a member"}
          </h2>
          <AddMemberForm parentId={g.id} single={single} selfName={g.full_name} canAddSelf={!members.some((k) => k.is_self)} />
        </section>
      ) : null}
    </div>
  );
}
