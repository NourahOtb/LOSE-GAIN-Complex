-- Members have a first and a last name (owner, 2026-11-19). full_name stays (used everywhere for display)
-- and is always built from the two: "first last". Old callers that only send full_name still work:
-- the trigger splits it (first word / the rest).

alter table public.kids
  add column first_name text check (length(first_name) <= 60),
  add column last_name text check (length(last_name) <= 60);

update public.kids set
  first_name = split_part(btrim(full_name), ' ', 1),
  last_name = nullif(btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)), '');

create or replace function public.kids_names()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.first_name := nullif(btrim(coalesce(new.first_name, '')), '');
  new.last_name := nullif(btrim(coalesce(new.last_name, '')), '');
  if new.first_name is not null and (tg_op = 'INSERT' or new.first_name is distinct from old.first_name or new.last_name is distinct from old.last_name) then
    new.full_name := btrim(new.first_name || ' ' || coalesce(new.last_name, ''));
  elsif tg_op = 'INSERT' or new.full_name is distinct from old.full_name then
    new.full_name := btrim(new.full_name);
    new.first_name := split_part(new.full_name, ' ', 1);
    new.last_name := nullif(btrim(substr(new.full_name, length(new.first_name) + 1)), '');
  end if;
  return new;
end $$;
revoke execute on function public.kids_names() from public, anon, authenticated;
create trigger kids_names before insert or update on public.kids
  for each row execute function public.kids_names();

grant insert (first_name, last_name) on public.kids to authenticated;
grant update (first_name, last_name) on public.kids to authenticated;
