-- LOSE | GAIN Complex: demo schema (Wednesday 2026-11-18)
-- Tables: profiles, kids, classes, class_cancellations, subscriptions,
--         stripes, coach_notes, notifications
-- Security: Row Level Security on every table. Role changes, payments,
-- cancellations, stripes and notifications go through checked functions.

-- ---------- helpers ----------
create type public.app_role as enum
  ('parent','coach','super_admin','manager','receptionist','accountant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'parent',
  sport text check (sport in ('swimming','jiujitsu')),          -- coaches only
  preferred_language text not null default 'en' check (preferred_language in ('ar','en')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() and is_active $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('super_admin','manager','receptionist','accountant'), false) $$;

create or replace function public.is_coach_or_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('coach','super_admin','manager','receptionist','accountant'), false) $$;

-- every new sign-up becomes a parent, whatever the app sends
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    case when new.raw_user_meta_data->>'preferred_language' = 'ar' then 'ar' else 'en' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- kids ----------
create table public.kids (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  member_no integer generated always as identity (start with 400),
  full_name text not null,
  birth_date date not null,
  photo_url text,
  health_conditions text[] not null default '{}',  -- asthma, allergies, epilepsy, heart, injury, medication, other
  health_other text,
  health_confirmed boolean not null default false, -- parent answered the checklist ("none" = empty list + confirmed)
  emergency_phone text,
  swim_level smallint check (swim_level between 1 and 10),
  swim_level_since date,
  belt text check (belt in ('white','grey_white','grey','grey_black','yellow_white','yellow','yellow_black','orange_white','orange','orange_black','green_white','green','green_black')),
  belt_since date,
  created_at timestamptz not null default now()
);
create index kids_parent_idx on public.kids(parent_id);

-- ---------- classes (weekly timetable) ----------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('swimming','jiujitsu')),
  age_group text not null default 'kids' check (age_group in ('kids','titans','adults')),
  location text not null check (location in ('kids_pool','olympic_pool','mat_1','mat_2')),
  weekday text not null check (weekday in ('sat','sun','mon','tue','wed','thu')),
  start_time time not null,
  capacity integer not null default 15,
  coach_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sport, age_group, location, weekday, start_time)
);

create table public.class_cancellations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  on_date date not null,
  reason text,
  compensation text not null default 'makeup' check (compensation in ('makeup','extend','none')),
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, on_date)
);

-- ---------- subscriptions ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kids(id) on delete cascade,
  swim_days text[] not null default '{}',
  bjj_days text[] not null default '{}',
  start_time time not null default '16:00',
  weeks smallint not null check (weeks in (1,2,4,12,24,48)),
  start_date date not null default current_date,
  end_date date not null,
  sessions_total smallint not null,
  sessions_used smallint not null default 0,
  base_price numeric(10,3) not null,
  discount_pct numeric(5,2) not null default 0,
  total numeric(10,3) not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','active','expired','cancel_requested','cancelled')),
  payment_method text check (payment_method in ('online','knet_machine','payment_link')),
  paid_at timestamptz,
  paid_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (cardinality(swim_days) + cardinality(bjj_days) between 2 and 6)
);
create index subscriptions_kid_idx on public.subscriptions(kid_id);

-- ---------- progress ----------
create table public.stripes (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kids(id) on delete cascade,
  belt text not null,
  awarded_on date not null,
  coach_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index stripes_kid_idx on public.stripes(kid_id);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kids(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index coach_notes_kid_idx on public.coach_notes(kid_id);

-- ---------- notifications (in-app inbox) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title_en text not null, body_en text not null,
  title_ar text not null, body_ar text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- foreign-key indexes
create index classes_coach_idx on public.classes(coach_id);
create index cancellations_by_idx on public.class_cancellations(cancelled_by);
create index subscriptions_paid_by_idx on public.subscriptions(paid_by);
create index stripes_coach_idx on public.stripes(coach_id);
create index coach_notes_author_idx on public.coach_notes(author_id);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.kids enable row level security;
alter table public.classes enable row level security;
alter table public.class_cancellations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripes enable row level security;
alter table public.coach_notes enable row level security;
alter table public.notifications enable row level security;

-- profiles: see yourself; coaches and staff see everyone. Users may only edit
-- name, phone and language (column grants below); role/is_active are staff-only.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_coach_or_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name, phone, preferred_language) on public.profiles to authenticated;

-- kids: parents manage their own; coaches and staff read all and update levels
create policy kids_select on public.kids for select to authenticated
  using (parent_id = (select auth.uid()) or public.is_coach_or_staff());
create policy kids_insert on public.kids for insert to authenticated
  with check (parent_id = (select auth.uid()) or public.is_staff());
create policy kids_update on public.kids for update to authenticated
  using (parent_id = (select auth.uid()) or public.is_coach_or_staff())
  with check (parent_id = (select auth.uid()) or public.is_coach_or_staff());
-- parents can't set levels/belts themselves
revoke update on public.kids from authenticated;
grant update (full_name, birth_date, photo_url, health_conditions, health_other, health_confirmed, emergency_phone) on public.kids to authenticated;

-- classes: everyone signed in can read; coaches and staff manage
create policy classes_select on public.classes for select to authenticated using (true);
create policy classes_insert on public.classes for insert to authenticated with check (public.is_coach_or_staff());
create policy classes_update on public.classes for update to authenticated using (public.is_coach_or_staff()) with check (public.is_coach_or_staff());
create policy classes_delete on public.classes for delete to authenticated using (public.is_coach_or_staff());

create policy cancellations_select on public.class_cancellations for select to authenticated using (true);

-- subscriptions: parents see and create (unpaid) for their own kids; staff see all
create policy subs_select on public.subscriptions for select to authenticated
  using (public.is_coach_or_staff()
         or exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = (select auth.uid())));
create policy subs_insert on public.subscriptions for insert to authenticated
  with check (status = 'pending_payment' and paid_at is null
         and (public.is_staff()
              or exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = (select auth.uid()))));

-- stripes and notes: family, coaches and staff read; writes go through functions
create policy stripes_select on public.stripes for select to authenticated
  using (public.is_coach_or_staff()
         or exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = (select auth.uid())));
create policy notes_select on public.coach_notes for select to authenticated
  using (public.is_coach_or_staff()
         or exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = (select auth.uid())));

-- notifications: only your own; you may mark them read
create policy notif_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notif_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------- functions (checked actions) ----------

-- internal: send a notification to a kid's parent
create or replace function public.notify_parent(p_kid uuid, p_kind text,
  p_title_en text, p_body_en text, p_title_ar text, p_body_ar text)
returns void language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  select k.parent_id, p_kind, p_title_en, p_body_en, p_title_ar, p_body_ar
  from public.kids k where k.id = p_kid;
$$;
revoke execute on function public.notify_parent(uuid,text,text,text,text,text) from public, anon, authenticated;

-- staff: mark a registration paid → active
create or replace function public.mark_paid(p_subscription uuid, p_method text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_kid uuid; v_name text;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  update public.subscriptions
     set status = 'active', payment_method = p_method, paid_at = now(), paid_by = auth.uid()
   where id = p_subscription and status = 'pending_payment'
   returning kid_id into v_kid;
  if v_kid is null then raise exception 'subscription not waiting for payment'; end if;
  select full_name into v_name from public.kids where id = v_kid;
  perform public.notify_parent(v_kid, 'payment_received',
    'Payment received', v_name || '''s subscription is now active.',
    'تم استلام الدفع', 'اشتراك ' || v_name || ' أصبح فعالاً.');
end $$;

-- coaches and staff: cancel one class on one date; notify every affected parent
create or replace function public.cancel_class(p_class uuid, p_date date, p_reason text default null,
  p_compensation text default 'makeup')
returns integer language plpgsql security definer set search_path = ''
as $$
declare c public.classes%rowtype; v_count integer; v_sport_en text; v_sport_ar text; v_time text;
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  if lower(to_char(p_date, 'dy')) <> c.weekday then raise exception 'date is not a % ', c.weekday; end if;

  insert into public.class_cancellations (class_id, on_date, reason, compensation, cancelled_by)
  values (p_class, p_date, p_reason, p_compensation, auth.uid());

  v_sport_en := case c.sport when 'swimming' then 'Swimming' else 'Jiu-jitsu' end;
  v_sport_ar := case c.sport when 'swimming' then 'السباحة' else 'الجوجيتسو' end;
  v_time := to_char(c.start_time, 'FMHH12:MI') || case when c.start_time < '12:00' then ' AM' else ' PM' end;

  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  select distinct k.parent_id, 'class_cancelled',
    v_sport_en || ' class cancelled',
    v_sport_en || ' on ' || to_char(p_date, 'Dy DD Mon') || ' at ' || v_time || ' is cancelled. '
      || case p_compensation when 'makeup' then 'You can book a make-up class.'
                             when 'extend' then 'The subscription end date moves forward by one class.'
                             else '' end,
    'تم إلغاء حصة ' || v_sport_ar,
    'تم إلغاء حصة ' || v_sport_ar || ' يوم ' || to_char(p_date, 'DD/MM') || ' الساعة ' || v_time || '.'
      || case p_compensation when 'makeup' then ' يمكنك حجز حصة تعويضية.'
                             when 'extend' then ' سيتم تمديد الاشتراك حصة واحدة.'
                             else '' end
  from public.subscriptions s join public.kids k on k.id = s.kid_id
  where s.status = 'active' and s.start_time = c.start_time
    and p_date between s.start_date and s.end_date
    and ((c.sport = 'swimming' and c.weekday = any (s.swim_days))
      or (c.sport = 'jiujitsu' and c.weekday = any (s.bjj_days)));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- coaches and staff: add a stripe with its date; notify the parent
create or replace function public.add_stripe(p_kid uuid, p_date date default current_date)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_belt text; v_name text; v_count integer;
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  select belt, full_name into v_belt, v_name from public.kids where id = p_kid;
  if v_belt is null then raise exception 'kid has no belt yet'; end if;
  select count(*) into v_count from public.stripes where kid_id = p_kid and belt = v_belt;
  if v_count >= 4 then raise exception 'already 4 stripes: award the next belt'; end if;
  insert into public.stripes (kid_id, belt, awarded_on, coach_id) values (p_kid, v_belt, p_date, auth.uid());
  perform public.notify_parent(p_kid, 'stripe_awarded',
    'New stripe!', v_name || ' earned stripe ' || (v_count + 1) || ' on ' || to_char(p_date, 'DD Mon YYYY') || '.',
    'شريط جديد!', v_name || ' حصل على الشريط ' || (v_count + 1) || ' بتاريخ ' || to_char(p_date, 'DD/MM/YYYY') || '.');
  return v_count + 1;
end $$;

-- coaches and staff: set swimming level or belt; notify the parent
create or replace function public.set_level(p_kid uuid, p_swim_level smallint default null, p_belt text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_name text;
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  select full_name into v_name from public.kids where id = p_kid;
  if p_swim_level is not null then
    update public.kids set swim_level = p_swim_level, swim_level_since = current_date where id = p_kid;
    perform public.notify_parent(p_kid, 'level_changed',
      'New swimming level', v_name || ' moved to Level ' || p_swim_level || '.',
      'مستوى سباحة جديد', v_name || ' انتقل إلى المستوى ' || p_swim_level || '.');
  end if;
  if p_belt is not null then
    update public.kids set belt = p_belt, belt_since = current_date where id = p_kid;
    perform public.notify_parent(p_kid, 'belt_changed',
      'New belt!', v_name || ' was promoted to a new belt.',
      'حزام جديد!', v_name || ' حصل على حزام جديد.');
  end if;
end $$;

-- coaches and staff: write a note the parent can see
create or replace function public.add_coach_note(p_kid uuid, p_body text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_name text;
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  insert into public.coach_notes (kid_id, author_id, body) values (p_kid, auth.uid(), p_body);
  select full_name into v_name from public.kids where id = p_kid;
  perform public.notify_parent(p_kid, 'coach_note',
    'Note from the coach', 'New note about ' || v_name || '.',
    'ملاحظة من المدرب', 'ملاحظة جديدة عن ' || v_name || '.');
end $$;

revoke execute on function public.mark_paid(uuid,text), public.cancel_class(uuid,date,text,text),
  public.add_stripe(uuid,date), public.set_level(uuid,smallint,text), public.add_coach_note(uuid,text) from public, anon;
grant execute on function public.mark_paid(uuid,text), public.cancel_class(uuid,date,text,text),
  public.add_stripe(uuid,date), public.set_level(uuid,smallint,text), public.add_coach_note(uuid,text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
