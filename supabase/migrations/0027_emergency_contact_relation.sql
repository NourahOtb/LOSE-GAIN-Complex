-- Emergency phone is optional (owner, 2026-11-19). When a number is given, we ask who it belongs to
-- (their relation to the kid), so a coach knows whether they are calling the grandmother or a family friend.
-- New health options "eyes" (eye condition) and "glasses" (wears glasses) need no schema change:
-- health_conditions is a free text[] that the app and dashboard fill from a fixed list.

alter table public.kids add column emergency_relation text check (emergency_relation in
  ('father','mother','grandfather','grandmother','brother','sister','uncle','aunt','cousin','friend','other'));

grant insert (emergency_relation) on public.kids to authenticated;
grant update (emergency_relation) on public.kids to authenticated;
