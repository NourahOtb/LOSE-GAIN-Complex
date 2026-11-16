-- Security check for the demo database. Run in the Supabase SQL editor.
-- It acts as different users, then ends with an error on purpose so that
-- NOTHING it changed is saved. Read the RESULT in the error message.
--
-- Expected (2026-11-17 run, all passed):
--   noura_sees_kids = 2, noura_sees_dalal_kids = 0
--   noura_can_make_herself_admin = false, noura_can_mark_paid = false,
--   noura_can_add_stripe = false, noura_can_insert_active_sub = false,
--   noura_can_change_belt = false
--   reception_mark_paid_status = active
--   coach_add_stripe_now = 3, coach_cancel_wed_mat2_notified = 2
--   noura_inbox contains "New stripe!" and "Jiu-jitsu class cancelled"
do $$
declare
  r jsonb := '{}'; n int; ok boolean; s text;
  v_noura uuid := (select id from auth.users where email='noura@lgcomplex.test');
  v_dalal uuid := (select id from auth.users where email='dalal@lgcomplex.test');
  v_recep uuid := (select id from auth.users where email='reception@lgcomplex.test');
  v_fahad uuid := (select id from auth.users where email='fahad@lgcomplex.test');
  v_yousef uuid := (select id from public.kids where full_name='Yousef');
  v_faisal_sub uuid := (select s.id from public.subscriptions s join public.kids k on k.id=s.kid_id where k.full_name='Faisal');
  v_mat2_wed uuid := (select id from public.classes where location='mat_2' and weekday='wed');
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_noura, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.kids; r := r || jsonb_build_object('noura_sees_kids', n);
  select count(*) into n from public.kids where parent_id = v_dalal; r := r || jsonb_build_object('noura_sees_dalal_kids', n);
  begin update public.profiles set role='super_admin' where id = v_noura; ok := true; exception when others then ok := false; end;
  r := r || jsonb_build_object('noura_can_make_herself_admin', ok);
  begin perform public.mark_paid(v_faisal_sub, 'online'); ok := true; exception when others then ok := false; end;
  r := r || jsonb_build_object('noura_can_mark_paid', ok);
  begin perform public.add_stripe(v_yousef); ok := true; exception when others then ok := false; end;
  r := r || jsonb_build_object('noura_can_add_stripe', ok);
  begin insert into public.subscriptions (kid_id, bjj_days, weeks, end_date, sessions_total, base_price, total, status)
    values (v_yousef, '{sat,mon}', 4, '2026-12-20', 8, 65, 65, 'active'); ok := true; exception when others then ok := false; end;
  r := r || jsonb_build_object('noura_can_insert_active_sub', ok);
  begin update public.kids set belt='green' where id = v_yousef; ok := true; exception when others then ok := false; end;
  r := r || jsonb_build_object('noura_can_change_belt', ok);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_recep, 'role','authenticated')::text, true);
  set local role authenticated;
  perform public.mark_paid(v_faisal_sub, 'knet_machine');
  reset role;
  select status into s from public.subscriptions where id = v_faisal_sub;
  r := r || jsonb_build_object('reception_mark_paid_status', s);

  perform set_config('request.jwt.claims', json_build_object('sub', v_fahad, 'role','authenticated')::text, true);
  set local role authenticated;
  r := r || jsonb_build_object('coach_add_stripe_now', public.add_stripe(v_yousef, '2026-11-17'));
  r := r || jsonb_build_object('coach_cancel_wed_mat2_notified', public.cancel_class(v_mat2_wed, '2026-11-18', 'Coach sick', 'makeup'));
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_noura, 'role','authenticated')::text, true);
  set local role authenticated;
  select string_agg(title_en || ' | ' || body_en, ' || ') into s from public.notifications;
  r := r || jsonb_build_object('noura_inbox', s);
  reset role;
  raise exception 'RESULT %', r;
end $$;
