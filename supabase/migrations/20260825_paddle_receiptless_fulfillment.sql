-- Paddle payments are verified server-side by the signed transaction.completed webhook.
-- Receipt evidence remains required for manual payment methods only.
alter table public.donations
  alter column receipt_path drop not null,
  alter column receipt_original_name drop not null,
  alter column receipt_mime_type drop not null,
  alter column receipt_size_bytes drop not null;

-- Required by the Paddle webhook and submit-donation Edge Functions.
grant select, insert, update on public.paddle_transactions to service_role;
