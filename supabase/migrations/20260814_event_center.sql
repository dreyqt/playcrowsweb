-- PlayCrows Event Center
-- Run this migration in Supabase before deploying the Event Center UI.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  event_number text not null,
  title text not null,
  short_description text,
  description text,
  mechanics jsonb not null default '[]'::jsonb,
  rewards jsonb not null default '[]'::jsonb,
  form_fields jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  event_id uuid not null references public.events(id) on delete cascade,
  discord_username text not null,
  character_name text,
  player_id text,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reward_sent_at timestamptz,
  admin_notes text,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_submissions_event_created_idx on public.event_submissions(event_id, created_at desc);
create index if not exists event_submissions_status_idx on public.event_submissions(status);
create unique index if not exists event_submissions_one_open_claim_idx
  on public.event_submissions(event_id, lower(discord_username))
  where status in ('pending','approved');

alter table public.events enable row level security;
alter table public.event_submissions enable row level security;

-- Anyone may read only published active/ended events.
drop policy if exists "Public read published events" on public.events;
create policy "Public read published events" on public.events
for select to anon, authenticated
using (published_at is not null and status in ('active','ended'));

-- Admin users can see and manage every event.
drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events" on public.events
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Submissions are private. Only admin users can read/update/delete them directly.
drop policy if exists "Admins manage event submissions" on public.event_submissions;
create policy "Admins manage event submissions" on public.event_submissions
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Public claim submission goes through a security-definer RPC so the raw table stays private.
create or replace function public.submit_event_claim(
  p_event_id uuid,
  p_discord_username text,
  p_character_name text default null,
  p_player_id text default null,
  p_answers jsonb default '{}'::jsonb
)
returns table (id uuid, reference_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_id uuid;
  v_reference text;
begin
  select * into v_event from public.events where events.id = p_event_id;
  if not found or v_event.published_at is null or v_event.status <> 'active' then
    raise exception 'This event is not accepting claims.';
  end if;
  if v_event.starts_at is not null and now() < v_event.starts_at then
    raise exception 'This event has not started yet.';
  end if;
  if v_event.ends_at is not null and now() > v_event.ends_at then
    raise exception 'This event has ended.';
  end if;
  if length(trim(coalesce(p_discord_username, ''))) < 2 then
    raise exception 'Discord username is required.';
  end if;
  if exists (
    select 1 from public.event_submissions s
    where s.event_id = p_event_id
      and lower(trim(s.discord_username)) = lower(trim(p_discord_username))
      and s.status in ('pending','approved')
  ) then
    raise exception 'You already have a pending or approved claim for this event.';
  end if;

  v_reference := 'EV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.event_submissions(event_id, reference_code, discord_username, character_name, player_id, answers)
  values (p_event_id, v_reference, trim(p_discord_username), nullif(trim(coalesce(p_character_name,'')), ''), nullif(trim(coalesce(p_player_id,'')), ''), coalesce(p_answers, '{}'::jsonb))
  returning event_submissions.id into v_id;

  return query select v_id, v_reference;
end;
$$;

revoke all on function public.submit_event_claim(uuid,text,text,text,jsonb) from public;
grant execute on function public.submit_event_claim(uuid,text,text,text,jsonb) to anon, authenticated;


-- Claim status lookup by private reference code. This exposes only safe status information.
create or replace function public.get_event_claim_status(p_reference_code text)
returns table (
  reference_code text,
  event_number text,
  event_title text,
  discord_username text,
  status text,
  rejection_reason text,
  reward_sent_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.reference_code, e.event_number, e.title, s.discord_username, s.status,
         case when s.status = 'rejected' then s.rejection_reason else null end,
         s.reward_sent_at, s.updated_at
  from public.event_submissions s
  join public.events e on e.id = s.event_id
  where upper(s.reference_code) = upper(trim(p_reference_code))
  limit 1;
$$;

revoke all on function public.get_event_claim_status(text) from public;
grant execute on function public.get_event_claim_status(text) to anon, authenticated;

-- Safe public results: no player ID, character name, answers, admin notes, or reviewer identity.
drop view if exists public.event_public_results;
create view public.event_public_results
with (security_invoker = false)
as
select
  s.id,
  s.event_id,
  s.discord_username,
  s.status,
  case when s.status = 'rejected' then s.rejection_reason else null end as rejection_reason,
  s.reward_sent_at,
  s.updated_at
from public.event_submissions s
join public.events e on e.id = s.event_id
where e.published_at is not null
  and e.status in ('active','ended')
  and s.status in ('approved','rejected');

grant select on public.event_public_results to anon, authenticated;

