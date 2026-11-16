-- Parents may see coaches' names (not phone numbers or anything else).
create or replace function public.coach_directory()
returns table (id uuid, full_name text, sport text)
language sql stable security definer set search_path = ''
as $$ select id, full_name, sport from public.profiles where role = 'coach' and is_active $$;
revoke execute on function public.coach_directory() from public, anon;
grant execute on function public.coach_directory() to authenticated;
