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

/** Close the open pool for a day or one session; members get a notification and one extra day per closed date. */
export async function cancelOpenPool(dateIso: string, session: "morning" | "evening" | "day", reason: string) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("cancel_open_pool", { p_date: dateIso, p_session: session, p_reason: reason || null });
  if (error) {
    if (error.message.includes("duplicate")) return { error: "That session is already closed on this date." };
    if (error.message.includes("Friday")) return { error: "The complex is closed on Fridays." };
    return { error: "Could not close the open pool." };
  }
  revalidatePath("/", "layout");
  return { ok: `Closed. ${data ?? 0} member${data === 1 ? "" : "s"} notified.` };
}

/** Approve or reject an open pool freeze request (approval adds 1 week to the end date). */
export async function decideFreeze(subscriptionId: string, approve: boolean) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("decide_pool_freeze", { p_sub: subscriptionId, p_approve: approve });
  if (error) return { error: "Could not save. The request may already be decided." };
  revalidatePath("/", "layout");
  return { ok: approve ? "Approved" : "Rejected" };
}

/** Change a class's time, length, coach, place, or switch it off (super admin and manager). */
export async function updateClass(classId: string, form: { start: string; duration: number; coach: string; location: string; active: boolean }) {
  const { supabase, profile } = await requireStaff();
  if (profile.role !== "super_admin" && profile.role !== "manager") return { error: "Only the owner or a manager can change classes." };
  if (!/^\d{2}:\d{2}$/.test(form.start)) return { error: "Enter a time like 18:00." };
  const { error } = await supabase.rpc("update_class", {
    p_class: classId,
    p_start: form.start,
    p_duration: form.duration,
    p_coach: form.coach || null,
    p_location: form.location,
    p_active: form.active,
  });
  if (error) return { error: error.message.includes("unique") || error.message.includes("duplicate") ? "Another class already uses that place at that time." : "Could not save the class." };
  revalidatePath("/", "layout");
  return { ok: "Saved" };
}

/** Reception replies to a request the AI assistant passed on; the guardian gets it in the app inbox. */
export async function answerHandoff(id: string, reply: string) {
  const { supabase } = await requireStaff();
  if (!reply.trim()) return { error: "Write a reply first." };
  const { error } = await supabase.rpc("answer_handoff", { p_id: id, p_reply: reply.trim() });
  if (error) return { error: "Could not send the reply." };
  revalidatePath("/", "layout");
  return { ok: "Sent to the guardian's inbox" };
}

/** Door check-in: mark present (uses one session) or undo it. */
export async function checkIn(kidId: string, classId: string, dateIso: string) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("check_in", { p_kid: kidId, p_class: classId, p_date: dateIso });
  if (error) return { error: error.message.includes("not allowed") ? "Only reception, managers and the owner can check members in." : "Could not check in." };
  revalidatePath("/check-in");
  return { ok: "Checked in", status: (data as { status?: string } | null)?.status ?? "none" };
}

export async function undoCheckIn(kidId: string, classId: string, dateIso: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("undo_check_in", { p_kid: kidId, p_class: classId, p_date: dateIso });
  if (error) return { error: "Could not undo." };
  revalidatePath("/check-in");
  return { ok: "Undone" };
}
