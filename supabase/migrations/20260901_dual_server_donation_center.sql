-- PlayCrows V1 / V2 donation-center separation.
-- Existing transactions are assigned to V1. New submissions must explicitly
-- choose a server and all one-time bonus claims are isolated per server.

alter table public.donations
  add column if not exists server text;

update public.donations
set server = 'v1'
where server is null or server not in ('v1', 'v2');

alter table public.donations
  alter column server set default 'v1',
  alter column server set not null;

alter table public.donations
  drop constraint if exists donations_server_check;

alter table public.donations
  add constraint donations_server_check check (server in ('v1', 'v2'));

create index if not exists donations_server_created_at_idx
  on public.donations (server, created_at desc);

-- Make the September one-time reward independent per server.
alter table public.september_event_bonus_claims
  add column if not exists server text;

update public.september_event_bonus_claims c
set server = coalesce(d.server, 'v1')
from public.donations d
where d.id = c.source_donation_id
  and (c.server is null or c.server not in ('v1', 'v2'));

update public.september_event_bonus_claims
set server = 'v1'
where server is null or server not in ('v1', 'v2');

alter table public.september_event_bonus_claims
  alter column server set default 'v1',
  alter column server set not null;

alter table public.september_event_bonus_claims
  drop constraint if exists september_event_bonus_claims_server_check;

alter table public.september_event_bonus_claims
  add constraint september_event_bonus_claims_server_check check (server in ('v1', 'v2'));

drop index if exists public.september_event_bonus_claims_player_bonus_uidx;

create unique index if not exists september_event_bonus_claims_server_player_bonus_uidx
  on public.september_event_bonus_claims (server, player_id_normalized, bonus_key);

create index if not exists september_event_bonus_claims_server_idx
  on public.september_event_bonus_claims (server, reserved_at desc);

create or replace function public.reserve_september_event_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus_key text;
  v_bonus_name text;
  v_player_norm text;
  v_claim_id uuid;
begin
  if new.payment_verified_at is null then
    return new;
  end if;

  if new.event_bonus_eligible is not null then
    return new;
  end if;

  if new.selected_package_id = 'september-supply-500' then
    v_bonus_key := 'rare-monster-weapon-style-set';
    v_bonus_name := 'Rare Monster Weapon Style SET';
  elsif new.selected_package_id = 'september-supply-1000' then
    v_bonus_key := 'epic-monster-weapon-style';
    v_bonus_name := 'Epic Monster Weapon Style';
  else
    return new;
  end if;

  v_player_norm := public.normalize_playcrows_player_id(new.player_id);
  if coalesce(v_player_norm, '') = '' then
    raise exception 'Player ID is required for the September one-time event bonus.';
  end if;

  insert into public.september_event_bonus_claims (
    server,
    player_id,
    player_id_normalized,
    bonus_key,
    bonus_name,
    source_donation_id,
    source_reference_code,
    reserved_at,
    reserved_by
  ) values (
    coalesce(new.server, 'v1'),
    new.player_id,
    v_player_norm,
    v_bonus_key,
    v_bonus_name,
    new.id,
    new.reference_code,
    now(),
    coalesce(auth.uid()::text, 'verified-payment')
  )
  on conflict (server, player_id_normalized, bonus_key) do nothing
  returning id into v_claim_id;

  new.event_bonus_key := v_bonus_key;
  new.event_bonus_name := v_bonus_name;
  new.event_bonus_eligible := v_claim_id is not null;
  new.event_bonus_reserved_at := case when v_claim_id is not null then now() else null end;

  return new;
end;
$$;

comment on column public.donations.server is
  'PlayCrows server targeted by this transaction: v1 or v2.';

comment on column public.september_event_bonus_claims.server is
  'Server scope for the one-time entitlement. The same Player ID may claim once on V1 and once on V2.';
