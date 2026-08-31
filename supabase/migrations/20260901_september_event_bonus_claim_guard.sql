-- September 2026 one-time event bonus entitlement guard.
--
-- Rules:
--   * $500 September Supply Package -> Rare Monster Weapon Style SET (once per Player ID)
--   * $1,000 September Supply Package -> Epic Monster Weapon Style (once per Player ID)
--
-- The entitlement is locked when a payment becomes server/admin verified, not when
-- the package quantity is selected. A UNIQUE constraint makes duplicate claims
-- impossible even if two verified orders are processed at the same time.

create table if not exists public.september_event_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_id_normalized text not null,
  bonus_key text not null check (bonus_key in ('rare-monster-weapon-style-set', 'epic-monster-weapon-style')),
  bonus_name text not null,
  source_donation_id uuid not null,
  source_reference_code text,
  reserved_at timestamptz not null default now(),
  reserved_by text not null default 'verified-payment'
);

create unique index if not exists september_event_bonus_claims_player_bonus_uidx
  on public.september_event_bonus_claims (player_id_normalized, bonus_key);

create unique index if not exists september_event_bonus_claims_source_uidx
  on public.september_event_bonus_claims (source_donation_id, bonus_key);

alter table public.donations
  add column if not exists event_bonus_key text,
  add column if not exists event_bonus_name text,
  add column if not exists event_bonus_eligible boolean,
  add column if not exists event_bonus_reserved_at timestamptz;

create or replace function public.normalize_playcrows_player_id(value text)
returns text
language sql
immutable
strict
as $$
  select lower(regexp_replace(trim(value), '[[:space:]]+', '', 'g'));
$$;

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
  -- Only assign the entitlement when payment verification exists. This avoids
  -- unpaid/manual submissions reserving the one-time reward.
  if new.payment_verified_at is null then
    return new;
  end if;

  -- Do not recompute an order that already has an entitlement decision.
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
    player_id,
    player_id_normalized,
    bonus_key,
    bonus_name,
    source_donation_id,
    source_reference_code,
    reserved_at,
    reserved_by
  ) values (
    new.player_id,
    v_player_norm,
    v_bonus_key,
    v_bonus_name,
    new.id,
    new.reference_code,
    now(),
    coalesce(auth.uid()::text, 'verified-payment')
  )
  on conflict (player_id_normalized, bonus_key) do nothing
  returning id into v_claim_id;

  new.event_bonus_key := v_bonus_key;
  new.event_bonus_name := v_bonus_name;
  new.event_bonus_eligible := v_claim_id is not null;
  new.event_bonus_reserved_at := case when v_claim_id is not null then now() else null end;

  return new;
end;
$$;

drop trigger if exists trg_reserve_september_event_bonus on public.donations;
create trigger trg_reserve_september_event_bonus
before insert or update of payment_verified_at on public.donations
for each row
execute function public.reserve_september_event_bonus();

-- Backfill already-verified September orders if this migration is applied after
-- the event has started. The earliest verified order per Player ID / bonus wins.
with eligible_orders as (
  select
    d.id,
    d.reference_code,
    d.player_id,
    public.normalize_playcrows_player_id(d.player_id) as player_norm,
    case d.selected_package_id
      when 'september-supply-500' then 'rare-monster-weapon-style-set'
      when 'september-supply-1000' then 'epic-monster-weapon-style'
    end as bonus_key,
    case d.selected_package_id
      when 'september-supply-500' then 'Rare Monster Weapon Style SET'
      when 'september-supply-1000' then 'Epic Monster Weapon Style'
    end as bonus_name,
    coalesce(d.payment_verified_at, d.created_at) as verified_at
  from public.donations d
  where d.selected_package_id in ('september-supply-500', 'september-supply-1000')
    and d.payment_verified_at is not null
), winners as (
  select distinct on (player_norm, bonus_key)
    id, reference_code, player_id, player_norm, bonus_key, bonus_name, verified_at
  from eligible_orders
  where coalesce(player_norm, '') <> ''
  order by player_norm, bonus_key, verified_at asc, id asc
)
insert into public.september_event_bonus_claims (
  player_id, player_id_normalized, bonus_key, bonus_name,
  source_donation_id, source_reference_code, reserved_at, reserved_by
)
select
  player_id, player_norm, bonus_key, bonus_name,
  id, reference_code, verified_at, 'migration-backfill'
from winners
on conflict (player_id_normalized, bonus_key) do nothing;

-- Reflect the entitlement decision on every already-verified applicable donation.
update public.donations d
set
  event_bonus_key = case d.selected_package_id
    when 'september-supply-500' then 'rare-monster-weapon-style-set'
    when 'september-supply-1000' then 'epic-monster-weapon-style'
  end,
  event_bonus_name = case d.selected_package_id
    when 'september-supply-500' then 'Rare Monster Weapon Style SET'
    when 'september-supply-1000' then 'Epic Monster Weapon Style'
  end,
  event_bonus_eligible = exists (
    select 1
    from public.september_event_bonus_claims c
    where c.source_donation_id = d.id
      and c.bonus_key = case d.selected_package_id
        when 'september-supply-500' then 'rare-monster-weapon-style-set'
        when 'september-supply-1000' then 'epic-monster-weapon-style'
      end
  ),
  event_bonus_reserved_at = (
    select c.reserved_at
    from public.september_event_bonus_claims c
    where c.source_donation_id = d.id
      and c.bonus_key = case d.selected_package_id
        when 'september-supply-500' then 'rare-monster-weapon-style-set'
        when 'september-supply-1000' then 'epic-monster-weapon-style'
      end
    limit 1
  )
where d.selected_package_id in ('september-supply-500', 'september-supply-1000')
  and d.payment_verified_at is not null;

alter table public.september_event_bonus_claims enable row level security;

-- The admin dashboard can read the entitlement ledger. Writes are performed by
-- the database trigger, not by browser clients.
drop policy if exists "Admins can view September event bonus claims" on public.september_event_bonus_claims;
create policy "Admins can view September event bonus claims"
on public.september_event_bonus_claims
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  )
);

revoke insert, update, delete on public.september_event_bonus_claims from anon, authenticated;
grant select on public.september_event_bonus_claims to authenticated;
