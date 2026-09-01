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
  locale text not null check (locale in ('en','ko','th','pt','zh-TW','ru')),
  claim_date date not null default ((now() at time zone 'Asia/Manila')::date),
  proof_links jsonb not null default '[]'::jsonb,
  screenshot_path text,
  duplicate_link_detected boolean not null default false,
  duplicate_link_references text[] not null default '{}'::text[],
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe when upgrading an installation created by an earlier migration version.
alter table public.v2_beta_claims add column if not exists duplicate_link_detected boolean not null default false;
alter table public.v2_beta_claims add column if not exists duplicate_link_references text[] not null default '{}'::text[];

create or replace function public.normalize_v2_beta_proof_url(p_url text)
returns text
language sql immutable strict
set search_path = public
as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(lower(trim(p_url)), '^https?://(www\.)?', ''),
      '#.*$', ''
    ),
    '/+$', ''
  );
$$;

-- Backfill security marks if this migration is rerun after claims already exist.
with duplicate_claims as (
  select c1.id, array_agg(distinct c2.reference_code) as references
    from public.v2_beta_claims c1
    cross join lateral jsonb_array_elements_text(c1.proof_links) link1(value)
    cross join public.v2_beta_claims c2
    cross join lateral jsonb_array_elements_text(c2.proof_links) link2(value)
   where c2.id <> c1.id
     and lower(trim(c2.player_id)) <> lower(trim(c1.player_id))
     and public.normalize_v2_beta_proof_url(link2.value) = public.normalize_v2_beta_proof_url(link1.value)
   group by c1.id
)
update public.v2_beta_claims claim
   set duplicate_link_detected = true,
       duplicate_link_references = duplicate_claims.references
  from duplicate_claims
 where claim.id = duplicate_claims.id;

create unique index if not exists v2_beta_claims_player_daily_event_uq
  on public.v2_beta_claims (lower(trim(player_id)), event_type, claim_date);
drop index if exists public.v2_beta_claims_discord_daily_event_uq;
create unique index v2_beta_claims_discord_daily_event_uq
  on public.v2_beta_claims (lower(trim(discord_id)), event_type, claim_date);
create index if not exists v2_beta_claims_review_idx
  on public.v2_beta_claims (status, created_at desc);

alter table public.v2_beta_claim_settings enable row level security;
alter table public.v2_beta_claims enable row level security;

-- Safe to rerun if an earlier two-language version was already installed.
alter table public.v2_beta_claims drop constraint if exists v2_beta_claims_locale_check;
alter table public.v2_beta_claims add constraint v2_beta_claims_locale_check
  check (locale in ('en','ko','th','pt','zh-TW','ru'));

drop policy if exists "Admins manage beta settings" on public.v2_beta_claim_settings;
create policy "Admins manage beta settings" on public.v2_beta_claim_settings for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins manage beta claims" on public.v2_beta_claims;
create policy "Admins manage beta claims" on public.v2_beta_claims for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

grant select, update on table public.v2_beta_claims to authenticated;
grant select, update on table public.v2_beta_claim_settings to authenticated;

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

-- Privacy-safe public results. Rejection reasons are public so players can
-- correct a claim; Player ID, nickname, proof, reference code, and private
-- admin notes are never exposed.
drop function if exists public.get_v2_beta_public_results();
create or replace function public.get_v2_beta_public_results()
returns table(discord_id text, event_type text, public_status text, review_note text)
language sql
stable
security definer
set search_path = public
as $$
  select c.discord_id,
         c.event_type,
         case when c.status = 'pending' then 'pending' when c.status = 'rejected' then 'rejected' else 'processed' end,
         case when c.status = 'rejected' then c.rejection_reason else null end
    from public.v2_beta_claims c
   order by c.created_at desc
   limit 500;
$$;
revoke all on function public.get_v2_beta_public_results() from public;
grant execute on function public.get_v2_beta_public_results() to anon, authenticated;

create or replace function public.submit_v2_beta_claim(
  p_player_id text, p_nickname text, p_discord_id text, p_event_type text,
  p_locale text, p_proof_links jsonb, p_screenshot_path text default null
)
returns table(id uuid, reference_code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_reference text;
  v_count int;
  v_claim_date date := (now() at time zone 'Asia/Manila')::date;
  v_normalized_links text[];
  v_duplicate_refs text[] := '{}'::text[];
begin
  if not coalesce((select enabled from public.v2_beta_claim_settings where v2_beta_claim_settings.id = true), false) then raise exception 'Beta claims are currently closed.'; end if;
  if length(trim(coalesce(p_player_id,''))) < 2 or length(trim(coalesce(p_nickname,''))) < 2 then raise exception 'Valid V2 Player ID and nickname are required.'; end if;
  if coalesce(p_discord_id,'') !~ '^[A-Za-z0-9._-]{2,64}$' then raise exception 'A valid Discord ID or username is required.'; end if;
  if p_event_type not in ('share_fb','invite_discord','share_livestream') or p_locale not in ('en','ko','th','pt','zh-TW','ru') then raise exception 'Invalid event selection.'; end if;
  if jsonb_typeof(p_proof_links) <> 'array' then raise exception 'Proof links are required.'; end if;
  select count(*) into v_count from jsonb_array_elements_text(p_proof_links) x where x ~* '^https?://';
  if (p_event_type = 'share_fb' and (v_count <> 5 or (select count(distinct public.normalize_v2_beta_proof_url(value)) from jsonb_array_elements_text(p_proof_links)) <> 5))
     or (p_event_type in ('invite_discord','share_livestream') and v_count <> 1) then raise exception 'Complete and unique proof links are required.'; end if;
  if p_event_type = 'invite_discord' and (coalesce(p_screenshot_path,'') = '' or not exists (select 1 from storage.objects where bucket_id='v2-beta-proofs' and name=p_screenshot_path)) then raise exception 'Invite Tracker screenshot is required.'; end if;
  if p_event_type <> 'invite_discord' and p_screenshot_path is not null then raise exception 'Unexpected screenshot.'; end if;
  if exists (select 1 from public.v2_beta_claims c where c.event_type=p_event_type and c.claim_date=v_claim_date and (lower(trim(c.player_id))=lower(trim(p_player_id)) or lower(trim(c.discord_id))=lower(trim(p_discord_id)))) then raise exception 'You already submitted this event today. You may submit it again after midnight GMT+8.'; end if;
  select array_agg(distinct public.normalize_v2_beta_proof_url(value))
    into v_normalized_links
    from jsonb_array_elements_text(p_proof_links);
  select coalesce(array_agg(distinct c.reference_code), '{}'::text[])
    into v_duplicate_refs
    from public.v2_beta_claims c
    cross join lateral jsonb_array_elements_text(c.proof_links) existing_link(value)
   where lower(trim(c.player_id)) <> lower(trim(p_player_id))
     and public.normalize_v2_beta_proof_url(existing_link.value) = any(v_normalized_links);
  v_reference := 'V2-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.v2_beta_claims(reference_code,player_id,nickname,discord_id,event_type,locale,claim_date,proof_links,screenshot_path,duplicate_link_detected,duplicate_link_references)
  values(v_reference,trim(p_player_id),trim(p_nickname),p_discord_id,p_event_type,p_locale,v_claim_date,p_proof_links,p_screenshot_path,cardinality(v_duplicate_refs)>0,v_duplicate_refs)
  returning v2_beta_claims.id into v_id;
  if cardinality(v_duplicate_refs) > 0 then
    update public.v2_beta_claims c
       set duplicate_link_detected = true,
           duplicate_link_references = array(
             select distinct item
               from unnest(coalesce(c.duplicate_link_references, '{}'::text[]) || array[v_reference]) item
           ),
           updated_at = now()
     where c.reference_code = any(v_duplicate_refs);
  end if;
  return query select v_id, v_reference;
exception when unique_violation then raise exception 'You already submitted this event today. You may submit it again after midnight GMT+8.';
end; $$;
revoke all on function public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text) from public;
grant execute on function public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text) to anon, authenticated;

-- Database-level guard: the admin UI is not the only protection. A claim
-- cannot be approved when one of its proof URLs already belongs to an approved
-- claim submitted under a different Player ID.
create or replace function public.guard_v2_beta_duplicate_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and exists (
    select 1
      from public.v2_beta_claims other
      cross join lateral jsonb_array_elements_text(other.proof_links) other_link(value)
      cross join lateral jsonb_array_elements_text(new.proof_links) new_link(value)
     where other.id <> new.id
       and other.status = 'approved'
       and lower(trim(other.player_id)) <> lower(trim(new.player_id))
       and public.normalize_v2_beta_proof_url(other_link.value) = public.normalize_v2_beta_proof_url(new_link.value)
  ) then
    raise exception 'Approval blocked: a proof link is already used by an approved claim with a different Player ID.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_v2_beta_duplicate_approval_trigger on public.v2_beta_claims;
create trigger guard_v2_beta_duplicate_approval_trigger
before update of status on public.v2_beta_claims
for each row execute function public.guard_v2_beta_duplicate_approval();

-- Disable after beta:
-- update public.v2_beta_claim_settings set enabled = false, updated_at = now() where id = true;
-- Re-enable if needed:
-- update public.v2_beta_claim_settings set enabled = true, updated_at = now() where id = true;
