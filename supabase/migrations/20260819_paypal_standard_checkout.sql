-- PayPal Standard Checkout evidence for Donation Center.
-- Additive only: existing donations and statuses are not modified.

alter table public.donations
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists paypal_payment_status text,
  add column if not exists paypal_payer_email text;

create unique index if not exists donations_paypal_capture_id_unique
  on public.donations (paypal_capture_id)
  where paypal_capture_id is not null;

create index if not exists donations_paypal_order_id_idx
  on public.donations (paypal_order_id)
  where paypal_order_id is not null;
