import { ageOn, timeOf } from "@lg/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CLASS_COLS, classLabel, time12, type ClassRow } from "./data";

// Task 14h: members and attendance reports for one month, compared with the month before.
// Everything is worked out here from the raw tables, so the page and the Excel file show the same numbers.

export const NOT_RENEWED_DAYS = 30; // owner's choice: no new registration within 30 days of the end
export const MISSED_FLAG = 2; // owner's choice: flag members who missed 2+ booked classes in the month

type Sub = {
  id: string;
  kid_id: string;
  kind: "classes" | "open_pool";
  swim_days: string[];
  bjj_days: string[];
  start_time: string;
  bjj_times: Record<string, string> | null;
  start_date: string;
  end_date: string;
  status: string;
  paid_at: string | null;
  pause_start: string | null;
  pause_end: string | null;
};
type Member = { id: string; parent_id: string; full_name: string; birth_date: string; is_self: boolean };
type Parent = { id: string; full_name: string; phone: string | null; preferred_language: string };

const JS_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (isoDate: string, n: number) => {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const weekday = (isoDate: string) => JS_DAYS[new Date(isoDate + "T00:00:00Z").getUTCDay()];

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = iso(new Date(Date.UTC(y, m, 0)));
  const prev = iso(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, prev, label };
}

const groupOf = (m: Member, sport: "swimming" | "jiujitsu", onIso: string) => {
  const age = ageOn(m.birth_date, new Date(onIso + "T00:00:00"));
  return m.is_self || age >= 16 || (sport === "jiujitsu" && age >= 11) ? "adults" : "kids";
};
const memberType = (m: Member, onIso: string) => {
  const age = ageOn(m.birth_date, new Date(onIso + "T00:00:00"));
  return m.is_self || age >= 16 ? "Adult" : age >= 11 ? "Titan" : "Kid";
};

export async function loadReportData(supabase: SupabaseClient) {
  const [subs, members, parents, classes, cancels, closures, attendance] = await Promise.all([
    supabase.from("subscriptions").select("id, kid_id, kind, swim_days, bjj_days, start_time, bjj_times, start_date, end_date, status, paid_at, pause_start, pause_end"),
    supabase.from("kids").select("id, parent_id, full_name, birth_date, is_self"),
    supabase.from("profiles").select("id, full_name, phone, preferred_language").eq("role", "parent"),
    supabase.from("classes").select(CLASS_COLS),
    supabase.from("class_cancellations").select("class_id, on_date"),
    supabase.from("closures").select("on_date"),
    supabase.from("attendance").select("kid_id, class_id, on_date"),
  ]);
  return {
    subs: (subs.data ?? []) as Sub[],
    members: (members.data ?? []) as Member[],
    parents: (parents.data ?? []) as Parent[],
    classes: (classes.data ?? []) as ClassRow[],
    cancels: (cancels.data ?? []) as { class_id: string; on_date: string }[],
    closures: new Set(((closures.data ?? []) as { on_date: string }[]).map((c) => c.on_date)),
    attendance: (attendance.data ?? []) as { kid_id: string; class_id: string; on_date: string }[],
  };
}
export type ReportData = Awaited<ReturnType<typeof loadReportData>>;

export function buildReport(d: ReportData, month: string, todayIso: string) {
  const { start, end, label } = monthRange(month);
  const byId = new Map(d.members.map((m) => [m.id, m]));
  const parentById = new Map(d.parents.map((p) => [p.id, p]));
  // a registration counts once it's paid (or it was active); cancelled ones don't count
  const real = d.subs.filter((s) => s.status !== "cancelled" && (s.paid_at || s.status === "active" || s.status === "expired"));
  // the current month only counts up to today (later starts and ends haven't happened yet)
  const asOf = todayIso < end ? todayIso : end;
  const overlaps = (s: Sub) => s.start_date <= asOf && s.end_date >= start;

  // ---------- members ----------
  const activeSubs = real.filter(overlaps);
  const active = new Set(activeSubs.map((s) => s.kid_id));
  const bySport = {
    swimming: new Set(activeSubs.filter((s) => s.swim_days.length).map((s) => s.kid_id)).size,
    jiujitsu: new Set(activeSubs.filter((s) => s.bjj_days.length).map((s) => s.kid_id)).size,
    openPool: new Set(activeSubs.filter((s) => s.kind === "open_pool").map((s) => s.kid_id)).size,
  };
  const byType: Record<string, number> = { Kid: 0, Titan: 0, Adult: 0 };
  for (const id of active) {
    const m = byId.get(id);
    if (m) byType[memberType(m, end)]++;
  }

  const firstStart = new Map<string, string>();
  for (const s of real) if (!firstStart.has(s.kid_id) || s.start_date < firstStart.get(s.kid_id)!) firstStart.set(s.kid_id, s.start_date);
  const newMembers = [...firstStart.entries()].filter(([, st]) => st >= start && st <= asOf).map(([id]) => id);

  // ended this month: renewed (a new registration started within 30 days), not renewed (30 days passed), or still waiting
  const ended = real.filter((s) => s.end_date >= start && s.end_date <= end && s.end_date < todayIso);
  const lastEnd = new Map<string, string>();
  for (const s of ended) if (!lastEnd.has(s.kid_id) || s.end_date > lastEnd.get(s.kid_id)!) lastEnd.set(s.kid_id, s.end_date);
  const renewal = (kid: string, endIso: string) =>
    d.subs.some((o) => o.kid_id === kid && o.status !== "cancelled" && o.start_date > addDays(endIso, -14) && o.start_date <= addDays(endIso, NOT_RENEWED_DAYS) && o.end_date > endIso);
  const notRenewed: { id: string; ended: string; waiting: boolean }[] = [];
  let renewedCount = 0;
  for (const [kid, e] of lastEnd) {
    if (renewal(kid, e)) renewedCount++;
    else notRenewed.push({ id: kid, ended: e, waiting: addDays(e, NOT_RENEWED_DAYS) >= todayIso });
  }

  // ---------- attendance ----------
  // check-ins started on the first day anyone was checked in; earlier days aren't counted as missed
  const trackingFrom = d.attendance.reduce((min, a) => (a.on_date < min ? a.on_date : min), "9999-12-31");
  const lastCountable = addDays(todayIso, -1) < end ? addDays(todayIso, -1) : end; // a class today may not have happened yet
  const from = trackingFrom > start ? trackingFrom : start;
  const attended = new Set(d.attendance.map((a) => `${a.kid_id}|${a.class_id}|${a.on_date}`));
  const cancelled = new Set(d.cancels.map((c) => `${c.class_id}|${c.on_date}`));
  const classStats = new Map<string, { booked: number; came: number }>();
  const memberStats = new Map<string, { booked: number; came: number; missedDates: string[] }>();

  for (const s of real.filter((x) => x.kind === "classes" && overlaps(x))) {
    const m = byId.get(s.kid_id);
    if (!m) continue;
    for (let day = s.start_date > from ? s.start_date : from; day <= lastCountable && day <= s.end_date; day = addDays(day, 1)) {
      if (d.closures.has(day)) continue;
      if (s.pause_start && s.pause_end && day >= s.pause_start && day <= s.pause_end) continue;
      const wd = weekday(day);
      for (const sport of ["swimming", "jiujitsu"] as const) {
        if (!(sport === "swimming" ? s.swim_days : s.bjj_days).includes(wd)) continue;
        const t = timeOf(s, sport, wd).slice(0, 5);
        const group = groupOf(m, sport, day);
        const matches = d.classes.filter((c) => c.sport === sport && c.weekday === wd && c.start_time.slice(0, 5) === t);
        // a switched-off class can share the day and time with the live one: prefer the live class
        const cls = matches.find((c) => c.age_group === group && c.is_active) ?? matches.find((c) => c.age_group === group) ?? matches[0];
        if (!cls || cancelled.has(`${cls.id}|${day}`)) continue;
        const came = attended.has(`${m.id}|${cls.id}|${day}`);
        const cs = classStats.get(cls.id) ?? { booked: 0, came: 0 };
        cs.booked++;
        if (came) cs.came++;
        classStats.set(cls.id, cs);
        const ms = memberStats.get(m.id) ?? { booked: 0, came: 0, missedDates: [] };
        ms.booked++;
        if (came) ms.came++;
        else ms.missedDates.push(day);
        memberStats.set(m.id, ms);
      }
    }
  }
  const checkIns = d.attendance.filter((a) => a.on_date >= start && a.on_date <= end).length;
  const walkIns = d.attendance.filter((a) => a.on_date >= start && a.on_date <= end && !memberStats.has(a.kid_id)).length;

  const clsById = new Map(d.classes.map((c) => [c.id, c]));
  const DAY_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu"];
  const perClass = [...classStats.entries()]
    .map(([id, s]) => {
      const c = clsById.get(id)!;
      return { id, day: c.weekday, time: time12(c.start_time), label: classLabel(c), sport: c.sport, booked: s.booked, came: s.came, rate: s.booked ? s.came / s.booked : 0 };
    })
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.time.localeCompare(b.time));

  const person = (id: string) => {
    const m = byId.get(id);
    const p = m ? parentById.get(m.parent_id) : undefined;
    return { id, name: m?.full_name ?? "—", type: m ? memberType(m, end) : "", guardian: m?.is_self ? "" : (p?.full_name ?? ""), phone: p?.phone ?? null, lang: p?.preferred_language ?? "en" };
  };
  const perMember = [...memberStats.entries()]
    .map(([id, s]) => ({ ...person(id), booked: s.booked, came: s.came, missed: s.booked - s.came, missedDates: s.missedDates }))
    .sort((a, b) => b.missed - a.missed || a.name.localeCompare(b.name));

  return {
    month,
    label,
    trackingFrom: trackingFrom === "9999-12-31" ? null : trackingFrom,
    countedUntil: lastCountable,
    members: {
      active: active.size,
      new: newMembers.length,
      ended: lastEnd.size,
      renewed: renewedCount,
      notRenewed: notRenewed.filter((x) => !x.waiting).length,
      waiting: notRenewed.filter((x) => x.waiting).length,
      bySport,
      byType,
      newList: newMembers.map((id) => ({ ...person(id), started: firstStart.get(id)! })),
      notRenewedList: notRenewed.map((x) => ({ ...person(x.id), ended: x.ended, waiting: x.waiting })).sort((a, b) => a.ended.localeCompare(b.ended)),
    },
    attendance: {
      checkIns,
      walkIns,
      booked: perMember.reduce((n, m) => n + m.booked, 0),
      came: perMember.reduce((n, m) => n + m.came, 0),
      perClass,
      perMember,
      flagged: perMember.filter((m) => m.missed >= MISSED_FLAG),
    },
  };
}
export type Report = ReturnType<typeof buildReport>;
