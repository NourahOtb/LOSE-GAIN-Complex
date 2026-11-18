-- Members can no longer write registrations (and their price) directly.
-- The "register" server function calculates the price and saves the registration.
-- Staff keep direct insert (desk registrations later).
drop policy if exists subs_insert on public.subscriptions;
create policy subs_insert_staff on public.subscriptions for insert to authenticated
  with check (public.is_staff() and status = 'pending_payment' and paid_at is null);
