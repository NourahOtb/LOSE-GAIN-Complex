-- The guardian's relationship is asked per kid, when the kid is added (owner, 2026-11-19):
-- a mother can register her son and her nephew (aunt) or her cousin's daughter (cousin).
-- profiles.relationship is no longer asked at sign-up; it stays only for old data.

alter table public.kids add column relationship text check (relationship in
  ('father','mother','grandfather','grandmother','brother','sister','uncle','aunt','cousin','guardian'));

update public.kids k set relationship = p.relationship
from public.profiles p where p.id = k.parent_id and not k.is_self and p.relationship is not null;

grant insert (relationship) on public.kids to authenticated;
grant update (relationship) on public.kids to authenticated;

-- the guardian's name, and their relationship to THIS kid (coach's kid page)
create or replace function public.guardian_of(p_kid uuid)
returns table (full_name text, relationship text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_coach_or_staff() then raise exception 'not allowed'; end if;
  return query select p.full_name, coalesce(k.relationship, p.relationship) from public.kids k join public.profiles p on p.id = k.parent_id where k.id = p_kid;
end $$;
revoke execute on function public.guardian_of(uuid) from public, anon;
