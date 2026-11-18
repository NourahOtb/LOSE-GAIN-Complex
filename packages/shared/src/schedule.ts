import type { Weekday } from './pricing';

/** What the schedule needs from a subscription. Dates are 'YYYY-MM-DD', time 'HH:MM[:SS]'. */
export type SubLike = {
  id: string;
  kid_id: string;
  swim_days: string[];
  bjj_days: string[];
  start_time: string;
  /** jiu-jitsu time per day when it differs by day ({"sat":"16:00","sun":"17:00"}); otherwise start_time */
  bjj_times?: Record<string, string> | null;
  start_date: string;
  end_date: string;
  status: string;
  /** a pause (dates included): no classes on these days */
  pause_start?: string | null;
  pause_end?: string | null;
};
export type CancelLike = { on_date: string; sport: 'swimming' | 'jiujitsu'; start_time: string };
export type Sport = 'swimming' | 'jiujitsu';

const JS_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const weekdayOf = (d: Date) => JS_DAYS[d.getDay()];

export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};

/** Kuwait weeks start on Saturday. */
export function weekStart(d: Date): Date {
  const back = (d.getDay() + 1) % 7; // Sat → 0, Sun → 1, ... Fri → 6
  return addDays(d, -back);
}

const hhmm = (t: string) => t.slice(0, 5);

const atTime = (day: Date, time: string) => {
  const [h, m] = hhmm(time).split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
};

/** the member paused this registration on this date */
export const isPaused = (sub: SubLike, date: string) => !!sub.pause_start && !!sub.pause_end && date >= sub.pause_start && date <= sub.pause_end;

const isCancelled = (cancels: CancelLike[], date: string, sport: Sport, time: string) =>
  cancels.some((c) => c.on_date === date && c.sport === sport && hhmm(c.start_time) === hhmm(time));

/** The class time of one day of a subscription. */
export function timeOf(sub: SubLike, sport: Sport, day: string): string {
  return (sport === 'jiujitsu' && sub.bjj_times?.[day]) || sub.start_time;
}

export function daysFor(sub: SubLike, sport: Sport): string[] {
  return sport === 'swimming' ? sub.swim_days : sub.bjj_days;
}

/** The next class (not cancelled, not started) across the given active subscriptions. */
export type NextClass = { sub: SubLike; sport: Sport; at: Date };

export function nextClass(subs: SubLike[], cancels: CancelLike[], now: Date): NextClass | null {
  let best = null as NextClass | null;
  for (let i = 0; i < 21; i++) {
    const day = addDays(now, i);
    const wd = weekdayOf(day);
    const iso = isoDate(day);
    for (const sub of subs) {
      if (sub.status !== 'active' || iso < sub.start_date || iso > sub.end_date || isPaused(sub, iso)) continue;
      for (const sport of ['swimming', 'jiujitsu'] as const) {
        if (!daysFor(sub, sport).includes(wd)) continue;
        const time = timeOf(sub, sport, wd);
        const at = atTime(day, time);
        if (at <= now || isCancelled(cancels, iso, sport, time)) continue;
        if (!best || at < best.at) best = { sub, sport, at };
      }
    }
    if (best) return best;
  }
  return best;
}

export type Mark = 'none' | 'done' | 'next' | 'upcoming' | 'cancelled' | 'paused';

/** One mark per day Sat→Thu for this sport in the week that contains `now`. */
export function weekMarks(sub: SubLike, sport: Sport, cancels: CancelLike[], now: Date): { day: Weekday; date: string; mark: Mark }[] {
  const start = weekStart(now);
  const days: Weekday[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'];
  let nextGiven = false;
  return days.map((day, i) => {
    const d = addDays(start, i);
    const iso = isoDate(d);
    if (!daysFor(sub, sport).includes(day) || iso < sub.start_date || iso > sub.end_date) return { day, date: iso, mark: 'none' };
    if (isPaused(sub, iso)) return { day, date: iso, mark: 'paused' };
    const time = timeOf(sub, sport, day);
    if (isCancelled(cancels, iso, sport, time)) return { day, date: iso, mark: 'cancelled' };
    if (atTime(d, time) <= now) return { day, date: iso, mark: 'done' };
    if (!nextGiven) {
      nextGiven = true;
      return { day, date: iso, mark: 'next' };
    }
    return { day, date: iso, mark: 'upcoming' };
  });
}

/** Whole days from today until the end date (0 = ends today). */
export function daysUntil(endIso: string, now: Date): number {
  const [y, m, d] = endIso.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

/**
 * Start-date choices: every date in the next `horizonDays` that falls on one of the
 * chosen class days. Today only counts if the class time hasn't passed yet.
 */
export function startOptions(classDays: string[], startTime: string | ((day: string) => string), now: Date, horizonDays = 14): string[] {
  const out: string[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const day = addDays(now, i);
    const wd = weekdayOf(day);
    if (!classDays.includes(wd)) continue;
    const time = typeof startTime === 'function' ? startTime(wd) : startTime;
    if (i === 0 && atTime(day, time) <= now) continue;
    out.push(isoDate(day));
  }
  return out;
}
