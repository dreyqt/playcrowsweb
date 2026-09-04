-- PlayCrows Donation Center: admin-controlled receipt submission restrictions.
create table if not exists public.submission_blocks (
  id uuid primary key default gen_random_uuid(),
  identifier_type text not null check (identifier_type in ('player_id','ip_hash','device_id')),
  identifier_value text not null,
  source_donation_id uuid references public.donations(id) on delete set null,
  reason text,
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(identifier_type, identifier_value)
);

alter table public.donations add column if not exists submission_ip_hash text;
alter table public.donations add column if not exists submission_device_id text;
create index if not exists submission_blocks_active_lookup on public.submission_blocks(identifier_type, identifier_value, active);

alter table public.submission_blocks enable row level security;
drop policy if exists "Admins can read submission blocks" on public.submission_blocks;
create policy "Admins can read submission blocks" on public.submission_blocks for select
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "Admins can insert submission blocks" on public.submission_blocks;
create policy "Admins can insert submission blocks" on public.submission_blocks for insert
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "Admins can update submission blocks" on public.submission_blocks;
create policy "Admins can update submission blocks" on public.submission_blocks for update
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
