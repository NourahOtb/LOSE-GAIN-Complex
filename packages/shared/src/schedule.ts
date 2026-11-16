import type { Weekday } from './pricing';

/** What the schedule needs from a subscription. Dates are 'YYYY-MM-DD', time 'HH:MM[:SS]'. */
export type SubLike = {
  id: string;
  kid_id: string;
  swim_days: string[];
  bjj_days: string[];
  start_time: string;
  start_date: string;
  end_date: string;
  status: string;
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

const isCancelled = (cancels: CancelLike[], date: string, sport: Sport, time: string) =>
  cancels.some((c) => c.on_date === date && c.sport === sport && hhmm(c.start_time) === hhmm(time));

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
      if (sub.status !== 'active' || iso < sub.start_date || iso > sub.end_date) continue;
      for (const sport of ['swimming', 'jiujitsu'] as const) {
        if (!daysFor(sub, sport).includes(wd)) continue;
        const at = atTime(day, sub.start_time);
        if (at <= now || isCancelled(cancels, iso, sport, sub.start_time)) continue;
        if (!best || at < best.at) best = { sub, sport, at };
      }
    }
    if (best) return best;
  }
  return best;
}

export type Mark = 'none' | 'done' | 'next' | 'upcoming' | 'cancelled';

/** One mark per day Sat→Thu for this sport in the week that contains `now`. */
export function weekMarks(sub: SubLike, sport: Sport, cancels: CancelLike[], now: Date): { day: Weekday; date: string; mark: Mark }[] {
  const start = weekStart(now);
  const days: Weekday[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'];
  let nextGiven = false;
  return days.map((day, i) => {
    const d = addDays(start, i);
    const iso = isoDate(d);
    if (!daysFor(sub, sport).includes(day) || iso < sub.start_date || iso > sub.end_date) return { day, date: iso, mark: 'none' };
    if (isCancelled(cancels, iso, sport, sub.start_time)) return { day, date: iso, mark: 'cancelled' };
    if (atTime(d, sub.start_time) <= now) return { day, date: iso, mark: 'done' };
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
