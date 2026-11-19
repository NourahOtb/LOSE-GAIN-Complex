import { isoDate, isPaused, timeOf, type Sport } from '@lg/shared';

import { ageGroupOf, type Belt, type Kid, type Stripe } from './data';
import { CLASS_COLS, type ClassRow, type Sub } from './family';
import { supabase } from './supabase';

export const BELT_ORDER: Belt[] = [
  'white', 'grey_white', 'grey', 'grey_black',
  'yellow_white', 'yellow', 'yellow_black',
  'orange_white', 'orange', 'orange_black',
  'green_white', 'green', 'green_black',
];
export const nextBelt = (b: Belt): Belt | null => BELT_ORDER[BELT_ORDER.indexOf(b) + 1] ?? null;

export type CoachData = {
  kids: Kid[];
  subs: Sub[];
  stripes: Stripe[];
  classes: ClassRow[];
  cancelled: { class_id: string; on_date: string }[];
  /** a coach who only teaches women's classes sees only those classes and those members */
  womenOnly: boolean;
};

/**
 * Everything a coach needs for their sport (coaches may read all kids by design).
 * A coach whose classes are all women's classes (e.g. the women's jiu-jitsu coach) sees only the
 * women's classes and the members booked in them. Throws if anything fails, so the screen can say so.
 */
export async function loadCoachData(sport: Sport, coachId: string): Promise<CoachData> {
  const since = isoDate(new Date(Date.now() - 14 * 86400000));
  const [kids, subs, stripes, classes, cancelled] = await Promise.all([
    supabase.from('kids').select('*').order('full_name'),
    // schedule only (coaches don't see prices or payments)
    supabase.rpc('coach_roster'),
    supabase.from('stripes').select('*').order('awarded_on'),
    supabase.from('classes').select(CLASS_COLS).eq('sport', sport).eq('is_active', true).order('start_time'),
    supabase.from('class_cancellations').select('class_id, on_date').gte('on_date', since),
  ]);
  const failed = [kids, subs, stripes, classes, cancelled].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  let allClasses = (classes.data ?? []) as ClassRow[];
  let allSubs = (subs.data ?? []) as Sub[];
  let allKids = (kids.data ?? []) as Kid[];
  const mine = allClasses.filter((c) => c.coach_id === coachId);
  const womenOnly = mine.length > 0 && mine.every((c) => c.audience === 'women');
  if (womenOnly) {
    allClasses = allClasses.filter((c) => c.audience === 'women');
    const kidById = new Map(allKids.map((k) => [k.id, k]));
    allSubs = allSubs.filter((s) =>
      allClasses.some(
        (c) =>
          daysOf(s, sport).includes(c.weekday) &&
          timeOf(s, sport, c.weekday).slice(0, 5) === c.start_time.slice(0, 5) &&
          !!kidById.get(s.kid_id) &&
          ageGroupOf(sport, kidById.get(s.kid_id)!) === c.age_group,
      ),
    );
    const booked = new Set(allSubs.map((s) => s.kid_id));
    allKids = allKids.filter((k) => booked.has(k.id));
  }
  return {
    kids: allKids,
    subs: allSubs,
    stripes: (stripes.data ?? []) as Stripe[],
    classes: allClasses,
    cancelled: cancelled.data ?? [],
    womenOnly,
  };
}

export const daysOf = (s: Sub, sport: Sport) => (sport === 'swimming' ? s.swim_days : s.bjj_days);

/** Kids booked into a class on a given date (active or waiting for payment, date within the subscription, not paused). */
export function kidsInClass(data: CoachData, cls: ClassRow, dateIso: string) {
  const sport = cls.sport;
  return data.subs
    .filter((s) => daysOf(s, sport).includes(cls.weekday) && timeOf(s, sport, cls.weekday).slice(0, 5) === cls.start_time.slice(0, 5))
    .filter((s) => dateIso >= s.start_date && dateIso <= s.end_date)
    .filter((s) => !isPaused(s, dateIso)) // paused that day: not expected in class
    .map((s) => ({ sub: s, kid: data.kids.find((k) => k.id === s.kid_id)! }))
    .filter(({ kid }) => {
      if (!kid) return false;
      return cls.age_group === ageGroupOf(sport, kid);
    });
}

/** Stripes on the kid's current belt, oldest first. */
export const currentStripes = (data: { stripes: Stripe[] }, kid: Kid) =>
  data.stripes.filter((s) => s.kid_id === kid.id && s.belt === kid.belt);
