-- Task 14c: reception can send a UPayments link. When it's paid, the method is recorded as 'payment_link'.
alter table public.subscriptions add column payment_link_sent boolean not null default false;
