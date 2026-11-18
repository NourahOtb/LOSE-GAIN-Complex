import { ageOn, timeOf } from "@lg/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CLASS_COLS, type ClassRow, type Sub } from "./data";

export type Member = {
  id: string;
  full_name: string;
  birth_date: string;
  is_self: boolean;
  gender: string | null;
  photo_url: string | null;
  health_conditions: string[];
  health_other: string | null;
  parent_id: string;
};
/** paid = active registration covers the class; unpaid = registration waiting for payment; expired / none = no current registration */
export type DoorStatus = "paid" | "unpaid" | "later" | "expired" | "none";
export type RosterRow = { member: Member; status: DoorStatus; sessionsLeft: number | null; endsOn: string | null; startsOn?: string | null };

const group = (m: Member, sport: string) => {
  const age = ageOn(m.birth_date);
  return m.is_self || age >= 16 || (sport === "jiujitsu" && age >= 11) ? "adults" : "kids";
};

/** Everything the door needs for one date. */
export async function loadDoor(supabase: SupabaseClient, dateIso: string, weekday: string) {
  const [classesRes, subsRes, kidsRes, attRes, parentsRes] = await Promise.all([
    supabase.from("classes").select(CLASS_COLS).eq("is_active", true).eq("weekday", weekday).order("start_time"),
    supabase.from("subscriptions").select("*").eq("kind", "classes").in("status", ["active", "pending_payment", "expired"]),
    supabase.from("kids").select("id, full_name, birth_date, is_self, gender, photo_url, health_conditions, health_other, parent_id").order("full_name"),
    supabase.from("attendance").select("kid_id, class_id, created_at").eq("on_date", dateIso),
    supabase.from("profiles").select("id, full_name, phone").eq("role", "parent"),
  ]);
  const classes = (classesRes.data ?? []) as ClassRow[];
  const subs = (subsRes.data ?? []) as Sub[];
  const members = (kidsRes.data ?? []) as Member[];
  const attendance = (attRes.data ?? []) as { kid_id: string; class_id: string; created_at: string }[];
  const parents = new Map(((parentsRes.data ?? []) as { id: string; full_name: string; phone: string | null }[]).map((p) => [p.id, p]));

  // photos (private): short-lived links for staff
  const paths = members.map((m) => m.photo_url).filter((x): x is string => !!x);
  const photos: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("kid-photos").createSignedUrls(paths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) photos[d.path] = d.signedUrl;
  }

  const statusOf = (m: Member, cls: ClassRow): Omit<RosterRow, "member"> => {
    const mine = subs.filter((s) => s.kid_id === m.id);
    const days = (s: Sub) => (cls.sport === "swimming" ? s.swim_days : s.bjj_days);
    const covering = mine
      .filter((s) => s.status !== "expired" && dateIso >= s.start_date && dateIso <= s.end_date && days(s).includes(cls.weekday))
      .sort((a, b) => (a.status === "active" ? -1 : 1) - (b.status === "active" ? -1 : 1));
    const s = covering[0];
    if (s) return { status: s.status === "active" ? "paid" : "unpaid", sessionsLeft: s.sessions_total - s.sessions_used, endsOn: s.end_date };
    // a registration that hasn't started yet, otherwise the most recent one that ended
    const later = mine.filter((s) => s.status !== "expired" && s.start_date > dateIso).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
    if (later) return { status: "later", sessionsLeft: null, endsOn: later.end_date, startsOn: later.start_date };
    const last = mine.filter((s) => s.end_date < dateIso || s.status === "expired").sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
    return { status: last ? "expired" : "none", sessionsLeft: null, endsOn: last?.end_date ?? null };
  };

  // booked members per class: current registrations (paid or waiting) at this day, time and group
  const rosters = Object.fromEntries(
    classes.map((cls) => {
      const booked = members.filter((m) =>
        subs.some(
          (s) =>
            s.kid_id === m.id &&
            s.status !== "expired" &&
            dateIso >= s.start_date &&
            dateIso <= s.end_date &&
            (cls.sport === "swimming" ? s.swim_days : s.bjj_days).includes(cls.weekday) &&
            timeOf(s, cls.sport, cls.weekday).slice(0, 5) === cls.start_time.slice(0, 5) &&
            group(m, cls.sport) === cls.age_group,
        ),
      );
      // walk-ins already checked in to this class are listed too
      const extra = attendance.filter((a) => a.class_id === cls.id && !booked.some((m) => m.id === a.kid_id)).map((a) => members.find((m) => m.id === a.kid_id)).filter((m): m is Member => !!m);
      return [cls.id, [...booked, ...extra].map((m) => ({ member: m, ...statusOf(m, cls) }))];
    }),
  ) as Record<string, RosterRow[]>;

  return {
    classes,
    rosters,
    attendance,
    photos,
    members,
    statusFor: (memberId: string, classId: string) => {
      const m = members.find((x) => x.id === memberId);
      const c = classes.find((x) => x.id === classId);
      return m && c ? statusOf(m, c) : null;
    },
    guardian: (m: Member) => (m.is_self ? null : parents.get(m.parent_id) ?? null),
  };
}

/** Today's date in Kuwait (UTC+3) as YYYY-MM-DD. */
export function kuwaitToday(): string {
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
}
