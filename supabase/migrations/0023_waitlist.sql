-- Task 14j: class capacity and waitlist.
--  * A class is full when the members booked into it (current registrations: paid or waiting for payment,
--    overlapping the dates) reach its capacity.
--  * The app can't register into a full class: the family joins the waitlist (first come, first served)
--    and the app suggests other days / times that have space.
--  * When a place opens, reception offers it to the first in line: the family gets a message and has
--    48 hours to register (the offer lets them into the full class). Then it can go to the next person.
--  * Reception, managers and the owner can register someone over the limit at the desk.
--  * The owner and managers set each class's capacity.

-- is this registration booked into this class (same sport, day, time and age group)?
create or replace function public.sub_in_class(s public.subscriptions, c public.classes)
returns boolean language sql stable security definer set search_path = ''
as $$
  select s.kind = 'classes'
    and c.weekday = any (case c.sport when 'swimming' then s.swim_days else s.bjj_days end)
    and public.sub_time(s, c.sport, c.weekday) = c.start_time
    and exists (
      select 1 from public.kids k where k.id = s.kid_id
        and (case when k.is_self or extract(year from age(k.birth_date)) >= 16
                    or (c.sport = 'jiujitsu' and extract(year from age(k.birth_date)) >= 11)
                  then 'adults' else 'kids' end) = c.age_group)
$$;
revoke execute on function public.sub_in_class(public.subscriptions, public.classes) from public, anon, authenticated;

-- booked members per class for a date range (counts only; anyone signed in may see them)
create or replace function public.class_spaces(p_from date, p_to date)
returns table (class_id uuid, booked int, capacity int)
language sql stable security definer set search_path = ''
as $$
  select c.id, (
      select count(distinct s.kid_id)::int from public.subscriptions s
      where s.status in ('active','pending_payment') and s.start_date <= p_to and s.end_date >= p_from
        and public.sub_in_class(s, c)
    ), c.capacity
  from public.classes c
  where c.is_active and not c.is_free
$$;
revoke execute on function public.class_spaces(date, date) from public, anon;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kids(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','offered','registered','left','expired')),
  offered_at timestamptz,
  offer_expires timestamptz,
  offered_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index waitlist_one_active on public.waitlist(kid_id, class_id) where status in ('waiting','offered');
create index waitlist_class_idx on public.waitlist(class_id, created_at);
create index waitlist_kid_idx on public.waitlist(kid_id);
create index waitlist_parent_idx on public.waitlist(parent_id);
create index waitlist_offered_by_idx on public.waitlist(offered_by);
alter table public.waitlist enable row level security;
create policy waitlist_select on public.waitlist for select to authenticated
  using (parent_id = (select auth.uid()) or public.is_coach_or_staff());
-- writes only through the functions below

-- English / Arabic description of a class for messages: "Swimming, Sat 4:00 PM"
create or replace function public.class_words(c public.classes, p_ar boolean)
returns text language sql immutable set search_path = ''
as $$
  select case when p_ar then
      (case c.sport when 'swimming' then 'السباحة' else 'الجوجيتسو' end) || '، ' ||
      (case c.weekday when 'sat' then 'السبت' when 'sun' then 'الأحد' when 'mon' then 'الاثنين' when 'tue' then 'الثلاثاء' when 'wed' then 'الأربعاء' else 'الخميس' end) || ' ' ||
      translate(to_char(c.start_time, 'FMHH12:MI'), '0123456789', '٠١٢٣٤٥٦٧٨٩') || case when c.start_time < '12:00' then ' ص' else ' م' end
    else
      coalesce(c.label, case c.sport when 'swimming' then 'Swimming' else 'Jiu-jitsu' end) || ', ' || initcap(c.weekday) || ' ' ||
      to_char(c.start_time, 'FMHH12:MI') || case when c.start_time < '12:00' then ' AM' else ' PM' end
    end
$$;

create or replace function public.join_waitlist(p_kid uuid, p_class uuid)
returns int language plpgsql security definer set search_path = ''
as $$
declare v_parent uuid; v_pos int;
begin
  select parent_id into v_parent from public.kids where id = p_kid;
  if v_parent is null or (v_parent <> auth.uid() and not public.is_staff()) then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.classes where id = p_class and is_active) then raise exception 'not_found'; end if;
  insert into public.waitlist (kid_id, class_id, parent_id) values (p_kid, p_class, v_parent)
  on conflict do nothing;
  select count(*)::int into v_pos from public.waitlist w
  where w.class_id = p_class and w.status in ('waiting','offered')
    and w.created_at <= (select created_at from public.waitlist where kid_id = p_kid and class_id = p_class and status in ('waiting','offered'));
  return v_pos;
end $$;
revoke execute on function public.join_waitlist(uuid, uuid) from public, anon;

create or replace function public.leave_waitlist(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.waitlist set status = 'left'
  where id = p_id and status in ('waiting','offered') and (parent_id = auth.uid() or public.can_approve());
  if not found then raise exception 'not_found'; end if;
end $$;
revoke execute on function public.leave_waitlist(uuid) from public, anon;

-- reception offers a place: 48 hours to register
create or replace function public.offer_waitlist(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare w public.waitlist%rowtype; c public.classes%rowtype; v_name text; v_until timestamptz := now() + interval '48 hours';
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
  select * into w from public.waitlist where id = p_id for update;
  if w.id is null or w.status <> 'waiting' then raise exception 'not_waiting'; end if;
  select * into c from public.classes where id = w.class_id;
  select full_name into v_name from public.kids where id = w.kid_id;
  -- offers nobody used in time go back to "expired"
  update public.waitlist set status = 'expired' where class_id = w.class_id and status = 'offered' and offer_expires < now();
  update public.waitlist set status = 'offered', offered_at = now(), offer_expires = v_until, offered_by = auth.uid() where id = p_id;
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  values (w.parent_id, 'waitlist_offer', 'A place opened for ' || v_name,
    'A place opened in ' || public.class_words(c, false) || ' for ' || v_name || '. Register in the app by ' ||
      to_char(v_until + interval '3 hours', 'Dy DD Mon, FMHH12:MI AM') || ' to keep it.',
    'توفر مكان لـ ' || v_name,
    'توفر مكان في ' || public.class_words(c, true) || ' لـ ' || v_name || '. سجّل في التطبيق خلال ٤٨ ساعة للاحتفاظ به.');
end $$;
revoke execute on function public.offer_waitlist(uuid) from public, anon;

-- class capacity (owner and managers)
create or replace function public.set_class_capacity(p_class uuid, p_capacity int)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if public.current_app_role() not in ('super_admin','manager') then raise exception 'not allowed'; end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 200 then raise exception 'bad_capacity'; end if;
  update public.classes set capacity = p_capacity where id = p_class;
end $$;
revoke execute on function public.set_class_capacity(uuid, int) from public, anon;
