-- Task 14g: staff accounts and roles, and new families at the desk.
-- Accounts are created by the "accounts" server function (it holds the service key):
--  * the owner manages every staff account; managers add / change / switch off coaches and receptionists
--  * a temporary password is shown once; the person must choose their own after logging in
--  * switching someone off keeps their name on past records (check-ins, notes, payments)
--  * reception (and owner / manager) create a family account at the desk with a temporary password

alter table public.profiles add column must_change_password boolean not null default false;

-- the signed-in person chose their own password (after supabase.auth.updateUser)
create or replace function public.password_changed()
returns void language sql security definer set search_path = ''
as $$ update public.profiles set must_change_password = false where id = auth.uid() $$;
revoke execute on function public.password_changed() from public, anon;

-- staff list with login email and last log-in (owner and managers only)
create or replace function public.staff_directory()
returns table (id uuid, full_name text, email text, phone text, role public.app_role, sport text, is_active boolean,
               must_change_password boolean, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if public.current_app_role() not in ('super_admin','manager') then raise exception 'not allowed'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.phone, p.role, p.sport, p.is_active, p.must_change_password, u.last_sign_in_at, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.role <> 'parent'
    order by p.is_active desc, p.role, p.full_name;
end $$;
revoke execute on function public.staff_directory() from public, anon;

-- a family's login email (staff), for the desk WhatsApp message
create or replace function public.family_login(p_parent uuid)
returns table (email text, must_change_password boolean, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  return query select u.email::text, p.must_change_password, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.id where p.id = p_parent and p.role = 'parent';
end $$;
revoke execute on function public.family_login(uuid) from public, anon;
