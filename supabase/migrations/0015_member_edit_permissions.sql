-- Task 14b: who may edit a member's details.
-- Families edit their own members; staff edit anyone (desk). Coaches no longer edit details directly:
-- levels, belts, stripes and notes go through set_level / add_stripe / add_coach_note.
drop policy if exists kids_update on public.kids;
create policy kids_update on public.kids for update to authenticated
  using (parent_id = (select auth.uid()) or public.is_staff())
  with check (parent_id = (select auth.uid()) or public.is_staff());
