-- Paddle Checkout references for PlayCrows manual fulfillment.
-- This keeps legacy PayPal columns intact for historical records.
alter table public.donations
  add column if not exists paddle_checkout_id text,
  add column if not exists paddle_transaction_id text,
  add column if not exists paddle_payment_status text;

create unique index if not exists donations_paddle_transaction_id_unique
  on public.donations (paddle_transaction_id)
  where paddle_transaction_id is not null;

create index if not exists donations_paddle_checkout_id_idx
  on public.donations (paddle_checkout_id)
  where paddle_checkout_id is not null;
