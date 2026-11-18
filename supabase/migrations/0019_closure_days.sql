-- Task 14e: closure days (National Day, Eid, …).
--  * Owner, manager or reception close a date or a range (not Fridays: always closed).
--  * Every class a member misses is added at the end: the end date moves to cover that many more
--    of the member's own class days (skipping other closed days). Open pool: 1 extra day per closed date.
--  * Registrations made later that cover a closed day are extended the same way (trigger).
--  * Undo for days not yet passed: end dates move back, families are told the complex is open.

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  on_date date not null unique,
  reason text check (length(reason) <= 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index closures_created_by_idx on public.closures(created_by);
alter table public.closures enable row level security;
create policy closures_select on public.closures for select to authenticated using (true);
-- writes only through close_days() / reopen_day()

-- what each closure added to each registration, so it can be undone exactly
create table public.closure_extensions (
  closure_id uuid not null references public.closures(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  old_end date not null,
  new_end date not null,
  primary key (closure_id, subscription_id)
);
create index closure_extensions_subscription_idx on public.closure_extensions(subscription_id);
alter table public.closure_extensions enable row level security;
create policy closure_extensions_select on public.closure_extensions for select to authenticated using (public.is_staff());

-- classes a registration has on one date (swimming + jiu-jitsu the same day = 2)
create or replace function public.sessions_on(s public.subscriptions, d date)
returns int language sql stable set search_path = ''
as $$
  select case when s.kind <> 'classes' or d < s.start_date or d > s.end_date
                or (s.pause_start is not null and d between s.pause_start and s.pause_end) then 0
         else (case when lower(to_char(d, 'dy')) = any (s.swim_days) then 1 else 0 end)
            + (case when lower(to_char(d, 'dy')) = any (s.bjj_days) then 1 else 0 end) end
$$;

-- the end date after adding n of this registration's classes (skipping closed days)
create or replace function public.end_after_classes(s public.subscriptions, n int)
returns date language plpgsql stable set search_path = ''
as $$
declare d date := s.end_date; v_left int := n; v_day text;
begin
  while v_left > 0 loop
    d := d + 1;
    v_day := lower(to_char(d, 'dy'));
    if not exists (select 1 from public.closures where on_date = d) then
      v_left := v_left - ((case when v_day = any (s.swim_days) then 1 else 0 end) + (case when v_day = any (s.bjj_days) then 1 else 0 end));
    end if;
    if d > s.end_date + 400 then exit; end if; -- safety
  end loop;
  return d;
end $$;

-- extend one registration for one closure; a following renewal of the same member is extended instead
-- (so the two don't overlap). Returns false if it couldn't be extended.
create or replace function public.extend_for_closure(p_closure uuid, p_sub uuid, p_date date)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype; t public.subscriptions%rowtype; n int; v_new date;
begin
  select * into s from public.subscriptions where id = p_sub;
  if s.kind = 'open_pool' then
    if exists (select 1 from public.open_pool_closures where on_date = p_date) then return true; end if; -- already given
    t := s; v_new := s.end_date + 1;
  else
    n := public.sessions_on(s, p_date);
    if n = 0 then return true; end if;
    -- a later registration of this member for the same days takes the extra classes
    select * into t from public.subscriptions o
    where o.kid_id = s.kid_id and o.kind = 'classes' and o.id <> s.id and o.status in ('active','pending_payment')
      and o.start_date > s.end_date and (o.swim_days && (s.swim_days || s.bjj_days) or o.bjj_days && (s.swim_days || s.bjj_days))
    order by o.end_date desc limit 1;
    if t.id is null then t := s; end if;
    v_new := public.end_after_classes(t, n);
  end if;
  begin
    update public.subscriptions set end_date = v_new where id = t.id;
  exception when others then
    return false;
  end;
  insert into public.closure_extensions (closure_id, subscription_id, old_end, new_end) values (p_closure, t.id, t.end_date, v_new)
  on conflict (closure_id, subscription_id) do update set new_end = excluded.new_end; -- keeps the first old_end
  return true;
end $$;
revoke execute on function public.extend_for_closure(uuid, uuid, date) from public, anon, authenticated;

create or replace function public.close_days(p_from date, p_to date, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare d date; v_closure uuid; v_days int := 0; v_extended int := 0; v_failed int := 0; s record;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), ''); v_when_en text; v_when_ar text;
  v_parents uuid[] := '{}';
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
  if p_to is null then p_to := p_from; end if;
  if p_from < current_date or p_to < p_from then raise exception 'bad_dates'; end if;
  if p_to - p_from > 30 then raise exception 'too_long'; end if;

  d := p_from;
  while d <= p_to loop
    if extract(dow from d) <> 5 and not exists (select 1 from public.closures where on_date = d) then
      insert into public.closures (on_date, reason, created_by) values (d, v_reason, auth.uid()) returning id into v_closure;
      v_days := v_days + 1;
      for s in
        select x.id, k.parent_id from public.subscriptions x join public.kids k on k.id = x.kid_id
        where x.status in ('active','pending_payment') and d between x.start_date and x.end_date
          and (x.kind = 'open_pool' or public.sessions_on(x, d) > 0)
        order by x.start_date
      loop
        if public.extend_for_closure(v_closure, s.id, d) then v_extended := v_extended + 1; else v_failed := v_failed + 1; end if;
        if not s.parent_id = any (v_parents) then v_parents := v_parents || s.parent_id; end if;
      end loop;
    end if;
    d := d + 1;
  end loop;
  if v_days = 0 then raise exception 'nothing_to_close'; end if;

  v_when_en := case when p_from = p_to then to_char(p_from, 'Dy DD Mon') else to_char(p_from, 'DD Mon') || ' – ' || to_char(p_to, 'DD Mon') end;
  v_when_ar := case when p_from = p_to then public.ar_date(p_from) else public.ar_date(p_from) || ' – ' || public.ar_date(p_to) end;
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  select unnest(v_parents), 'complex_closed', 'The complex is closed',
    'LOSE | GAIN Complex is closed on ' || v_when_en || coalesce(' (' || v_reason || ')', '') || '. Missed classes are added to the end of the registration: check the app for the new end date.',
    'المجمع مغلق',
    'مجمع LOSE | GAIN مغلق يوم ' || v_when_ar || coalesce(' (' || v_reason || ')', '') || '. تمت إضافة الحصص الفائتة إلى نهاية الاشتراك، راجع التطبيق لمعرفة تاريخ الانتهاء الجديد.';
  return jsonb_build_object('days', v_days, 'extended', v_extended, 'failed', v_failed, 'families', cardinality(v_parents));
end $$;
revoke execute on function public.close_days(date, date, text) from public, anon;

create or replace function public.reopen_day(p_date date)
returns integer language plpgsql security definer set search_path = ''
as $$
declare c public.closures%rowtype; e record; v_parents uuid[];
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
  select * into c from public.closures where on_date = p_date;
  if c.id is null then raise exception 'not_closed'; end if;
  if p_date < current_date then raise exception 'past'; end if;

  select coalesce(array_agg(distinct k.parent_id), '{}') into v_parents
  from public.closure_extensions x join public.subscriptions s on s.id = x.subscription_id join public.kids k on k.id = s.kid_id
  where x.closure_id = c.id;

  for e in select * from public.closure_extensions where closure_id = c.id loop
    update public.subscriptions
      set end_date = case when end_date = e.new_end then e.old_end else end_date - (e.new_end - e.old_end) end
      where id = e.subscription_id;
  end loop;
  delete from public.closures where id = c.id;

  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  select unnest(v_parents), 'complex_open', 'The complex is open after all',
    'LOSE | GAIN Complex will be open on ' || to_char(p_date, 'Dy DD Mon') || ' and classes run as usual. The end date of the registration is back to what it was.',
    'المجمع مفتوح',
    'مجمع LOSE | GAIN سيكون مفتوحاً يوم ' || public.ar_date(p_date) || ' والحصص كالمعتاد. عاد تاريخ انتهاء الاشتراك كما كان.';
  return cardinality(v_parents);
end $$;
revoke execute on function public.reopen_day(date) from public, anon;

-- registrations made after a closure was announced: add the classes they'd miss on closed days
create or replace function public.subscriptions_extend_for_closures()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare c record;
begin
  for c in select id, on_date from public.closures where on_date between new.start_date and new.end_date order by on_date loop
    perform public.extend_for_closure(c.id, new.id, c.on_date);
  end loop;
  return null;
end $$;
revoke execute on function public.subscriptions_extend_for_closures() from public, anon, authenticated;

create trigger subscriptions_extend_for_closures
  after insert on public.subscriptions
  for each row execute function public.subscriptions_extend_for_closures();

-- open pool: no second extra day if the whole complex is already closed that day
create or replace function public.cancel_open_pool(p_date date, p_session text, p_reason text default null)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_first boolean; v_count integer; v_when_en text; v_when_ar text; v_date_ar text;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if p_session not in ('morning','evening','day') then raise exception 'bad session'; end if;
  if extract(dow from p_date) = 5 then raise exception 'the complex is closed on Fridays'; end if;
  -- one extra day per closed date, even if both sessions get cancelled separately
  v_first := not exists (select 1 from public.open_pool_closures where on_date = p_date)
         and not exists (select 1 from public.closures where on_date = p_date);
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
