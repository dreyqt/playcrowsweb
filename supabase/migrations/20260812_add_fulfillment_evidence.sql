-- PlayCrows payment verification + digital fulfillment evidence.
-- Run once in Supabase SQL Editor before deploying the updated admin UI.
alter table public.donations
  add column if not exists paypal_transaction_id text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists fulfillment_status text not null default 'not_delivered'
    check (fulfillment_status in ('not_delivered','delivered')),
  add column if not exists fulfilled_at timestamptz,
  add column if not exists fulfillment_notes text,
  add column if not exists delivered_to text,
  add column if not exists items_delivered text,
  add column if not exists backend_ledger_timestamp timestamptz,
  add column if not exists fulfillment_evidence_path text,
  add column if not exists fulfillment_evidence_name text,
  add column if not exists fulfillment_evidence_mime_type text,
  add column if not exists fulfillment_evidence_size_bytes bigint,
  add column if not exists fulfilled_by text;

create index if not exists donations_paypal_transaction_id_idx
  on public.donations (paypal_transaction_id)
  where paypal_transaction_id is not null;

-- Prevent ordinary clients from silently reverting a completed fulfillment.
-- The UI also locks completed evidence. For stronger tamper resistance,
-- restrict UPDATE policies or move fulfillment writes to a server-side function.
