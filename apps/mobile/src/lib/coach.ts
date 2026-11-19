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
};

/** Everything a coach needs for their sport (coaches may read all kids by design). */
export async function loadCoachData(sport: Sport): Promise<CoachData> {
  const since = isoDate(new Date(Date.now() - 14 * 86400000));
  const [kids, subs, stripes, classes, cancelled] = await Promise.all([
    supabase.from('kids').select('*').order('full_name'),
    // schedule only (coaches don't see prices or payments)
    supabase.rpc('coach_roster'),
    supabase.from('stripes').select('*').order('awarded_on'),
    supabase.from('classes').select(CLASS_COLS).eq('sport', sport).eq('is_active', true).order('start_time'),
    supabase.from('class_cancellations').select('class_id, on_date').gte('on_date', since),
  ]);
  return {
    kids: (kids.data ?? []) as Kid[],
    subs: (subs.data ?? []) as Sub[],
    stripes: (stripes.data ?? []) as Stripe[],
    classes: (classes.data ?? []) as ClassRow[],
    cancelled: cancelled.data ?? [],
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
