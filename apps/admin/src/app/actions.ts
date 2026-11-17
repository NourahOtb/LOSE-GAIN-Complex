"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string } | undefined;

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email or password is incorrect." };

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  const staff = ["super_admin", "manager", "receptionist", "accountant"];
  if (!profile || !profile.is_active || !staff.includes(profile.role)) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have access to the admin dashboard." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Receptionist records a desk payment; the database checks the role and notifies the parent. */
export async function markPaid(subscriptionId: string, method: "knet_machine" | "payment_link") {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("mark_paid", { p_subscription: subscriptionId, p_method: method });
  if (error) return { error: "Could not mark as paid. It may already be paid." };
  revalidatePath("/", "layout");
  return { ok: "Paid" };
}

/** Cancel one class on one date; every affected parent gets a notification. */
export async function cancelClass(classId: string, dateIso: string, compensation: "makeup" | "extend" | "none", reason: string) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("cancel_class", {
    p_class: classId,
    p_date: dateIso,
    p_reason: reason || null,
    p_compensation: compensation,
  });
  if (error) return { error: error.message.includes("duplicate") ? "This class is already cancelled." : "Could not cancel the class." };
  revalidatePath("/", "layout");
  return { ok: `Cancelled. ${data ?? 0} parent${data === 1 ? "" : "s"} notified.` };
}
