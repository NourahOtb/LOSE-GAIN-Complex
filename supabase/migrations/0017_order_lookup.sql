-- Every UPayments order id starts with the first 24 characters of the registration id (without dashes),
-- so a payment can be matched even if a newer link was created afterwards (e.g. reception's 24-hour link
-- and the family's own "Pay online"). Used only by the payment server function.
create or replace function public.subscription_by_order(p_order text)
returns uuid language sql stable security definer set search_path = ''
as $$
  select id from public.subscriptions
  where length(p_order) >= 24 and replace(id::text, '-', '') like substr(p_order, 1, 24) || '%'
  limit 1
$$;
revoke execute on function public.subscription_by_order(text) from public, anon, authenticated;
