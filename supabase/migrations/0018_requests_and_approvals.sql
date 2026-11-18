-- Task 14d: approvals.
--  * Pause up to 1 week: the guardian does it themselves, once per registration. It starts at once
--    (from tomorrow or later) and the end date moves by the paused days, so no sessions are lost.
--  * Longer pause for an injury, change of days/time, and cancelling: the guardian sends a request,
--    reception (owner / manager / receptionist) approves or rejects it from the dashboard.
--  * Change of days/time: after approving, reception changes the days by hand on the member page
--    (same number of days, so the price doesn't change).
--  * Refunds: when a paid registration is cancelled, the owner or accountant records the amount and how
--    it was returned (KNET / bank transfer / cash). The money itself is returned outside the app.

alter table public.subscriptions
  add column pause_start date,
  add column pause_end date,
  add constraint subscriptions_pause_check check ((pause_start is null) = (pause_end is null) and (pause_end is null or pause_end >= pause_start));

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pause','injury_pause','switch','cancel')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  pause_start date,
  pause_days smallint check (pause_days between 1 and 56),
  note text check (length(note) <= 1000),
  reply text check (length(reply) <= 1000),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  refund_status text check (refund_status in ('due','refunded','none')),
  refund_amount numeric(10,3) check (refund_amount >= 0),
  refund_method text check (refund_method in ('knet','bank_transfer','cash')),
  refunded_by uuid references public.profiles(id) on delete set null,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);
create index requests_subscription_idx on public.requests(subscription_id);
create index requests_parent_idx on public.requests(parent_id);
create index requests_decided_by_idx on public.requests(decided_by);
create index requests_refunded_by_idx on public.requests(refunded_by);
create index requests_pending_idx on public.requests(created_at) where status = 'pending';
alter table public.requests enable row level security;

-- families see their own; staff and coaches see all (coaches see the injury reason)
create policy requests_select on public.requests for select to authenticated
  using (parent_id = (select auth.uid()) or public.is_coach_or_staff());
-- writes only through the functions below

create or replace function public.can_approve()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('super_admin','manager','receptionist'), false) $$;
revoke execute on function public.can_approve() from public, anon;

create or replace function public.can_refund()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('super_admin','accountant'), false) $$;
revoke execute on function public.can_refund() from public, anon;

-- Arabic digits for dates in notifications
create or replace function public.ar_date(d date)
returns text language sql immutable set search_path = ''
as $$ select translate(to_char(d, 'DD/MM'), '0123456789', '٠١٢٣٤٥٦٧٨٩') $$;

-- the member's registration, checked to belong to the signed-in guardian
create or replace function public.my_sub(p_sub uuid)
returns public.subscriptions language plpgsql stable security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype; v_parent uuid;
begin
  select * into s from public.subscriptions where id = p_sub;
  select parent_id into v_parent from public.kids where id = s.kid_id;
  if s.id is null or v_parent is distinct from auth.uid() then raise exception 'not allowed'; end if;
  return s;
end $$;
revoke execute on function public.my_sub(uuid) from public, anon;

-- ---------- self-service pause: 1–7 days, once per registration ----------
create or replace function public.pause_registration(p_sub uuid, p_start date, p_days int)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype;
begin
  s := public.my_sub(p_sub);
  if s.kind <> 'classes' or s.status <> 'active' then raise exception 'not_active'; end if;
  if p_days is null or p_days < 1 or p_days > 7 then raise exception 'bad_days'; end if;
  if exists (select 1 from public.requests where subscription_id = p_sub and kind = 'pause') then raise exception 'pause_used'; end if;
  if s.pause_end is not null and s.pause_end >= current_date then raise exception 'already_paused'; end if;
  if p_start < current_date + 1 or p_start < s.start_date or p_start > s.end_date then raise exception 'bad_start'; end if;

  update public.subscriptions
    set pause_start = p_start, pause_end = p_start + p_days - 1, end_date = end_date + p_days
    where id = p_sub;
  insert into public.requests (subscription_id, parent_id, kind, status, pause_start, pause_days, decided_at)
  values (p_sub, auth.uid(), 'pause', 'approved', p_start, p_days, now());
  return jsonb_build_object('pause_end', p_start + p_days - 1, 'end_date', s.end_date + p_days);
end $$;
revoke execute on function public.pause_registration(uuid, date, int) from public, anon;

-- ---------- requests that need reception ----------
create or replace function public.send_request(p_sub uuid, p_kind text, p_note text default null, p_start date default null, p_days int default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype; v_note text := nullif(btrim(coalesce(p_note, '')), ''); v_id uuid;
begin
  s := public.my_sub(p_sub);
  if p_kind not in ('injury_pause','switch','cancel') then raise exception 'bad_kind'; end if;
  if s.status not in ('active','pending_payment') or (p_kind <> 'cancel' and s.status <> 'active') then raise exception 'not_active'; end if;
  if p_kind = 'switch' and s.kind <> 'classes' then raise exception 'bad_kind'; end if;
  if p_kind in ('injury_pause','switch') and v_note is null then raise exception 'note_required'; end if;
  if p_kind = 'injury_pause' then
    if p_days is null or p_days < 7 or p_days > 56 then raise exception 'bad_days'; end if;
    if p_start is null or p_start < current_date or p_start > s.end_date then raise exception 'bad_start'; end if;
  end if;
  if exists (select 1 from public.requests where subscription_id = p_sub and kind = p_kind and status = 'pending') then
    raise exception 'already_requested';
  end if;
  insert into public.requests (subscription_id, parent_id, kind, note, pause_start, pause_days)
  values (p_sub, auth.uid(), p_kind, v_note,
          case when p_kind = 'injury_pause' then p_start end,
          case when p_kind = 'injury_pause' then p_days end)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.send_request(uuid, text, text, date, int) from public, anon;

-- the guardian can take back a request reception hasn't answered yet
create or replace function public.withdraw_request(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.requests where id = p_id and parent_id = auth.uid() and status = 'pending';
  if not found then raise exception 'not_found'; end if;
end $$;
revoke execute on function public.withdraw_request(uuid) from public, anon;

-- ---------- reception decides ----------
create or replace function public.decide_request(p_id uuid, p_approve boolean, p_reply text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.requests%rowtype; s public.subscriptions%rowtype; v_member text; v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  t_en text; b_en text; t_ar text; b_ar text;
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
  select * into r from public.requests where id = p_id for update;
  if r.id is null or r.status <> 'pending' then raise exception 'not_pending'; end if;
  select * into s from public.subscriptions where id = r.subscription_id for update;
  select full_name into v_member from public.kids where id = s.kid_id;

  if p_approve then
    if r.kind = 'injury_pause' then
      if s.status <> 'active' then raise exception 'not_active'; end if;
      if s.pause_end is not null and s.pause_end >= current_date then raise exception 'already_paused'; end if;
      update public.subscriptions
        set pause_start = greatest(r.pause_start, current_date), pause_end = greatest(r.pause_start, current_date) + r.pause_days - 1,
            end_date = end_date + r.pause_days
        where id = s.id;
      t_en := 'Pause approved'; t_ar := 'تمت الموافقة على الإيقاف';
      b_en := v_member || '''s registration is paused for ' || r.pause_days || ' days from ' || to_char(greatest(r.pause_start, current_date), 'DD Mon') || '. It now ends on ' || to_char(s.end_date + r.pause_days, 'DD Mon') || '.';
      b_ar := 'تم إيقاف اشتراك ' || v_member || ' لمدة ' || r.pause_days || ' يومًا من ' || public.ar_date(greatest(r.pause_start, current_date)) || '، وينتهي الآن في ' || public.ar_date(s.end_date + r.pause_days) || '.';
    elsif r.kind = 'switch' then
      t_en := 'Change approved'; t_ar := 'تمت الموافقة على التغيير';
      b_en := 'Reception will update ' || v_member || '''s days and times. You''ll see them in the app.';
      b_ar := 'سيقوم الاستقبال بتحديث أيام وأوقات ' || v_member || '، وستظهر في التطبيق.';
    else
      update public.subscriptions set status = 'cancelled' where id = s.id;
      update public.requests set refund_status = case when s.paid_at is not null then 'due' else 'none' end where id = r.id;
      t_en := 'Registration cancelled'; t_ar := 'تم إلغاء الاشتراك';
      b_en := v_member || '''s registration is cancelled.' || case when s.paid_at is not null then ' Any refund will be arranged by the complex.' else '' end;
      b_ar := 'تم إلغاء اشتراك ' || v_member || '.' || case when s.paid_at is not null then ' سيتواصل معكم المجمع بخصوص أي استرداد.' else '' end;
    end if;
  else
    t_en := 'Request not approved'; t_ar := 'لم تتم الموافقة على الطلب';
    b_en := 'Reception could not approve your request for ' || v_member || '.';
    b_ar := 'تعذّر على الاستقبال الموافقة على طلبك لـ ' || v_member || '.';
  end if;

  update public.requests set status = case when p_approve then 'approved' else 'rejected' end, reply = v_reply,
    decided_by = auth.uid(), decided_at = now()
    where id = r.id;
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  values (r.parent_id, 'request_' || case when p_approve then 'approved' else 'rejected' end, t_en,
          b_en || coalesce(' ' || v_reply, ''), t_ar, b_ar || coalesce(' ' || v_reply, ''));
end $$;
revoke execute on function public.decide_request(uuid, boolean, text) from public, anon;

-- ---------- refunds: owner or accountant ----------
create or replace function public.record_refund(p_id uuid, p_amount numeric, p_method text)
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.requests%rowtype; v_total numeric; v_member text;
begin
  if not public.can_refund() then raise exception 'not allowed'; end if;
  select * into r from public.requests where id = p_id for update;
  if r.id is null or r.refund_status is distinct from 'due' then raise exception 'no_refund_due'; end if;
  select s.total, k.full_name into v_total, v_member from public.subscriptions s join public.kids k on k.id = s.kid_id where s.id = r.subscription_id;
  if p_amount is null or p_amount < 0 or p_amount > v_total then raise exception 'bad_amount'; end if;
  if p_amount > 0 and p_method not in ('knet','bank_transfer','cash') then raise exception 'bad_method'; end if;

  update public.requests set refund_status = 'refunded', refund_amount = p_amount,
    refund_method = case when p_amount > 0 then p_method end, refunded_by = auth.uid(), refunded_at = now()
    where id = p_id;
  if p_amount > 0 then
    insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
    values (r.parent_id, 'refund', 'Refund sent',
      to_char(p_amount, 'FM990.000') || ' KD has been refunded for ' || v_member || '''s registration.',
      'تم الاسترداد', 'تم استرداد ' || to_char(p_amount, 'FM990.000') || ' د.ك لاشتراك ' || v_member || '.');
  end if;
end $$;
revoke execute on function public.record_refund(uuid, numeric, text) from public, anon;

-- ---------- reception changes the days/time of a registration (same number of days → same price) ----------
create or replace function public.change_registration_days(p_sub uuid, p_swim text[], p_bjj text[], p_swim_time time default '16:00')
returns void language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype; k public.kids%rowtype; v_age int; v_member text; v_times jsonb := '{}'::jsonb;
  d text; v_t time; v_old time; v_swim_time time; v_start time;
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
  select * into s from public.subscriptions where id = p_sub for update;
  if s.id is null or s.kind <> 'classes' or s.status not in ('active','pending_payment') then raise exception 'not_active'; end if;
  p_swim := coalesce(p_swim, '{}'); p_bjj := coalesce(p_bjj, '{}');
  if cardinality(p_swim) <> cardinality(s.swim_days) or cardinality(p_bjj) <> cardinality(s.bjj_days) then raise exception 'same_count'; end if;
  if exists (select 1 from unnest(p_swim || p_bjj) x where x not in ('sat','sun','mon','tue','wed','thu')) then raise exception 'bad_day'; end if;
  if (select count(distinct x) from unnest(p_swim) x) <> cardinality(p_swim) or (select count(distinct x) from unnest(p_bjj) x) <> cardinality(p_bjj) then
    raise exception 'bad_day';
  end if;

  select * into k from public.kids where id = s.kid_id;
  v_age := extract(year from age(current_date, k.birth_date))::int;
  v_member := case when k.is_self or v_age >= 16 then 'adult' when v_age >= 11 then 'titan' else 'kid' end;
  v_swim_time := case when v_member = 'adult' then '16:00' when p_swim_time = '17:00' then '17:00' else '16:00' end;

  foreach d in array p_bjj loop
    if v_member = 'kid' then
      select c.start_time into v_t from public.classes c
      where c.sport = 'jiujitsu' and c.is_active and not c.is_free and c.audience = 'all' and c.age_group = 'kids'
        and c.weekday = d and v_age between coalesce(c.min_age, 0) and coalesce(c.max_age, 200)
      limit 1;
      v_t := coalesce(v_t, v_swim_time);
    else
      -- women's 7:30 PM class only on Sun / Tue / Thu; otherwise the 6 PM class
      v_old := public.sub_time(s, 'jiujitsu', s.bjj_days[1]);
      v_t := case when v_old = '19:30' and d in ('sun','tue','thu') then '19:30'::time else '18:00'::time end;
    end if;
    v_times := v_times || jsonb_build_object(d, to_char(v_t, 'HH24:MI'));
  end loop;

  v_start := case when cardinality(p_swim) > 0 then v_swim_time else (v_times ->> p_bjj[1])::time end;
  update public.subscriptions
    set swim_days = p_swim, bjj_days = p_bjj, start_time = v_start,
        bjj_times = case when cardinality(p_bjj) > 0 then v_times end
    where id = p_sub;

  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  values (k.parent_id, 'days_changed', 'Days updated',
    k.full_name || '''s class days were updated by reception. Check the app for the new days.',
    'تم تحديث الأيام', 'قام الاستقبال بتحديث أيام حصص ' || k.full_name || '. راجع التطبيق لمعرفة الأيام الجديدة.');
end $$;
revoke execute on function public.change_registration_days(uuid, text[], text[], time) from public, anon;

-- ---------- door check-in: a paused registration doesn't use a session ----------
create or replace function public.check_in(p_kid uuid, p_class uuid, p_date date)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare c public.classes%rowtype; v_sub uuid; v_status text; v_id uuid;
begin
  if not public.can_check_in() then raise exception 'not allowed'; end if;
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;

  select s.id, s.status into v_sub, v_status
  from public.subscriptions s
  where s.kid_id = p_kid and s.kind = 'classes' and s.status in ('active','pending_payment')
    and p_date between s.start_date and s.end_date
    and not (s.pause_start is not null and p_date between s.pause_start and s.pause_end)
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

-- only used inside the functions above
revoke execute on function public.my_sub(uuid) from authenticated;
