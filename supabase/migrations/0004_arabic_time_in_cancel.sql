-- Arabic cancellation messages use Arabic digits and ص/م instead of AM/PM.
-- (Full function body as applied to lg-complex-dev on 2026-11-17; see 0001 for the original.)
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
  where s.status = 'active' and s.start_time = c.start_time
    and p_date between s.start_date and s.end_date
    and ((c.sport = 'swimming' and c.weekday = any (s.swim_days))
      or (c.sport = 'jiujitsu' and c.weekday = any (s.bjj_days)));
  get diagnostics v_count = row_count;
  return v_count;
end $$;
