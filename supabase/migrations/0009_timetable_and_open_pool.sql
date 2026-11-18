-- Task 17: the real timetable (Warriors 1/2, adults + Titans, women, Saturday open mat),
-- a time for each jiu-jitsu day, and the open pool membership (freeze + closures).
-- Source: owner's sheets in docs/pricing/ and answers on 2026-11-18.

-- ---------- classes: name, length, who it's for, free sessions, age range ----------
alter table public.classes
  add column label text,
  add column duration_min smallint not null default 60 check (duration_min between 15 and 240),
  add column audience text not null default 'all' check (audience in ('all','women')),
  add column is_free boolean not null default false,
  add column min_age smallint,
  add column max_age smallint;

-- one active class per place, day and time (old rows stay for history, switched off)
alter table public.classes drop constraint if exists classes_sport_age_group_location_weekday_start_time_key;
create unique index classes_one_active_per_slot on public.classes (sport, location, weekday, start_time) where is_active;

-- the old jiu-jitsu timetable is replaced
update public.classes set is_active = false where sport = 'jiujitsu';

-- swimming labels
update public.classes set label = 'Kids swimming' where sport = 'swimming' and age_group = 'kids';
update public.classes set label = 'Men''s swimming' where sport = 'swimming' and age_group = 'adults';

-- the new jiu-jitsu timetable (coach: the first jiu-jitsu coach for now; staff can change it)
with coach as (select id from public.profiles where role = 'coach' and sport = 'jiujitsu' order by created_at limit 1)
insert into public.classes (sport, age_group, label, location, weekday, start_time, duration_min, audience, is_free, min_age, max_age, capacity, coach_id)
select 'jiujitsu', g, l, loc, d, t::time, dur, aud, free, mn, mx, cap, (select id from coach)
from (values
  ('kids',   'Warriors 1',        'mat_2', 'sat', '16:00', 60, 'all',   false, 5,  7,    12),
  ('kids',   'Warriors 1',        'mat_2', 'mon', '16:00', 60, 'all',   false, 5,  7,    12),
  ('kids',   'Warriors 1',        'mat_2', 'wed', '16:00', 60, 'all',   false, 5,  7,    12),
  ('kids',   'Warriors 1',        'mat_2', 'sun', '17:00', 60, 'all',   false, 5,  7,    12),
  ('kids',   'Warriors 1',        'mat_2', 'tue', '17:00', 60, 'all',   false, 5,  7,    12),
  ('kids',   'Warriors 1',        'mat_2', 'thu', '17:00', 60, 'all',   false, 5,  7,    12),
  ('kids',   'Warriors 2',        'mat_1', 'sun', '16:00', 60, 'all',   false, 8,  10,   12),
  ('kids',   'Warriors 2',        'mat_1', 'tue', '16:00', 60, 'all',   false, 8,  10,   12),
  ('kids',   'Warriors 2',        'mat_1', 'thu', '16:00', 60, 'all',   false, 8,  10,   12),
  ('kids',   'Warriors 2',        'mat_1', 'sat', '17:00', 60, 'all',   false, 8,  10,   12),
  ('kids',   'Warriors 2',        'mat_1', 'mon', '17:00', 60, 'all',   false, 8,  10,   12),
  ('kids',   'Warriors 2',        'mat_1', 'wed', '17:00', 60, 'all',   false, 8,  10,   12),
  ('adults', 'Adults + Titans',   'mat_1', 'sun', '18:00', 90, 'all',   false, 11, null, 20),
  ('adults', 'Adults + Titans',   'mat_1', 'mon', '18:00', 90, 'all',   false, 11, null, 20),
  ('adults', 'Adults + Titans',   'mat_1', 'tue', '18:00', 90, 'all',   false, 11, null, 20),
  ('adults', 'Adults + Titans',   'mat_1', 'wed', '18:00', 90, 'all',   false, 11, null, 20),
  ('adults', 'Adults + Titans',   'mat_1', 'thu', '18:00', 90, 'all',   false, 11, null, 20),
  ('adults', 'Saturday open mat', 'mat_1', 'sat', '18:00', 60, 'all',   true,  11, null, 20),
  ('adults', 'Women',             'mat_2', 'sun', '19:30', 60, 'women', false, 16, null, 15),
  ('adults', 'Women',             'mat_2', 'tue', '19:30', 60, 'women', false, 16, null, 15),
  ('adults', 'Women',             'mat_2', 'thu', '19:30', 60, 'women', false, 16, null, 15)
) as v(g, l, loc, d, t, dur, aud, free, mn, mx, cap);

-- ---------- subscriptions: a time per jiu-jitsu day, and open pool memberships ----------
alter table public.subscriptions
  add column bjj_times jsonb,  -- {"sat":"16:00","sun":"17:00"}; missing day → start_time
  add column kind text not null default 'classes' check (kind in ('classes','open_pool')),
  add column freeze_status text check (freeze_status in ('requested','approved','rejected')),
  add column freeze_start date,
  add column freeze_requested_at timestamptz;

alter table public.subscriptions drop constraint if exists subscriptions_check;
alter table public.subscriptions add constraint subscriptions_days_check
  check (kind = 'open_pool' or cardinality(swim_days) + cardinality(bjj_days) between 2 and 6);
alter table public.subscriptions add constraint subscriptions_pool_no_days
  check (kind = 'classes' or (cardinality(swim_days) = 0 and cardinality(bjj_days) = 0));

-- the class time for one day of a subscription
create or replace function public.sub_time(s public.subscriptions, p_sport text, p_day text)
returns time language sql immutable set search_path = ''
as $$ select case when p_sport = 'jiujitsu' then coalesce((s.bjj_times ->> p_day)::time, s.start_time) else s.start_time end $$;

-- existing jiu-jitsu subscriptions: take each day's time from the new timetable by the member's age
update public.subscriptions s
set bjj_times = t.times
from (
  select s2.id, jsonb_object_agg(d, to_char(c.start_time, 'HH24:MI')) as times
  from public.subscriptions s2
  join public.kids k on k.id = s2.kid_id
  cross join lateral unnest(s2.bjj_days) d
  join public.classes c on c.sport = 'jiujitsu' and c.is_active and not c.is_free and c.audience = 'all' and c.weekday = d
   and extract(year from age(k.birth_date))::int >= coalesce(c.min_age, 0)
   and extract(year from age(k.birth_date))::int <= coalesce(c.max_age, 200)
  group by s2.id
) t
where s.id = t.id;

-- ---------- class cancellations: match each member's own time and group ----------
create or replace function public.cancel_class(p_class uuid, p_date date, p_reason text default null,
  p_compensation text default 'makeup')
returns integer language plpgsql security definer set search_path = ''
as $$
declare c public.classes%rowtype; v_count integer; v_sport_en text; v_sport_ar text; v_time text; v_time_ar text;
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  if lower(to_char(p_date, 'dy')) <> c.weekday then raise exception 'date is not a %', c.weekday; end if;

  insert into public.class_cancellations (class_id, on_date, reason, compensation, cancelled_by)
  values (p_class, p_date, p_reason, p_compensation, auth.uid());

  v_sport_en := case c.sport when 'swimming' then 'Swimming' else 'Jiu-jitsu' end;
  v_sport_ar := case c.sport when 'swimming' then 'السباحة' else 'الجوجيتسو' end;
  v_time := to_char(c.start_time, 'FMHH12:MI') || case when c.start_time < '12:00' then ' AM' else ' PM' end;
  v_time_ar := translate(to_char(c.start_time, 'FMHH12:MI'), '0123456789', '٠١٢٣٤٥٦٧٨٩') || case when c.start_time < '12:00' then ' ص' else ' م' end;

  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  select distinct k.parent_id, 'class_cancelled',
    v_sport_en || ' class cancelled',
    v_sport_en || ' on ' || to_char(p_date, 'Dy DD Mon') || ' at ' || v_time || ' is cancelled. '
      || case p_compensation when 'makeup' then 'You can book a make-up class.'
                             when 'extend' then 'The subscription end date moves forward by one class.'
                             else '' end,
    'تم إلغاء حصة ' || v_sport_ar,
    'تم إلغاء حصة ' || v_sport_ar || ' يوم ' || translate(to_char(p_date, 'DD/MM'), '0123456789', '٠١٢٣٤٥٦٧٨٩') || ' الساعة ' || v_time_ar || '.'
      || case p_compensation when 'makeup' then ' يمكنك حجز حصة تعويضية.'
                             when 'extend' then ' سيتم تمديد الاشتراك حصة واحدة.'
                             else '' end
  from public.subscriptions s join public.kids k on k.id = s.kid_id
  where s.status = 'active' and s.kind = 'classes'
    and public.sub_time(s, c.sport, c.weekday) = c.start_time
    and p_date between s.start_date and s.end_date
    and ((c.sport = 'swimming' and c.weekday = any (s.swim_days))
      or (c.sport = 'jiujitsu' and c.weekday = any (s.bjj_days)))
    -- same group: adults (16+ or the account holder; Titans 11+ in jiu-jitsu) vs kids
    and (case when k.is_self or extract(year from age(k.birth_date)) >= 16
                or (c.sport = 'jiujitsu' and extract(year from age(k.birth_date)) >= 11)
              then 'adults' else 'kids' end) = c.age_group;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------- open pool closures (a day, or the morning / evening session) ----------
create table public.open_pool_closures (
  id uuid primary key default gen_random_uuid(),
  on_date date not null,
  session text not null check (session in ('morning','evening','day')),
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (on_date, session)
);
alter table public.open_pool_closures enable row level security;
create policy pool_closures_select on public.open_pool_closures for select to authenticated using (true);
-- writes only through cancel_open_pool()

create or replace function public.cancel_open_pool(p_date date, p_session text, p_reason text default null)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_first boolean; v_count integer; v_when_en text; v_when_ar text; v_date_ar text;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if p_session not in ('morning','evening','day') then raise exception 'bad session'; end if;
  if extract(dow from p_date) = 5 then raise exception 'the complex is closed on Fridays'; end if;
  -- one extra day per closed date, even if both sessions get cancelled separately
  v_first := not exists (select 1 from public.open_pool_closures where on_date = p_date);
  insert into public.open_pool_closures (on_date, session, reason, created_by) values (p_date, p_session, p_reason, auth.uid());

  v_when_en := case p_session when 'morning' then 'the morning session (10:30 AM–3 PM)'
                              when 'evening' then 'the evening session (7:30–9 PM)' else 'the whole day' end;
  v_when_ar := case p_session when 'morning' then 'الفترة الصباحية (١٠:٣٠ ص – ٣ م)'
                              when 'evening' then 'الفترة المسائية (٧:٣٠ – ٩ م)' else 'اليوم كاملاً' end;
  v_date_ar := translate(to_char(p_date, 'DD/MM'), '0123456789', '٠١٢٣٤٥٦٧٨٩');

  if v_first then
    update public.subscriptions set end_date = end_date + 1
    where kind = 'open_pool' and status = 'active' and p_date between start_date and end_date;
  end if;

  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  select distinct k.parent_id, 'pool_closed',
    'Open pool closed',
    'The open pool is closed on ' || to_char(p_date, 'Dy DD Mon') || ' for ' || v_when_en || '. '
      || 'Your membership gets one extra day.',
    'إغلاق المسبح المفتوح',
    'المسبح المفتوح مغلق يوم ' || v_date_ar || ' في ' || v_when_ar || '. تمت إضافة يوم إلى عضويتك.'
  from public.subscriptions s join public.kids k on k.id = s.kid_id
  where s.kind = 'open_pool' and s.status = 'active' and p_date between s.start_date and s.end_date;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.cancel_open_pool(date, text, text) from public, anon;

-- ---------- open pool freeze: once per membership, 1 week, reception approves ----------
create or replace function public.request_pool_freeze(p_sub uuid, p_start date)
returns void language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype; v_parent uuid;
begin
  select * into s from public.subscriptions where id = p_sub;
  select parent_id into v_parent from public.kids where id = s.kid_id;
  if s.id is null or v_parent <> auth.uid() then raise exception 'not allowed'; end if;
  if s.kind <> 'open_pool' or s.status <> 'active' then raise exception 'not an active open pool membership'; end if;
  if s.freeze_status in ('requested','approved') then raise exception 'freeze already used'; end if;
  if p_start < current_date or p_start > s.end_date then raise exception 'start must be within the membership'; end if;
  update public.subscriptions set freeze_status = 'requested', freeze_start = p_start, freeze_requested_at = now() where id = p_sub;
end $$;
revoke execute on function public.request_pool_freeze(uuid, date) from public, anon;

create or replace function public.decide_pool_freeze(p_sub uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype; v_parent uuid; v_start_ar text;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  select * into s from public.subscriptions where id = p_sub;
  if s.id is null or s.freeze_status is distinct from 'requested' then raise exception 'no freeze request'; end if;
  select parent_id into v_parent from public.kids where id = s.kid_id;
  v_start_ar := translate(to_char(s.freeze_start, 'DD/MM'), '0123456789', '٠١٢٣٤٥٦٧٨٩');
  if p_approve then
    update public.subscriptions set freeze_status = 'approved', end_date = end_date + 7 where id = p_sub;
    insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar) values (v_parent, 'freeze_approved',
      'Freeze approved', 'Your open pool membership is frozen for 1 week from ' || to_char(s.freeze_start, 'Dy DD Mon') || '. It now ends on ' || to_char(s.end_date + 7, 'DD Mon') || '.',
      'تمت الموافقة على التجميد', 'تم تجميد عضوية المسبح المفتوح لمدة أسبوع من ' || v_start_ar || '، وتنتهي الآن في ' || translate(to_char(s.end_date + 7, 'DD/MM'), '0123456789', '٠١٢٣٤٥٦٧٨٩') || '.');
  else
    update public.subscriptions set freeze_status = 'rejected' where id = p_sub;
    insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar) values (v_parent, 'freeze_rejected',
      'Freeze not approved', 'Reception could not approve the freeze from ' || to_char(s.freeze_start, 'Dy DD Mon') || '. Please contact reception.',
      'لم تتم الموافقة على التجميد', 'تعذّر على الاستقبال الموافقة على التجميد من ' || v_start_ar || '. يرجى التواصل مع الاستقبال.');
  end if;
end $$;
revoke execute on function public.decide_pool_freeze(uuid, boolean) from public, anon;

-- ---------- staff edit class times, length, coach, place ----------
create or replace function public.update_class(p_class uuid, p_start time, p_duration smallint, p_coach uuid, p_location text, p_active boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare c public.classes%rowtype;
begin
  if public.current_app_role() not in ('super_admin','manager') then raise exception 'not allowed'; end if;
  if p_coach is not null and not exists (select 1 from public.profiles where id = p_coach and role = 'coach') then raise exception 'not a coach'; end if;
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  update public.classes set start_time = p_start, duration_min = p_duration, coach_id = p_coach, location = p_location, is_active = p_active
  where id = p_class;
  -- jiu-jitsu members of this class move with it (their time for that day)
  if c.sport = 'jiujitsu' and p_start <> c.start_time then
    update public.subscriptions
    set bjj_times = jsonb_set(coalesce(bjj_times, '{}'::jsonb), array[c.weekday], to_jsonb(to_char(p_start, 'HH24:MI')))
    where kind = 'classes' and status in ('active','pending_payment') and c.weekday = any (bjj_days)
      and public.sub_time(subscriptions, 'jiujitsu', c.weekday) = c.start_time;
  end if;
end $$;
revoke execute on function public.update_class(uuid, time, smallint, uuid, text, boolean) from public, anon;
