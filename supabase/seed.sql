-- Demo data for the Wednesday presentation. All names are made up.
-- Replace __DEMO_PASSWORD__ before running (the real value lives in docs/demo-accounts.local.md, not in git).

do $$
declare
  pw text := '__DEMO_PASSWORD__';
  u record;
  v_admin uuid; v_recep uuid; v_hamad uuid; v_fahad uuid; v_noura uuid; v_dalal uuid;
  v_sara uuid; v_yousef uuid; v_faisal uuid; v_noor uuid;
begin
  for u in select * from (values
    ('admin@lgcomplex.test','Owner','super_admin',null),
    ('reception@lgcomplex.test','Mariam','receptionist',null),
    ('hamad@lgcomplex.test','Coach Hamad','coach','swimming'),
    ('fahad@lgcomplex.test','Coach Fahad','coach','jiujitsu'),
    ('noura@lgcomplex.test','Noura Al-Ali','parent',null),
    ('dalal@lgcomplex.test','Dalal Al-Sabah','parent',null)
  ) as t(email, name, role, sport)
  loop
    if not exists (select 1 from auth.users where email = u.email) then
      declare v_id uuid := gen_random_uuid();
      begin
        insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, email_change, email_change_token_new, recovery_token)
        values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', u.email,
          extensions.crypt(pw, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name),
          now(), now(), '', '', '', '');
        insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now());
      end;
    end if;
    update public.profiles p set role = u.role::public.app_role, sport = u.sport, full_name = u.name,
        relationship = case when u.role = 'parent' then 'mother' end
      from auth.users a where a.id = p.id and a.email = u.email;
  end loop;

  select id into v_hamad from auth.users where email = 'hamad@lgcomplex.test';
  select id into v_fahad from auth.users where email = 'fahad@lgcomplex.test';
  select id into v_noura from auth.users where email = 'noura@lgcomplex.test';
  select id into v_dalal from auth.users where email = 'dalal@lgcomplex.test';
  select id into v_recep from auth.users where email = 'reception@lgcomplex.test';

  -- weekly timetable
  insert into public.classes (sport, age_group, location, weekday, start_time, capacity, coach_id)
  select 'swimming','kids','kids_pool', d, '16:00'::time, 15, v_hamad from unnest(array['sat','sun','mon','tue','wed','thu']) d
  union all select 'swimming','kids','olympic_pool', d, '17:00', 20, v_hamad from unnest(array['sat','sun','mon','tue','wed','thu']) d
  union all select 'jiujitsu','titans','mat_1', d, '16:00', 12, v_fahad from unnest(array['sat','sun','mon','tue','wed','thu']) d
  union all select 'jiujitsu','kids','mat_2', d, '17:00', 10, v_fahad from unnest(array['sat','sun','mon','tue','wed','thu']) d
  union all select 'swimming','adults','olympic_pool', d, '16:00', 15, v_hamad from unnest(array['sun','tue','thu']) d
  on conflict do nothing;

  if not exists (select 1 from public.kids where parent_id = v_noura) then
    insert into public.kids (parent_id, full_name, birth_date, health_conditions, health_confirmed, emergency_phone, swim_level, swim_level_since)
      values (v_noura, 'Sara', '2019-03-10', '{}', true, '+96550000001', 3, '2026-11-02') returning id into v_sara;
    insert into public.kids (parent_id, full_name, birth_date, health_conditions, health_other, health_confirmed, emergency_phone, belt, belt_since)
      values (v_noura, 'Yousef', '2017-05-02', '{asthma}', 'Inhaler in bag', true, '+96550000001', 'grey_white', '2026-09-02') returning id into v_yousef;
    insert into public.stripes (kid_id, belt, awarded_on, coach_id) values
      (v_yousef, 'grey_white', '2026-09-20', v_fahad), (v_yousef, 'grey_white', '2026-10-14', v_fahad);
    insert into public.coach_notes (kid_id, author_id, body) values
      (v_sara, v_hamad, 'Great progress on breathing to the side. Ready to start backstroke.');

    insert into public.subscriptions (kid_id, swim_days, start_time, weeks, start_date, end_date, sessions_total, sessions_used,
      base_price, discount_pct, total, status, payment_method, paid_at, paid_by)
    values
      (v_sara, '{sun,tue,thu}', '16:00', 4, '2026-11-05', '2026-12-03', 12, 5, 90, 0, 90, 'active', 'knet_machine', now(), v_recep);
    insert into public.subscriptions (kid_id, bjj_days, start_time, weeks, start_date, end_date, sessions_total, sessions_used,
      base_price, discount_pct, total, status, payment_method, paid_at, paid_by)
    values
      (v_yousef, '{sat,mon,wed}', '17:00', 4, '2026-10-22', '2026-11-19', 12, 10, 90, 7, 83.7, 'active', 'online', now(), v_recep);
  end if;

  if not exists (select 1 from public.kids where parent_id = v_dalal) then
    insert into public.kids (parent_id, full_name, birth_date, health_conditions, health_confirmed, emergency_phone, belt, belt_since)
      values (v_dalal, 'Faisal', '2016-08-14', '{}', true, '+96550000002', 'yellow', '2026-06-01') returning id into v_faisal;
    insert into public.kids (parent_id, full_name, birth_date, health_conditions, health_confirmed, emergency_phone, belt, belt_since)
      values (v_dalal, 'Noor', '2019-01-20', '{allergies}', true, '+96550000002', 'grey', '2026-03-15') returning id into v_noor;
    insert into public.stripes (kid_id, belt, awarded_on, coach_id) values
      (v_faisal, 'yellow', '2026-07-10', v_fahad), (v_faisal, 'yellow', '2026-08-25', v_fahad), (v_faisal, 'yellow', '2026-09-30', v_fahad),
      (v_noor, 'grey', '2026-05-01', v_fahad), (v_noor, 'grey', '2026-06-20', v_fahad), (v_noor, 'grey', '2026-08-15', v_fahad), (v_noor, 'grey', '2026-10-05', v_fahad);
    insert into public.subscriptions (kid_id, bjj_days, start_time, weeks, start_date, end_date, sessions_total,
      base_price, discount_pct, total, status)
    values
      (v_faisal, '{sat,mon,wed}', '17:00', 4, '2026-11-18', '2026-12-16', 12, 90, 0, 90, 'pending_payment'),
      (v_noor, '{sat,mon,wed}', '17:00', 4, '2026-11-18', '2026-12-16', 12, 90, 7, 83.7, 'pending_payment');
  end if;
end $$;

-- boy / girl for the demo kids (Task 11b)
update public.kids k set gender = v.g
from (values ('Sara','female'), ('Yousef','male'), ('Faisal','male'), ('Noor','female')) as v(n, g),
     auth.users u
where k.full_name = v.n and k.parent_id = u.id
  and u.email in ('noura@lgcomplex.test','dalal@lgcomplex.test') and k.gender is null;
