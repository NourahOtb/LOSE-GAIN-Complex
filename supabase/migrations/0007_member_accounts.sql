-- Task 11a: member accounts ("My family" or "Just me") and the guardian's relationship.
-- A "Just me" member, or a guardian who adds themselves, is stored as a row in kids
-- with is_self = true, so classes, prices, the coach view and admin keep working unchanged.

alter table public.profiles
  add column account_type text not null default 'family' check (account_type in ('family','single')),
  add column relationship text check (relationship in
    ('father','mother','grandfather','grandmother','brother','sister','uncle','aunt','guardian'));

-- members may correct their relationship later; account type is changed by staff
grant update (relationship) on public.profiles to authenticated;

alter table public.kids add column is_self boolean not null default false;
-- at most one "me" per account
create unique index kids_one_self_per_account on public.kids(parent_id) where is_self;

-- a "Just me" account only holds the member themself
create or replace function public.kids_check_account()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not new.is_self and exists (
    select 1 from public.profiles where id = new.parent_id and account_type = 'single'
  ) then
    raise exception 'single_account_no_kids';
  end if;
  return new;
end $$;
revoke execute on function public.kids_check_account() from public, anon, authenticated;
create trigger kids_check_account before insert or update of is_self, parent_id on public.kids
  for each row execute function public.kids_check_account();

-- sign-up: keep only known values for account type and relationship
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_type text := case when new.raw_user_meta_data->>'account_type' = 'single' then 'single' else 'family' end;
  v_rel text := new.raw_user_meta_data->>'relationship';
begin
  if v_type = 'single' or v_rel not in ('father','mother','grandfather','grandmother','brother','sister','uncle','aunt','guardian') then
    v_rel := null;
  end if;
  insert into public.profiles (id, full_name, phone, preferred_language, account_type, relationship)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    case when new.raw_user_meta_data->>'preferred_language' = 'ar' then 'ar' else 'en' end,
    v_type,
    v_rel
  );
  return new;
end $$;

-- adult men's swimming: 4 PM Sun, Tue, Thu (owner, 2026-11-18)
insert into public.classes (sport, age_group, location, weekday, start_time, capacity, coach_id)
select 'swimming', 'adults', 'olympic_pool', d, '16:00'::time, 15,
       (select id from public.profiles where role = 'coach' and sport = 'swimming' order by created_at limit 1)
from unnest(array['sun','tue','thu']) d
on conflict do nothing;

-- demo guardians
update public.profiles p set relationship = 'mother'
from auth.users u
where u.id = p.id and u.email in ('noura@lgcomplex.test', 'dalal@lgcomplex.test') and p.relationship is null;
