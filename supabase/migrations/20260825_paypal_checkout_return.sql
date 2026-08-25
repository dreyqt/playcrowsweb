-- Restore PayPal Standard Checkout as the public card/wallet checkout.
-- PayPal orders are created/captured server-side and re-verified by submit-donation.

alter table public.donations
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists paypal_payment_status text,
  add column if not exists paypal_payer_email text,
  add column if not exists paypal_transaction_id text,
  add column if not exists payment_verified_at timestamptz;

alter table public.donations
  alter column receipt_path drop not null,
  alter column receipt_original_name drop not null,
  alter column receipt_mime_type drop not null,
  alter column receipt_size_bytes drop not null;

create unique index if not exists donations_paypal_capture_id_unique
  on public.donations (paypal_capture_id)
  where paypal_capture_id is not null;

create index if not exists donations_paypal_order_id_idx
  on public.donations (paypal_order_id)
  where paypal_order_id is not null;

-- Preserve historical Paddle rows while allowing PayPal and the manual methods.
alter table public.donations
  drop constraint if exists donations_payment_method_check;

alter table public.donations
  add constraint donations_payment_method_check
  check (payment_method in ('paypal', 'paddle', 'gcash', 'wise', 'bybit'));
