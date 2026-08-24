-- Server-side Paddle webhook verification cache.
-- Only the service-role key should access this table.
create table if not exists public.paddle_transactions (
  transaction_id text primary key,
  event_id text not null unique,
  event_type text not null,
  paddle_status text not null,
  custom_data jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  occurred_at timestamptz,
  received_at timestamptz not null default now()
);

create index if not exists paddle_transactions_status_idx
  on public.paddle_transactions (paddle_status);

alter table public.paddle_transactions enable row level security;

-- No anon/authenticated policies are intentionally created.
-- Supabase Edge Functions use the service-role key for reads/writes.
