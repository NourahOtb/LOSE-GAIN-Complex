import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";

export type StaffRole = "super_admin" | "manager" | "receptionist" | "accountant";
const STAFF: StaffRole[] = ["super_admin", "manager", "receptionist", "accountant"];

export const ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: "Super admin",
  manager: "Manager",
  receptionist: "Receptionist",
  accountant: "Accountant",
};

/** Server-side gate for every dashboard page: signed in, active, and a staff role. */
export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id, full_name, role, is_active").eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_active || !STAFF.includes(profile.role)) redirect("/login?denied=1");

  return { supabase, user, profile: profile as { id: string; full_name: string; role: StaffRole; is_active: boolean } };
}
