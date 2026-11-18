import type { CancelLike, SubLike } from '@lg/shared';

import type { Kid } from './data';
import { supabase } from './supabase';

export type Sub = SubLike & {
  kind: 'classes' | 'open_pool';
  freeze_status: 'requested' | 'approved' | 'rejected' | null;
  freeze_start: string | null;
  payment_link_at: string | null;
  sessions_total: number;
  sessions_used: number;
  total: number;
  weeks: number;
};

export type ClassRow = {
  id: string;
  sport: 'swimming' | 'jiujitsu';
  age_group: 'kids' | 'titans' | 'adults';
  location: 'kids_pool' | 'olympic_pool' | 'mat_1' | 'mat_2';
  weekday: string;
  start_time: string;
  coach_id: string | null;
  label: string | null;
  duration_min: number;
  audience: 'all' | 'women';
  is_free: boolean;
  min_age: number | null;
  max_age: number | null;
};

export const CLASS_COLS = 'id, sport, age_group, location, weekday, start_time, coach_id, label, duration_min, audience, is_free, min_age, max_age';

export type FamilyData = {
  kids: (Kid & { stripes: { count: number }[] })[];
  subs: Sub[];
  cancels: CancelLike[];
  /** days the whole complex is closed (holidays) */
  closures: { on_date: string; reason: string | null }[];
  classes: ClassRow[];
  coaches: Record<string, string>;
};

/** Everything the parent home needs, in parallel. */
export async function loadFamily(parentId: string): Promise<FamilyData> {
  const [kidsRes, classesRes, coachesRes] = await Promise.all([
    supabase.from('kids').select('*, stripes(count)').eq('parent_id', parentId).order('created_at'),
    supabase.from('classes').select(CLASS_COLS).eq('is_active', true),
    supabase.rpc('coach_directory'),
  ]);
  const kids = (kidsRes.data ?? []) as FamilyData['kids'];
  const classes = (classesRes.data ?? []) as ClassRow[];

  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [subsRes, cancelsRes, closuresRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, kid_id, kind, swim_days, bjj_days, start_time, bjj_times, start_date, end_date, status, sessions_total, sessions_used, total, weeks, payment_link_at, freeze_status, freeze_start, pause_start, pause_end')
      .in('kid_id', kids.map((k) => k.id))
      .in('status', ['active', 'pending_payment'])
      .order('end_date'),
    supabase.from('class_cancellations').select('on_date, class_id').gte('on_date', since),
    supabase.from('closures').select('on_date, reason').gte('on_date', since).order('on_date'),
  ]);
  const closures = (closuresRes.data ?? []) as FamilyData['closures'];

  const byId = new Map(classes.map((c) => [c.id, c]));
  const cancels: CancelLike[] = (cancelsRes.data ?? []).flatMap((c: { on_date: string; class_id: string }) => {
    const cls = byId.get(c.class_id);
    return cls ? [{ on_date: c.on_date, sport: cls.sport, start_time: cls.start_time }] : [];
  });
  // a closed day cancels every class that day
  const JS_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  for (const c of closures) {
    const wd = JS_DAYS[new Date(c.on_date + 'T00:00:00').getDay()];
    for (const cls of classes) if (cls.weekday === wd) cancels.push({ on_date: c.on_date, sport: cls.sport, start_time: cls.start_time });
  }

  const coaches: Record<string, string> = {};
  for (const c of (coachesRes.data ?? []) as { id: string; full_name: string }[]) coaches[c.id] = c.full_name;

  return { kids, subs: (subsRes.data ?? []) as Sub[], cancels, closures, classes, coaches };
}

/** The timetable class a member's session happens in (sport + day + time + age group). */
export function findClass(classes: ClassRow[], sport: 'swimming' | 'jiujitsu', weekday: string, startTime: string, group: ClassRow['age_group']) {
  const matches = classes.filter((c) => c.sport === sport && c.weekday === weekday && c.start_time.slice(0, 5) === startTime.slice(0, 5));
  return matches.find((c) => c.age_group === group) ?? matches[0];
}
