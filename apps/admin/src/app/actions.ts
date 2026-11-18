"use server";

import { normalizeKuwaitPhone } from "@lg/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { DAY, time12 } from "@/lib/data";
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

const HEALTH_KEYS = ["asthma", "allergies", "epilepsy", "heart", "injury", "medication", "other"];

/** Staff edit a member's details (the database allows staff and the member's own family). */
export async function updateMember(
  kidId: string,
  f: { full_name: string; birth_date: string; gender: string; emergency_phone: string; health: string[]; health_other: string },
) {
  const { supabase } = await requireStaff();
  if (!f.full_name.trim()) return { error: "Name is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.birth_date)) return { error: "Enter the date of birth." };
  if (!["male", "female"].includes(f.gender)) return { error: "Choose boy/male or girl/female." };
  const phone = f.emergency_phone.trim() ? normalizeKuwaitPhone(f.emergency_phone) : null;
  if (f.emergency_phone.trim() && !phone) return { error: "Emergency phone: 8-digit Kuwait mobile number." };
  const { error } = await supabase
    .from("kids")
    .update({
      full_name: f.full_name.trim(),
      birth_date: f.birth_date,
      gender: f.gender,
      emergency_phone: phone,
      health_conditions: f.health.filter((h) => HEALTH_KEYS.includes(h)),
      health_other: f.health_other.trim() || null,
      health_confirmed: true,
    })
    .eq("id", kidId);
  if (error) return { error: "Could not save." };
  revalidatePath(`/kids/${kidId}`);
  revalidatePath("/kids");
  return { ok: "Saved" };
}

/** Staff add or replace a member's photo (already shrunk to a small JPEG in the browser). */
export async function saveMemberPhoto(kidId: string, form: FormData) {
  const { supabase } = await requireStaff();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." };
  if (file.size > 2 * 1024 * 1024) return { error: "Photo is too large." };
  const { data: kid } = await supabase.from("kids").select("parent_id").eq("id", kidId).maybeSingle();
  if (!kid) return { error: "Member not found." };
  const path = `${kid.parent_id}/${kidId}.jpg`;
  const up = await supabase.storage.from("kid-photos").upload(path, await file.arrayBuffer(), { contentType: "image/jpeg", upsert: true });
  if (up.error) return { error: "Could not upload the photo." };
  await supabase.from("kids").update({ photo_url: path }).eq("id", kidId);
  revalidatePath(`/kids/${kidId}`);
  revalidatePath("/kids");
  return { ok: "Photo saved" };
}

export async function removeMemberPhoto(kidId: string) {
  const { supabase } = await requireStaff();
  const { data: kid } = await supabase.from("kids").select("photo_url").eq("id", kidId).maybeSingle();
  if (kid?.photo_url) await supabase.storage.from("kid-photos").remove([kid.photo_url]);
  await supabase.from("kids").update({ photo_url: null }).eq("id", kidId);
  revalidatePath(`/kids/${kidId}`);
  return { ok: "Photo removed" };
}

/** Register a member at the desk through the same server price check as the app. dryRun = price only. */
export async function deskRegister(params: Record<string, unknown>, dryRun: boolean) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.functions.invoke("register", { body: { ...params, dry_run: dryRun } });
  if (error) {
    let body: { error?: string; slot?: string } = {};
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") body = await ctx.json();
    } catch {
      // generic
    }
    const msg: Record<string, string> = {
      too_few_days: "Pick at least 2 days.",
      too_many_days: "Up to 6 days a week.",
      five_plus_bjj_only: "5 and 6 days a week are for jiu-jitsu only.",
      not_offered: "This package isn't offered for this member (check days, length or class).",
      separate_sports: "Register swimming and jiu-jitsu separately for this member.",
      gender_required: "Set boy/male or girl/female on the member first.",
      bad_start: "The first day must be one of the chosen days within the next 2 weeks.",
      overlap: `Clash: this member already has a class on ${body.slot ?? "that day and time"}.`,
    };
    return { error: msg[body.error ?? ""] ?? "Could not register." };
  }
  if (!dryRun) {
    revalidatePath(`/kids/${String(params.kid_id)}`);
    revalidatePath("/");
  }
  return { ok: dryRun ? "price" : "registered", data: data as { id?: string; total?: number; start_date?: string; end_date?: string; family_pct?: number; months_pct?: number; base?: number } };
}

/** Reception creates a 24-hour UPayments link for a waiting registration (also sent to the guardian's app inbox). */
export async function sendPaymentLink(subscriptionId: string) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.functions.invoke("upayments/create", { body: { subscription_id: subscriptionId } });
  if (error || !data?.link) {
    let code = "";
    try {
      const ctx = (error as { context?: Response } | null)?.context;
      if (ctx && typeof ctx.json === "function") code = ((await ctx.json()) as { error?: string }).error ?? "";
    } catch {
      // generic
    }
    return {
      error:
        code === "provider_unavailable"
          ? "UPayments isn't responding right now. Try again in a minute."
          : code === "not_waiting_for_payment"
            ? "This registration is already paid."
            : "Could not create the payment link.",
    };
  }
  return { ok: "Link ready", link: String(data.link), phone: (data.phone as string | null) ?? null, name: (data.name as string | undefined) ?? "", lang: (data.lang as string | undefined) ?? "en" };
}

const REQUEST_ERRORS: Record<string, string> = {
  not_pending: "This request was already answered.",
  already_paused: "This registration is already paused.",
  not_active: "The registration isn't active any more.",
  class_overlap: "The new end date runs into another registration of this member. Change that one first.",
  "not allowed": "Your role can't do this.",
};
const requestError = (message: string, fallback: string) => Object.entries(REQUEST_ERRORS).find(([k]) => message.includes(k))?.[1] ?? fallback;

/** Approve or reject a guardian's request (owner, manager or receptionist). The guardian is told in the app inbox. */
export async function decideRequest(id: string, approve: boolean, reply: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("decide_request", { p_id: id, p_approve: approve, p_reply: reply.trim() || null });
  if (error) return { error: requestError(error.message, "Could not save the decision.") };
  revalidatePath("/", "layout");
  return { ok: approve ? "Approved · guardian notified" : "Rejected · guardian notified" };
}

/** Owner or accountant records how much was refunded for a cancelled registration (0 = no refund). */
export async function recordRefund(id: string, amount: number, method: "knet" | "bank_transfer" | "cash") {
  const { supabase } = await requireStaff();
  if (!Number.isFinite(amount) || amount < 0) return { error: "Enter an amount (0 for no refund)." };
  const { error } = await supabase.rpc("record_refund", { p_id: id, p_amount: amount, p_method: method });
  if (error) return { error: error.message.includes("bad_amount") ? "The refund can't be more than what was paid." : requestError(error.message, "Could not record the refund.") };
  revalidatePath("/", "layout");
  return { ok: amount > 0 ? "Refund recorded · guardian notified" : "Recorded: no refund" };
}

/** Reception changes a registration's days (same number of days, so the price stays the same). */
export async function changeDays(subId: string, swim: string[], bjj: string[], swimTime: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("change_registration_days", { p_sub: subId, p_swim: swim, p_bjj: bjj, p_swim_time: swimTime });
  if (error) {
    if (error.message.includes("class_overlap")) {
      const [day, t] = error.message.replace(/.*class_overlap /, "").split(" ");
      return { error: `Clashes with another class of this member (${DAY[day] ?? day} ${t ? time12(t) : ""}).` };
    }
    if (error.message.includes("same_count")) return { error: "Keep the same number of days for each sport." };
    return { error: requestError(error.message, "Could not change the days.") };
  }
  revalidatePath("/", "layout");
  return { ok: "Days updated · guardian notified" };
}
