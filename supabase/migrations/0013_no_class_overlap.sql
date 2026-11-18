-- A member can't be booked into two classes at the same day and time.
-- Checked on every save of a current registration (app, assistant, staff), so nothing can slip through.

-- every (day, class time) of a registration
create or replace function public.sub_slots(s public.subscriptions)
returns table (weekday text, start_time time)
language sql immutable set search_path = ''
as $$
  select d, s.start_time from unnest(s.swim_days) d
  union all
  select d, public.sub_time(s, 'jiujitsu', d) from unnest(s.bjj_days) d
$$;

create or replace function public.subscriptions_no_overlap()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_day text; v_time time;
begin
  if new.kind <> 'classes' or new.status not in ('active','pending_payment') then return new; end if;

  -- inside this registration (swimming and jiu-jitsu on the same day at the same time)
  select a.weekday, a.start_time into v_day, v_time
  from public.sub_slots(new) a group by a.weekday, a.start_time having count(*) > 1 limit 1;
  if v_day is not null then
    raise exception 'class_overlap %', v_day || ' ' || to_char(v_time, 'HH24:MI') using errcode = 'P0001';
  end if;

  -- against the member's other current registrations with overlapping dates
  select a.weekday, a.start_time into v_day, v_time
  from public.subscriptions o
  cross join lateral public.sub_slots(o) a
  join public.sub_slots(new) b on a.weekday = b.weekday and a.start_time = b.start_time
  where o.kid_id = new.kid_id and o.id <> new.id and o.kind = 'classes'
    and o.status in ('active','pending_payment')
    and o.start_date <= new.end_date and new.start_date <= o.end_date
  limit 1;
  if v_day is not null then
    raise exception 'class_overlap %', v_day || ' ' || to_char(v_time, 'HH24:MI') using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.subscriptions_no_overlap() from public, anon, authenticated;

create trigger subscriptions_no_overlap
  before insert or update of kid_id, kind, swim_days, bjj_days, start_time, bjj_times, start_date, end_date, status
  on public.subscriptions
  for each row execute function public.subscriptions_no_overlap();
