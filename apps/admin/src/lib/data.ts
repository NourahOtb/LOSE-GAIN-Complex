import { addDays, ageOn, daysUntil, isoDate, weekdayOf } from "@lg/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Sub = {
  id: string;
  kid_id: string;
  swim_days: string[];
  bjj_days: string[];
  start_time: string;
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
};

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

export const kd = (n: number) => `${Number(n).toFixed(3)}`;
export const time12 = (t: string) => (t.startsWith("16") ? "4:00 PM" : t.startsWith("17") ? "5:00 PM" : t.slice(0, 5));
export const shortDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** "Swim Sun·Tue + BJJ Sat · 4 wks" */
export function packageLabel(s: Sub) {
  const parts: string[] = [];
  if (s.swim_days.length) parts.push(`Swim ${s.swim_days.map((d) => DAY[d]).join("·")}`);
  if (s.bjj_days.length) parts.push(`BJJ ${s.bjj_days.map((d) => DAY[d]).join("·")}`);
  const len = s.weeks >= 12 ? `${s.weeks / 4} mo` : `${s.weeks} wk${s.weeks > 1 ? "s" : ""}`;
  return `${parts.join(" + ")} · ${time12(s.start_time)} · ${len}`;
}

export async function loadDashboard(supabase: SupabaseClient) {
  const today = new Date();
  const [subs, kids, parents, classes, cancels, coaches] = await Promise.all([
    supabase.from("subscriptions").select("*").in("status", ["active", "pending_payment"]).order("created_at", { ascending: false }),
    supabase.from("kids").select("id, parent_id, member_no, full_name, birth_date, health_conditions, health_other, emergency_phone, swim_level, belt").order("full_name"),
    supabase.from("profiles").select("id, full_name, phone").eq("role", "parent"),
    supabase.from("classes").select("id, sport, age_group, location, weekday, start_time, capacity, coach_id").eq("is_active", true).order("start_time"),
    supabase.from("class_cancellations").select("class_id, on_date, compensation").gte("on_date", isoDate(addDays(today, -1))),
    supabase.from("profiles").select("id, full_name").eq("role", "coach"),
  ]);
  return {
    today,
    subs: (subs.data ?? []) as Sub[],
    kids: (kids.data ?? []) as Kid[],
    parents: (parents.data ?? []) as Parent[],
    classes: (classes.data ?? []) as ClassRow[],
    cancels: (cancels.data ?? []) as { class_id: string; on_date: string; compensation: string }[],
    coaches: Object.fromEntries(((coaches.data ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name])),
  };
}
export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;

/** Kids booked into a class on a date (active subscriptions that cover that date). */
export function booked(d: Dashboard, cls: ClassRow, dateIso: string) {
  return d.subs.filter((s) => {
    if (s.status !== "active" || dateIso < s.start_date || dateIso > s.end_date) return false;
    if (s.start_time.slice(0, 5) !== cls.start_time.slice(0, 5)) return false;
    const days = cls.sport === "swimming" ? s.swim_days : s.bjj_days;
    if (!days.includes(cls.weekday)) return false;
    if (cls.sport !== "jiujitsu") return true;
    const kid = d.kids.find((k) => k.id === s.kid_id);
    return kid ? cls.age_group === (ageOn(kid.birth_date) >= 11 ? "titans" : "kids") : false;
  });
}

export const expiringWithin = (d: Dashboard, days: number) =>
  d.subs.filter((s) => s.status === "active" && daysUntil(s.end_date, d.today) >= 0 && daysUntil(s.end_date, d.today) <= days).sort((a, b) => a.end_date.localeCompare(b.end_date));

export { weekdayOf, isoDate };
