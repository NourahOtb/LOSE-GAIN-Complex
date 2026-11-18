import { redirect } from "next/navigation";

import { AddStaff, StaffItem, type StaffRow } from "@/components/staff-admin";
import { requireStaff } from "@/lib/auth";

export default async function StaffPage() {
  const { supabase, profile } = await requireStaff();
  if (!["super_admin", "manager"].includes(profile.role)) redirect("/");
  const { data } = await supabase.rpc("staff_directory");
  const staff = (data ?? []) as StaffRow[];
  const active = staff.filter((s) => s.is_active);
  const off = staff.filter((s) => !s.is_active);

  return (
    <div className="max-w-4xl">
      <h1 className="text-[26px] font-semibold leading-tight">Staff</h1>
      <p className="text-ink-soft">
        {profile.role === "super_admin" ? "You can add and manage every staff account." : "As a manager you can add and manage coaches and receptionists."}
      </p>

      <section aria-labelledby="add" className="mt-6">
        <h2 id="add" className="label mb-2">
          Add a staff member
        </h2>
        <AddStaff myRole={profile.role} />
      </section>

      <section aria-labelledby="team" className="mt-8">
        <h2 id="team" className="label mb-2">
          Team · {active.length}
        </h2>
        <ul className="text-[14px]">
          {active.map((s) => (
            <StaffItem key={s.id} s={s} myRole={profile.role} isMe={s.id === profile.id} />
          ))}
        </ul>
      </section>

      {off.length ? (
        <section aria-labelledby="off" className="mt-8">
          <h2 id="off" className="label mb-2">
            Switched off · {off.length}
          </h2>
          <ul className="text-[14px]">
            {off.map((s) => (
              <StaffItem key={s.id} s={s} myRole={profile.role} isMe={s.id === profile.id} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
