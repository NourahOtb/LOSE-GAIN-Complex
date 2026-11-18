-- Security review fixes (2026-11-19). Each block says which finding it closes.

-- ---------- 1. classes: written only through update_class / set_class_capacity (owner, manager) ----------
drop policy if exists classes_insert on public.classes;
drop policy if exists classes_update on public.classes;
drop policy if exists classes_delete on public.classes;

-- ---------- 4. a switched-off account has no role: "not in" checks must not let NULL through ----------
create or replace function public.update_class(p_class uuid, p_start time, p_duration smallint, p_coach uuid, p_location text, p_active boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare c public.classes%rowtype;
begin
  if not coalesce(public.current_app_role() in ('super_admin','manager'), false) then raise exception 'not allowed'; end if;
  if p_coach is not null and not exists (select 1 from public.profiles where id = p_coach and role = 'coach') then raise exception 'not a coach'; end if;
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  update public.classes set start_time = p_start, duration_min = p_duration, coach_id = p_coach, location = p_location, is_active = p_active
  where id = p_class;
  if c.sport = 'jiujitsu' and p_start <> c.start_time then
    update public.subscriptions
    set bjj_times = jsonb_set(coalesce(bjj_times, '{}'::jsonb), array[c.weekday], to_jsonb(to_char(p_start, 'HH24:MI')))
    where kind = 'classes' and status in ('active','pending_payment') and c.weekday = any (bjj_days)
      and public.sub_time(subscriptions, 'jiujitsu', c.weekday) = c.start_time;
  end if;
end $$;
revoke execute on function public.update_class(uuid, time, smallint, uuid, text, boolean) from public, anon;

create or replace function public.set_class_capacity(p_class uuid, p_capacity int)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(public.current_app_role() in ('super_admin','manager'), false) then raise exception 'not allowed'; end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 200 then raise exception 'bad_capacity'; end if;
  update public.classes set capacity = p_capacity where id = p_class;
end $$;
revoke execute on function public.set_class_capacity(uuid, int) from public, anon;

create or replace function public.staff_directory()
returns table (id uuid, full_name text, email text, phone text, role public.app_role, sport text, is_active boolean,
               must_change_password boolean, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(public.current_app_role() in ('super_admin','manager'), false) then raise exception 'not allowed'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.phone, p.role, p.sport, p.is_active, p.must_change_password, u.last_sign_in_at, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.role <> 'parent'
    order by p.is_active desc, p.role, p.full_name;
end $$;
revoke execute on function public.staff_directory() from public, anon;

create or replace function public.send_check_on(p_kid uuid, p_missed int)
returns void language plpgsql security definer set search_path = ''
as $$
declare k public.kids%rowtype;
begin
  if not coalesce(public.current_app_role() in ('super_admin','manager'), false) then raise exception 'not allowed'; end if;
  if p_missed is null or p_missed < 1 or p_missed > 60 then raise exception 'bad_count'; end if;
  select * into k from public.kids where id = p_kid;
  if k.id is null then raise exception 'not_found'; end if;
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  values (k.parent_id, 'check_on',
    'We missed ' || k.full_name,
    k.full_name || ' missed ' || p_missed || ' classes recently. Is everything okay? If something is wrong (an injury, a schedule change), reply in the chat or tap "Pause or change" on the home screen. We''d love to see ' || k.full_name || ' back soon.',
    'افتقدنا ' || k.full_name,
    'غاب ' || k.full_name || ' عن ' || translate(p_missed::text, '0123456789', '٠١٢٣٤٥٦٧٨٩') || ' حصص مؤخراً. هل كل شيء على ما يرام؟ إذا كان هناك أمر (إصابة أو تغيير في المواعيد)، راسلونا في المحادثة أو اضغطوا "إيقاف أو تغيير" في الصفحة الرئيسية. نتمنى رؤية ' || k.full_name || ' قريباً.');
end $$;
revoke execute on function public.send_check_on(uuid, int) from public, anon;

-- a switched-off person can't keep sending chat messages with an old log-in
drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid())
              and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
              and exists (select 1 from public.conversations c where c.id = conversation_id
                          and (c.parent_id = (select auth.uid()) or c.coach_id = (select auth.uid()))));

-- ---------- 2. registrations are created only by the "register" server function (price checked there) ----------
drop policy if exists subs_insert_staff on public.subscriptions;
-- exception discount given at the desk (owner / manager / reception), with a reason and who gave it
alter table public.subscriptions
  add column extra_discount_pct numeric(5,2) not null default 0 check (extra_discount_pct between 0 and 100),
  add column discount_reason text check (length(discount_reason) <= 200),
  add column discount_by uuid references public.profiles(id) on delete set null;
create index subscriptions_discount_by_idx on public.subscriptions(discount_by);

-- ---------- 6. privacy: coaches don't see parents' phone numbers or any money ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff()
         or (public.current_app_role() = 'coach' and role <> 'parent'));

-- the guardian's name and relationship for a kid (coach's kid page)
create or replace function public.guardian_of(p_kid uuid)
returns table (full_name text, relationship text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  return query select p.full_name, p.relationship from public.kids k join public.profiles p on p.id = k.parent_id where k.id = p_kid;
end $$;
revoke execute on function public.guardian_of(uuid) from public, anon;

drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions for select to authenticated
  using (public.is_staff()
         or exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = (select auth.uid())));

-- coaches get the class schedule only (no prices or payment details)
create or replace function public.coach_roster()
returns table (id uuid, kid_id uuid, kind text, swim_days text[], bjj_days text[], start_time time, bjj_times jsonb,
               start_date date, end_date date, status text, sessions_total smallint, sessions_used smallint, weeks smallint,
               pause_start date, pause_end date)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  return query select s.id, s.kid_id, s.kind, s.swim_days, s.bjj_days, s.start_time, s.bjj_times, s.start_date, s.end_date, s.status,
                      s.sessions_total, s.sessions_used, s.weeks, s.pause_start, s.pause_end
    from public.subscriptions s where s.status in ('active','pending_payment');
end $$;
revoke execute on function public.coach_roster() from public, anon;

drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests for select to authenticated
  using (parent_id = (select auth.uid()) or public.is_staff());

-- ---------- 7. the accountant does money; reception jobs need owner / manager / reception ----------
create or replace function public.cancel_class(p_class uuid, p_date date, p_reason text default null,
  p_compensation text default 'makeup')
returns integer language plpgsql security definer set search_path = ''
as $$
declare c public.classes%rowtype; v_count integer; v_sport_en text; v_sport_ar text; v_time text; v_time_ar text; v_role text; v_my_sport text;
begin
  select role::text, sport into v_role, v_my_sport from public.profiles where id = auth.uid() and is_active;
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  -- reception, managers and the owner; a coach only for their own sport
  if not (public.can_approve() or (v_role = 'coach' and v_my_sport = c.sport)) then raise exception 'not allowed'; end if;
  if p_date < (now() at time zone 'Asia/Kuwait')::date then raise exception 'past date'; end if;
  if lower(to_char(p_date, 'dy')) <> c.weekday then raise exception 'date is not a %', c.weekday; end if;
  if p_compensation not in ('makeup','extend','none') then raise exception 'bad compensation'; end if;

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
    and (case when k.is_self or extract(year from age(k.birth_date)) >= 16
                or (c.sport = 'jiujitsu' and extract(year from age(k.birth_date)) >= 11)
              then 'adults' else 'kids' end) = c.age_group;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.cancel_class(uuid, date, text, text) from public, anon;

create or replace function public.cancel_open_pool(p_date date, p_session text, p_reason text default null)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_first boolean; v_count integer; v_when_en text; v_when_ar text; v_date_ar text;
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
  if p_session not in ('morning','evening','day') then raise exception 'bad session'; end if;
  if p_date < (now() at time zone 'Asia/Kuwait')::date then raise exception 'past date'; end if;
  if extract(dow from p_date) = 5 then raise exception 'the complex is closed on Fridays'; end if;
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

create or replace function public.decide_pool_freeze(p_sub uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare s public.subscriptions%rowtype; v_parent uuid; v_start_ar text;
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
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

create or replace function public.answer_handoff(p_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = ''
as $$
declare h public.assistant_handoffs%rowtype;
begin
  if not public.can_approve() then raise exception 'not allowed'; end if;
  if length(btrim(coalesce(p_reply, ''))) = 0 then raise exception 'reply required'; end if;
  select * into h from public.assistant_handoffs where id = p_id;
  if h.id is null then raise exception 'not found'; end if;
  update public.assistant_handoffs set status = 'answered', reply = btrim(p_reply), answered_by = auth.uid(), answered_at = now() where id = p_id;
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  values (h.parent_id, 'assistant_reply', 'Reception replied', btrim(p_reply), 'رد الاستقبال', btrim(p_reply));
end $$;
revoke execute on function public.answer_handoff(uuid, text) from public, anon;

drop policy if exists kids_update on public.kids;
create policy kids_update on public.kids for update to authenticated
  using (parent_id = (select auth.uid()) or public.can_approve())
  with check (parent_id = (select auth.uid()) or public.can_approve());
drop policy if exists kids_insert on public.kids;
create policy kids_insert on public.kids for insert to authenticated
  with check (parent_id = (select auth.uid()) or public.can_approve());

drop policy if exists kid_photos_insert on storage.objects;
drop policy if exists kid_photos_update on storage.objects;
drop policy if exists kid_photos_delete on storage.objects;
create policy kid_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kid-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.can_approve()));
create policy kid_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'kid-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.can_approve()));
create policy kid_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'kid-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.can_approve()));

-- ---------- 12. families can't give their kid a level or belt; a photo must be in the family's own folder ----------
revoke insert on public.kids from authenticated;
grant insert (parent_id, full_name, birth_date, gender, photo_url, health_conditions, health_other, health_confirmed, emergency_phone, is_self)
  on public.kids to authenticated;
alter table public.kids add constraint kids_photo_own_folder check (photo_url is null or photo_url like parent_id::text || '/%');

-- ---------- 5. a temporary password must really be changed before the flag clears ----------
create table public.temp_passwords (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.temp_passwords enable row level security; -- no policies: nobody reads it from the app

-- called by the "accounts" server function right after it sets a temporary password
create or replace function public.remember_temp_password(p_user uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into public.temp_passwords (user_id, password_hash)
  select id, encrypted_password from auth.users where id = p_user
  on conflict (user_id) do update set password_hash = excluded.password_hash, created_at = now();
  update public.profiles set must_change_password = true where id = p_user;
$$;
revoke execute on function public.remember_temp_password(uuid) from public, anon, authenticated;

drop function if exists public.password_changed();
create or replace function public.password_changed()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_old text; v_now text;
begin
  select password_hash into v_old from public.temp_passwords where user_id = auth.uid();
  select encrypted_password into v_now from auth.users where id = auth.uid();
  if v_old is not null and v_old = v_now then return false; end if; -- still the temporary password
  update public.profiles set must_change_password = false where id = auth.uid();
  delete from public.temp_passwords where user_id = auth.uid();
  return true;
end $$;
revoke execute on function public.password_changed() from public, anon;

-- ---------- 3. online payments: test (sandbox) or live is a visible setting, never a silent fallback ----------
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy app_settings_select on public.app_settings for select to authenticated using (public.is_staff());
insert into public.app_settings (key, value) values ('payments_mode', 'sandbox');

-- ---------- 9. a second payment for an already paid (or cancelled) registration is recorded for a refund ----------
create table public.payment_alerts (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  track_id text not null unique,
  amount numeric(10,3) not null,
  reason text not null check (reason in ('paid_twice','paid_after_cancel')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);
create index payment_alerts_subscription_idx on public.payment_alerts(subscription_id);
create index payment_alerts_resolved_by_idx on public.payment_alerts(resolved_by);
alter table public.payment_alerts enable row level security;
create policy payment_alerts_select on public.payment_alerts for select to authenticated using (public.is_staff());

create or replace function public.resolve_payment_alert(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.can_refund() or public.can_approve()) then raise exception 'not allowed'; end if;
  update public.payment_alerts set resolved_at = now(), resolved_by = auth.uid() where id = p_id and resolved_at is null;
end $$;
revoke execute on function public.resolve_payment_alert(uuid) from public, anon;

-- ---------- 8. unpaid registrations don't hold places forever ----------
-- still unpaid 7 days after the first class day → cancelled, family told (the place is free again)
create or replace function public.expire_unpaid()
returns integer language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  with gone as (
    update public.subscriptions s set status = 'cancelled'
    where s.status = 'pending_payment' and s.start_date + 7 < (now() at time zone 'Asia/Kuwait')::date
    returning s.kid_id
  )
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  select k.parent_id, 'unpaid_cancelled', 'Registration cancelled (not paid)',
    k.full_name || '''s registration was cancelled because it wasn''t paid within a week of the first class. You can register again any time.',
    'تم إلغاء الاشتراك (غير مدفوع)',
    'تم إلغاء اشتراك ' || k.full_name || ' لعدم الدفع خلال أسبوع من أول حصة. يمكنك التسجيل مرة أخرى في أي وقت.'
  from gone g join public.kids k on k.id = g.kid_id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.expire_unpaid() from public, anon, authenticated;

-- ---------- 10. AI assistant: the member agrees first; and a daily cap for the whole complex ----------
alter table public.profiles add column ai_consent_at timestamptz;

create or replace function public.give_ai_consent()
returns void language sql security definer set search_path = ''
as $$ update public.profiles set ai_consent_at = coalesce(ai_consent_at, now()) where id = auth.uid() $$;
revoke execute on function public.give_ai_consent() from public, anon;

create or replace function public.assistant_take(p_user uuid, p_limit integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v integer; v_all integer; v_day date := (now() at time zone 'Asia/Kuwait')::date;
begin
  -- the whole complex: at most 800 assistant messages a day (cost cap)
  select coalesce(sum(messages), 0) into v_all from public.assistant_usage where day = v_day;
  if v_all >= 800 then return false; end if;
  insert into public.assistant_usage (user_id, day, messages) values (p_user, v_day, 1)
  on conflict (user_id, day) do update set messages = public.assistant_usage.messages + 1
  returning messages into v;
  return v <= p_limit;
end $$;
revoke execute on function public.assistant_take(uuid, integer) from public, anon, authenticated;

-- run the unpaid clean-up every night (03:00 Kuwait = 00:00 UTC)
create extension if not exists pg_cron;
select cron.schedule('expire-unpaid-registrations', '0 0 * * *', 'select public.expire_unpaid()');
