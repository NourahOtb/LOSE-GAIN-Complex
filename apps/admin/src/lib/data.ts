import { addDays, ageOn, daysUntil, isoDate, isPaused, timeOf, weekdayOf } from "@lg/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Sub = {
  id: string;
  kid_id: string;
  swim_days: string[];
  bjj_days: string[];
  start_time: string;
  bjj_times: Record<string, string> | null;
  kind: "classes" | "open_pool";
  freeze_status: "requested" | "approved" | "rejected" | null;
  freeze_start: string | null;
  pause_start: string | null;
  pause_end: string | null;
  start_date: string;
  end_date: string;
  weeks: number;
  sessions_total: number;
  sessions_used: number;
  total: number;
  discount_pct: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
};
export type Kid = {
  id: string;
  parent_id: string;
  member_no: number;
  full_name: string;
  birth_date: string;
  health_conditions: string[];
  health_other: string | null;
  emergency_phone: string | null;
  swim_level: number | null;
  belt: string | null;
  is_self: boolean;
};
export type Parent = { id: string; full_name: string; phone: string | null };
export type ClassRow = {
  id: string;
  sport: "swimming" | "jiujitsu";
  age_group: "kids" | "titans" | "adults";
  location: string;
  weekday: string;
  start_time: string;
  capacity: number;
  coach_id: string | null;
  label: string | null;
  duration_min: number;
  audience: "all" | "women";
  is_free: boolean;
  is_active: boolean;
};

export const CLASS_COLS = "id, sport, age_group, location, weekday, start_time, capacity, coach_id, label, duration_min, audience, is_free, is_active";

export const PLACE: Record<string, string> = { kids_pool: "Kids pool", olympic_pool: "Olympic pool", mat_1: "Mat 1", mat_2: "Mat 2" };
export const DAY: Record<string, string> = { sat: "Sat", sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu" };
export const HEALTH: Record<string, string> = {
  asthma: "Asthma",
  allergies: "Allergies",
  epilepsy: "Epilepsy",
  heart: "Heart",
  injury: "Injury",
  medication: "Medication",
  other: "Other",
};

/** guardian request types (Approvals) */
export const REQUEST_KIND: Record<"pause" | "injury_pause" | "switch" | "cancel", string> = {
  pause: "Pause (1 week, self-service)",
  injury_pause: "Injury pause",
  switch: "Change days or time",
  cancel: "Cancel registration",
};

export const kd = (n: number) => `${Number(n).toFixed(3)}`;
export const time12 = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
/** "Warriors 1 · Mat 2" */
export const classLabel = (c: ClassRow) => `${c.label ?? (c.sport === "swimming" ? "Swim" : "Jiu-jitsu")} · ${PLACE[c.location] ?? c.location}`;
export const shortDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** "Swim Sun·Tue + BJJ Sat · 4 wks" */
export function packageLabel(s: Sub) {
  if (s.kind === "open_pool") return `Open pool · ${s.weeks} wks`;
  const parts: string[] = [];
  if (s.swim_days.length) parts.push(`Swim ${s.swim_days.map((d) => DAY[d]).join("·")}`);
  if (s.bjj_days.length) parts.push(`BJJ ${s.bjj_days.map((d) => DAY[d]).join("·")}`);
  const len = s.weeks >= 12 ? `${s.weeks / 4} mo` : `${s.weeks} wk${s.weeks > 1 ? "s" : ""}`;
  const times = [...new Set([...s.swim_days.map(() => s.start_time), ...s.bjj_days.map((d) => timeOf(s, "jiujitsu", d))].map((t) => time12(t)))];
  return `${parts.join(" + ")} · ${times.join(" / ")} · ${len}`;
}

export async function loadDashboard(supabase: SupabaseClient) {
  const today = new Date();
  const [subs, kids, parents, classes, cancels, coaches, closures, handoffs, waiting, complexClosures] = await Promise.all([
    supabase.from("subscriptions").select("*").in("status", ["active", "pending_payment"]).order("created_at", { ascending: false }),
    supabase.from("kids").select("id, parent_id, member_no, full_name, birth_date, health_conditions, health_other, emergency_phone, swim_level, belt, is_self").order("full_name"),
    supabase.from("profiles").select("id, full_name, phone").eq("role", "parent"),
    supabase.from("classes").select(CLASS_COLS).eq("is_active", true).order("start_time"),
    supabase.from("class_cancellations").select("class_id, on_date, compensation").gte("on_date", isoDate(addDays(today, -1))),
    supabase.from("profiles").select("id, full_name").eq("role", "coach"),
    supabase.from("open_pool_closures").select("on_date, session, reason").gte("on_date", isoDate(today)).order("on_date"),
    supabase.from("assistant_handoffs").select("id, parent_id, summary, created_at").eq("status", "open").order("created_at"),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("closures").select("on_date, reason").gte("on_date", isoDate(today)).order("on_date").limit(10),
  ]);
  return {
    today,
    subs: (subs.data ?? []) as Sub[],
    kids: (kids.data ?? []) as Kid[],
    parents: (parents.data ?? []) as Parent[],
    classes: (classes.data ?? []) as ClassRow[],
    cancels: (cancels.data ?? []) as { class_id: string; on_date: string; compensation: string }[],
    handoffs: (handoffs.data ?? []) as { id: string; parent_id: string; summary: string; created_at: string }[],
    requestsWaiting: waiting.count ?? 0,
    closures: (complexClosures.data ?? []) as { on_date: string; reason: string | null }[],
    poolClosures: (closures.data ?? []) as { on_date: string; session: "morning" | "evening" | "day"; reason: string | null }[],
    coaches: Object.fromEntries(((coaches.data ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name])),
  };
}
export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;

/** Kids booked into a class on a date (active subscriptions that cover that date). */
export function booked(d: Dashboard, cls: ClassRow, dateIso: string) {
  return d.subs.filter((s) => {
    if (s.kind !== "classes" || s.status !== "active" || dateIso < s.start_date || dateIso > s.end_date || isPaused(s, dateIso)) return false;
    const days = cls.sport === "swimming" ? s.swim_days : s.bjj_days;
    if (!days.includes(cls.weekday)) return false;
    if (timeOf(s, cls.sport, cls.weekday).slice(0, 5) !== cls.start_time.slice(0, 5)) return false;
    // same group: adults (16+ or the account holder; Titans 11+ in jiu-jitsu) vs kids
    const kid = d.kids.find((k) => k.id === s.kid_id);
    if (!kid) return false;
    const age = ageOn(kid.birth_date);
    const group = kid.is_self || age >= 16 || (cls.sport === "jiujitsu" && age >= 11) ? "adults" : "kids";
    return cls.age_group === group;
  });
}

export const expiringWithin = (d: Dashboard, days: number) =>
  d.subs.filter((s) => s.status === "active" && daysUntil(s.end_date, d.today) >= 0 && daysUntil(s.end_date, d.today) <= days).sort((a, b) => a.end_date.localeCompare(b.end_date));

export { weekdayOf, isoDate };
