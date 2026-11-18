-- Task 14h: reports. When a member missed 2+ classes in a month, the owner or a manager can send the
-- family a caring "we missed you" message in the app inbox (English + Arabic).

create or replace function public.send_check_on(p_kid uuid, p_missed int)
returns void language plpgsql security definer set search_path = ''
as $$
declare k public.kids%rowtype;
begin
  if public.current_app_role() not in ('super_admin','manager') then raise exception 'not allowed'; end if;
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
