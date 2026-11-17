-- Online payments (UPayments): remember which payment activated a subscription.
alter table public.subscriptions
  add column if not exists payment_order_id text unique,   -- the order id we send to UPayments
  add column if not exists payment_track_id text,          -- UPayments track_id of the captured payment
  add column if not exists payment_link_at timestamptz;    -- when the last payment link was created
create index if not exists subscriptions_payment_order_idx on public.subscriptions(payment_order_id);
