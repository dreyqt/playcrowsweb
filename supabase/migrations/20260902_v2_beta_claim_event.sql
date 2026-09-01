-- Temporary PlayCrows V2 Beta Claim extension.
-- Run once in Supabase SQL Editor, then deploy the website.

create extension if not exists pgcrypto;

create table if not exists public.v2_beta_claim_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.v2_beta_claim_settings (id, enabled) values (true, true)
on conflict (id) do nothing;

create table if not exists public.v2_beta_claims (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  player_id text not null,
  nickname text not null,
  discord_id text not null,
  event_type text not null check (event_type in ('share_fb','invite_discord','share_livestream')),
  locale text not null check (locale in ('en','ko')),
  claim_date date not null default ((now() at time zone 'Asia/Manila')::date),
  proof_links jsonb not null default '[]'::jsonb,
  screenshot_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists v2_beta_claims_player_daily_event_uq
  on public.v2_beta_claims (lower(trim(player_id)), event_type, claim_date);
create unique index if not exists v2_beta_claims_discord_daily_event_uq
  on public.v2_beta_claims (discord_id, event_type, claim_date);
create index if not exists v2_beta_claims_review_idx
  on public.v2_beta_claims (status, created_at desc);

alter table public.v2_beta_claim_settings enable row level security;
alter table public.v2_beta_claims enable row level security;

drop policy if exists "Admins manage beta settings" on public.v2_beta_claim_settings;
create policy "Admins manage beta settings" on public.v2_beta_claim_settings for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins manage beta claims" on public.v2_beta_claims;
create policy "Admins manage beta claims" on public.v2_beta_claims for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('v2-beta-proofs', 'v2-beta-proofs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Upload V2 beta proof" on storage.objects;
create policy "Upload V2 beta proof" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'v2-beta-proofs' and (storage.foldername(name))[1] = (now() at time zone 'UTC')::date::text);

drop policy if exists "Delete unlinked V2 beta proof" on storage.objects;
create policy "Delete unlinked V2 beta proof" on storage.objects for delete to anon, authenticated
using (bucket_id = 'v2-beta-proofs' and created_at > now() - interval '15 minutes');

drop policy if exists "Admins read V2 beta proof" on storage.objects;
create policy "Admins read V2 beta proof" on storage.objects for select to authenticated
using (bucket_id = 'v2-beta-proofs' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create or replace function public.get_v2_beta_claim_status()
returns table(enabled boolean)
language sql security definer set search_path = public
as $$ select coalesce((select s.enabled from public.v2_beta_claim_settings s where s.id = true), false); $$;
revoke all on function public.get_v2_beta_claim_status() from public;
grant execute on function public.get_v2_beta_claim_status() to anon, authenticated;

create or replace function public.submit_v2_beta_claim(
  p_player_id text, p_nickname text, p_discord_id text, p_event_type text,
  p_locale text, p_proof_links jsonb, p_screenshot_path text default null
)
returns table(id uuid, reference_code text)
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_reference text; v_count int; v_claim_date date := (now() at time zone 'Asia/Manila')::date;
begin
  if not coalesce((select enabled from public.v2_beta_claim_settings where v2_beta_claim_settings.id = true), false) then raise exception 'Beta claims are currently closed.'; end if;
  if length(trim(coalesce(p_player_id,''))) < 2 or length(trim(coalesce(p_nickname,''))) < 2 then raise exception 'Valid V2 Player ID and nickname are required.'; end if;
  if coalesce(p_discord_id,'') !~ '^[0-9]{15,22}$' then raise exception 'A valid Discord User ID is required.'; end if;
  if p_event_type not in ('share_fb','invite_discord','share_livestream') or p_locale not in ('en','ko') then raise exception 'Invalid event selection.'; end if;
  if jsonb_typeof(p_proof_links) <> 'array' then raise exception 'Proof links are required.'; end if;
  select count(*) into v_count from jsonb_array_elements_text(p_proof_links) x where x ~* '^https?://';
  if (p_event_type = 'share_fb' and (v_count <> 5 or (select count(distinct lower(regexp_replace(value,'/+$',''))) from jsonb_array_elements_text(p_proof_links)) <> 5))
     or (p_event_type in ('invite_discord','share_livestream') and v_count <> 1) then raise exception 'Complete and unique proof links are required.'; end if;
  if p_event_type = 'invite_discord' and (coalesce(p_screenshot_path,'') = '' or not exists (select 1 from storage.objects where bucket_id='v2-beta-proofs' and name=p_screenshot_path)) then raise exception 'Invite Tracker screenshot is required.'; end if;
  if p_event_type <> 'invite_discord' and p_screenshot_path is not null then raise exception 'Unexpected screenshot.'; end if;
  if exists (select 1 from public.v2_beta_claims c where c.event_type=p_event_type and c.claim_date=v_claim_date and (lower(trim(c.player_id))=lower(trim(p_player_id)) or c.discord_id=p_discord_id)) then raise exception 'You already submitted this event today. You may submit it again after midnight GMT+8.'; end if;
  v_reference := 'V2-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.v2_beta_claims(reference_code,player_id,nickname,discord_id,event_type,locale,claim_date,proof_links,screenshot_path)
  values(v_reference,trim(p_player_id),trim(p_nickname),p_discord_id,p_event_type,p_locale,v_claim_date,p_proof_links,p_screenshot_path)
  returning v2_beta_claims.id into v_id;
  return query select v_id, v_reference;
exception when unique_violation then raise exception 'You already submitted this event today. You may submit it again after midnight GMT+8.';
end; $$;
revoke all on function public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text) from public;
grant execute on function public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text) to anon, authenticated;

-- Disable after beta:
-- update public.v2_beta_claim_settings set enabled = false, updated_at = now() where id = true;
-- Re-enable if needed:
-- update public.v2_beta_claim_settings set enabled = true, updated_at = now() where id = true;
