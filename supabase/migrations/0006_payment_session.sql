-- UPayments session id from the payment link, so we can check a payment even if the parent never returns to our page.
alter table public.subscriptions add column if not exists payment_session_id text;
