// Registrations are created ONLY here, so the price can't be changed by the app.
//
//   POST /register  (member signed in, or staff at the desk for any member)
//   { kid_id, kind: 'classes'|'open_pool', swim_days, bjj_days, swim_time?, adult_time?, duration, start_date }
//   -> { id, total }  or  { error }
//   dry_run: true → only check and price it (nothing is saved)
//   over_limit: true → staff at the desk register into a full class anyway
//   -> 409 { error: 'full', full: [{ class_id, sport, day, time }] } when a chosen class is full
//      (a family with a waitlist offer for that class may still register)
//
// The server checks the member belongs to this account, works out the class times from the timetable,
// counts the family discount itself, and calculates the price with the same rules as the app
// (pricing.ts is an exact copy of packages/shared/src/pricing.ts; a test keeps them identical).
// The numbers come from the owner's saved price list (table pricing).

import { createClient } from 'npm:@supabase/supabase-js@2';

import { DURATION_WEEKS, priceOpenPool, pricingFrom, priceSubscription, WEEKDAYS, type Duration, type Weekday } from './pricing.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const JS_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DURATIONS: Duration[] = ['1w', '2w', '4w', '3m', '6m', '12m'];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (isoDate: string, n: number) => {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const weekdayOf = (isoDate: string) => JS_DAYS[new Date(isoDate + 'T00:00:00Z').getUTCDay()];
/** today in Kuwait (UTC+3) */
const kuwaitToday = () => iso(new Date(Date.now() + 3 * 3600_000));
const ageOn = (birth: string, onIso: string) => {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [y, m, d] = onIso.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
};
const daysList = (v: unknown): Weekday[] | null => {
  if (!Array.isArray(v)) return null;
  if (!v.every((d) => typeof d === 'string' && (WEEKDAYS as readonly string[]).includes(d))) return null;
  return v as Weekday[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404);
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(token);
    const user = auth.user;
    if (!user) return json({ error: 'not_signed_in' }, 401);

    const body = await req.json();
    const kind = body.kind === 'open_pool' ? 'open_pool' : 'classes';
    const duration = body.duration as Duration;
    if (!DURATIONS.includes(duration)) return json({ error: 'bad_request' }, 400);
    const swim = kind === 'open_pool' ? [] : daysList(body.swim_days ?? []);
    const bjj = kind === 'open_pool' ? [] : daysList(body.bjj_days ?? []);
    if (!swim || !bjj) return json({ error: 'bad_request' }, 400);

    // the member must be on this account, or the caller is staff registering at the desk
    const { data: me } = await db.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    const isStaff = !!me?.is_active && ['super_admin', 'manager', 'receptionist', 'accountant'].includes(me.role);
    const { data: kid } = await db.from('kids').select('id, parent_id, birth_date, is_self, gender').eq('id', body.kid_id).maybeSingle();
    if (!kid || (kid.parent_id !== user.id && !isStaff)) return json({ error: 'not_found' }, 404);

    const today = kuwaitToday();
    const age = ageOn(kid.birth_date, today);
    const member: 'kid' | 'titan' | 'adult' = kid.is_self || age >= 16 ? 'adult' : age >= 11 ? 'titan' : 'kid';
    if (member === 'adult' && !kid.gender) return json({ error: 'gender_required' }, 400);

    // class times
    const swimTime = member === 'adult' ? '16:00' : body.swim_time === '17:00' ? '17:00' : '16:00';
    let adultBjjTime = '18:00';
    if (member === 'adult' && kid.gender === 'female' && body.adult_time === '19:30') {
      if (bjj.some((d) => !['sun', 'tue', 'thu'].includes(d))) return json({ error: 'not_offered' }, 400);
      adultBjjTime = '19:30';
    }
    const bjjTimes: Record<string, string> = {};
    if (bjj.length) {
      if (member === 'kid') {
        // Warriors: the time comes from the timetable by age and day
        const { data: classes } = await db
          .from('classes')
          .select('weekday, start_time, min_age, max_age')
          .eq('sport', 'jiujitsu')
          .eq('is_active', true)
          .eq('is_free', false)
          .eq('audience', 'all')
          .eq('age_group', 'kids');
        for (const d of bjj) {
          const c = (classes ?? []).find((x) => x.weekday === d && age >= (x.min_age ?? 0) && age <= (x.max_age ?? 200));
          bjjTimes[d] = c ? String(c.start_time).slice(0, 5) : swimTime;
        }
      } else {
        for (const d of bjj) bjjTimes[d] = adultBjjTime;
      }
    }

    // family discount: kids (not adults) on this account with a current registration, plus this one
    let familyKidCount = 0;
    if (member !== 'adult') {
      const { data: famKids } = await db.from('kids').select('id, birth_date, is_self').eq('parent_id', kid.parent_id);
      const kidIds = (famKids ?? []).filter((k) => !k.is_self && ageOn(k.birth_date, today) < 16).map((k) => k.id);
      const { data: subs } = await db.from('subscriptions').select('kid_id').in('kid_id', kidIds.length ? kidIds : ['00000000-0000-0000-0000-000000000000']).in('status', ['active', 'pending_payment']);
      familyKidCount = new Set([...(subs ?? []).map((s) => s.kid_id), kid.id]).size;
    }

    // the owner's saved prices (Dashboard → Prices); anything missing falls back to the built-in ones
    const { data: saved } = await db.from('pricing').select('config').eq('id', 1).maybeSingle();
    const cfg = pricingFrom(saved?.config);

    const price =
      kind === 'open_pool'
        ? priceOpenPool(member, duration, cfg)
        : priceSubscription({
            member: member === 'titan' && bjj.length ? 'titan' : member,
            gender: kid.gender ?? undefined,
            swimDays: swim,
            bjjDays: bjj,
            duration,
            familyKidCount,
          }, cfg);
    if (!price.ok) return json({ error: price.error }, 400);

    // first day: within the next 2 weeks, on a chosen class day (open pool: any day but Friday)
    const start = String(body.start_date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start < today || start > addDays(today, 14)) return json({ error: 'bad_start' }, 400);
    const wd = weekdayOf(start);
    if (kind === 'open_pool' ? wd === 'fri' : ![...swim, ...bjj].includes(wd as Weekday)) return json({ error: 'bad_start' }, 400);

    const weeks = DURATION_WEEKS[duration];
    const end = addDays(start, weeks * 7);

    // no two classes for the same member at the same day and time (the database enforces this too)
    if (kind === 'classes') {
      const mine = [...swim.map((d) => `${d} ${swimTime}`), ...bjj.map((d) => `${d} ${bjjTimes[d]}`)];
      const self = mine.find((x, i) => mine.indexOf(x) !== i);
      if (self) return json({ error: 'overlap', slot: self }, 409);
      const { data: others } = await db
        .from('subscriptions')
        .select('swim_days, bjj_days, start_time, bjj_times')
        .eq('kid_id', kid.id)
        .eq('kind', 'classes')
        .in('status', ['active', 'pending_payment'])
        .lte('start_date', end)
        .gte('end_date', start);
      for (const o of others ?? []) {
        const t = String(o.start_time).slice(0, 5);
        const theirs = [
          ...(o.swim_days as string[]).map((d) => `${d} ${t}`),
          ...(o.bjj_days as string[]).map((d) => `${d} ${((o.bjj_times ?? {}) as Record<string, string>)[d] ?? t}`),
        ];
        const clash = mine.find((x) => theirs.includes(x));
        if (clash) return json({ error: 'overlap', slot: clash }, 409);
      }
    }

    // class capacity: a full class needs a waitlist offer (family) or "over the limit" (staff at the desk)
    const targetClasses: string[] = [];
    if (kind === 'classes') {
      const { data: active } = await db.from('classes').select('id, sport, weekday, start_time, age_group').eq('is_active', true).eq('is_free', false);
      const pick = (sport: string, day: string, t: string, group: string) =>
        (active ?? []).find((c) => c.sport === sport && c.weekday === day && String(c.start_time).slice(0, 5) === t && c.age_group === group);
      const wanted = [
        ...swim.map((d) => ({ sport: 'swimming', day: d, time: swimTime, c: pick('swimming', d, swimTime, member === 'adult' ? 'adults' : 'kids') })),
        ...bjj.map((d) => ({ sport: 'jiujitsu', day: d, time: bjjTimes[d], c: pick('jiujitsu', d, bjjTimes[d], member === 'kid' ? 'kids' : 'adults') })),
      ];
      for (const w of wanted) if (w.c) targetClasses.push(w.c.id);
      if (targetClasses.length) {
        const { data: spaces } = await db.rpc('class_spaces', { p_from: start, p_to: end });
        const space = new Map(((spaces ?? []) as { class_id: string; booked: number; capacity: number }[]).map((x) => [x.class_id, x]));
        const { data: offers } = await db
          .from('waitlist')
          .select('class_id')
          .eq('kid_id', kid.id)
          .eq('status', 'offered')
          .gt('offer_expires', new Date().toISOString());
        const offered = new Set((offers ?? []).map((o) => o.class_id));
        const full = wanted.filter((w) => {
          const x = w.c ? space.get(w.c.id) : undefined;
          return x && x.booked >= x.capacity && !offered.has(w.c!.id);
        });
        if (full.length && !(isStaff && body.over_limit === true)) {
          return json({ error: 'full', full: full.map((w) => ({ class_id: w.c!.id, sport: w.sport, day: w.day, time: w.time })) }, 409);
        }
      }
    }

    // dry run: check and price only (used by the AI assistant to prepare a Confirm card)
    if (body.dry_run === true) {
      return json({
        ok: true,
        total: price.total,
        base: price.base,
        family_pct: price.familyPct,
        months_pct: price.monthsPct,
        sessions: price.sessions,
        start_date: start,
        end_date: end,
        bjj_times: bjj.length ? bjjTimes : null,
        swim_time: swim.length ? swimTime : null,
      });
    }
    const { data: created, error } = await db
      .from('subscriptions')
      .insert({
        kid_id: kid.id,
        kind,
        swim_days: swim,
        bjj_days: bjj,
        start_time: swim.length ? swimTime : bjj.length ? bjjTimes[bjj[0]] : '16:00',
        bjj_times: bjj.length ? bjjTimes : null,
        weeks,
        start_date: start,
        end_date: addDays(start, weeks * 7),
        sessions_total: price.sessions,
        base_price: price.base,
        discount_pct: price.totalPct,
        total: price.total,
        status: 'pending_payment',
      })
      .select('id, total')
      .single();
    if (error?.message?.includes('class_overlap')) return json({ error: 'overlap', slot: error.message.replace('class_overlap ', '') }, 409);
    if (error || !created) {
      console.error('insert failed', error);
      return json({ error: 'server_error' }, 500);
    }
    // waitlist places for these classes are now used
    if (targetClasses.length) {
      await db.from('waitlist').update({ status: 'registered' }).eq('kid_id', kid.id).in('class_id', targetClasses).in('status', ['waiting', 'offered']);
    }
    return json({ id: created.id, total: created.total });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});
