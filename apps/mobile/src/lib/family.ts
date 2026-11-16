import type { CancelLike, SubLike } from '@lg/shared';

import type { Kid } from './data';
import { supabase } from './supabase';

export type Sub = SubLike & {
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
};

export type FamilyData = {
  kids: (Kid & { stripes: { count: number }[] })[];
  subs: Sub[];
  cancels: CancelLike[];
  classes: ClassRow[];
  coaches: Record<string, string>;
};

/** Everything the parent home needs, in parallel. */
export async function loadFamily(parentId: string): Promise<FamilyData> {
  const [kidsRes, classesRes, coachesRes] = await Promise.all([
    supabase.from('kids').select('*, stripes(count)').eq('parent_id', parentId).order('created_at'),
    supabase.from('classes').select('id, sport, age_group, location, weekday, start_time, coach_id').eq('is_active', true),
    supabase.rpc('coach_directory'),
  ]);
  const kids = (kidsRes.data ?? []) as FamilyData['kids'];
  const classes = (classesRes.data ?? []) as ClassRow[];

  const [subsRes, cancelsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, kid_id, swim_days, bjj_days, start_time, start_date, end_date, status, sessions_total, sessions_used, total, weeks')
      .in('kid_id', kids.map((k) => k.id))
      .in('status', ['active', 'pending_payment'])
      .order('end_date'),
    supabase.from('class_cancellations').select('on_date, class_id').gte('on_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
  ]);

  const byId = new Map(classes.map((c) => [c.id, c]));
  const cancels: CancelLike[] = (cancelsRes.data ?? []).flatMap((c: { on_date: string; class_id: string }) => {
    const cls = byId.get(c.class_id);
    return cls ? [{ on_date: c.on_date, sport: cls.sport, start_time: cls.start_time }] : [];
  });

  const coaches: Record<string, string> = {};
  for (const c of (coachesRes.data ?? []) as { id: string; full_name: string }[]) coaches[c.id] = c.full_name;

  return { kids, subs: (subsRes.data ?? []) as Sub[], cancels, classes, coaches };
}

/** The timetable class a kid's session happens in (sport + day + time; titans for 11+ in jiu-jitsu). */
export function findClass(classes: ClassRow[], sport: 'swimming' | 'jiujitsu', weekday: string, startTime: string, age: number) {
  const matches = classes.filter((c) => c.sport === sport && c.weekday === weekday && c.start_time.slice(0, 5) === startTime.slice(0, 5));
  if (sport === 'jiujitsu') return matches.find((c) => c.age_group === (age >= 11 ? 'titans' : 'kids')) ?? matches[0];
  return matches[0];
}
