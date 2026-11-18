-- Task 14a: door check-in. Reception taps a member in → they're marked present and one
-- session is used from the registration that covers that class. Undo puts it back.
-- Members without a current registration (expired / never paid) can still be let in:
-- they're marked present with no registration, so reception can follow up.

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kids(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  on_date date not null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  checked_in_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kid_id, class_id, on_date)
);
create index attendance_class_date_idx on public.attendance(class_id, on_date);
create index attendance_kid_idx on public.attendance(kid_id);
create index attendance_subscription_idx on public.attendance(subscription_id);
create index attendance_checked_in_by_idx on public.attendance(checked_in_by);
alter table public.attendance enable row level security;

-- staff and coaches see attendance; families see their own members'
create policy attendance_select on public.attendance for select to authenticated
  using (public.is_coach_or_staff()
         or exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = (select auth.uid())));
-- writes only through check_in() / undo_check_in()

create or replace function public.can_check_in()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('super_admin','manager','receptionist'), false) $$;
revoke execute on function public.can_check_in() from public, anon;

create or replace function public.check_in(p_kid uuid, p_class uuid, p_date date)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare c public.classes%rowtype; v_sub uuid; v_status text; v_id uuid;
begin
  if not public.can_check_in() then raise exception 'not allowed'; end if;
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;

  -- the registration that covers this class on this date (active first, then waiting for payment)
  select s.id, s.status into v_sub, v_status
  from public.subscriptions s
  where s.kid_id = p_kid and s.kind = 'classes' and s.status in ('active','pending_payment')
    and p_date between s.start_date and s.end_date
    and ((c.sport = 'swimming' and c.weekday = any (s.swim_days)) or (c.sport = 'jiujitsu' and c.weekday = any (s.bjj_days)))
  order by (s.status = 'active') desc, s.start_date
  limit 1;

  insert into public.attendance (kid_id, class_id, on_date, subscription_id, checked_in_by)
  values (p_kid, p_class, p_date, v_sub, auth.uid())
  on conflict (kid_id, class_id, on_date) do nothing
  returning id into v_id;

  if v_id is not null and v_sub is not null then
    update public.subscriptions set sessions_used = least(sessions_used + 1, sessions_total) where id = v_sub;
  end if;
  return jsonb_build_object('attendance_id', v_id, 'subscription_id', v_sub, 'status', coalesce(v_status, 'none'));
end $$;
revoke execute on function public.check_in(uuid, uuid, date) from public, anon;

create or replace function public.undo_check_in(p_kid uuid, p_class uuid, p_date date)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_sub uuid; v_id uuid;
begin
  if not public.can_check_in() then raise exception 'not allowed'; end if;
  delete from public.attendance where kid_id = p_kid and class_id = p_class and on_date = p_date
  returning id, subscription_id into v_id, v_sub;
  if v_id is not null and v_sub is not null then
    update public.subscriptions set sessions_used = greatest(sessions_used - 1, 0) where id = v_sub;
  end if;
end $$;
revoke execute on function public.undo_check_in(uuid, uuid, date) from public, anon;
