-- October package mounts and the October-only $2,000 cumulative mount.
-- Entitlements are reserved once per normalized Player ID, server and mount.
-- Credits are immutable verified-payment receipts, like September reservations.
-- Apply after the September bonus and dual-server migrations, before deployment.

alter table public.donations
  add column if not exists october_bonus_name text,
  add column if not exists october_bonus_eligible boolean,
  add column if not exists october_verified_total_usd numeric,
  add column if not exists october_bonus_reserved_at timestamptz;

create table if not exists public.october_event_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  server text not null check (server in ('v1', 'v2')),
  player_id text not null,
  player_id_normalized text not null,
  bonus_key text not null check (bonus_key in (
    'white-tiger-of-manouille-i', 'balians-battle-griffin', 'nureddins-red-death'
  )),
  bonus_name text not null,
  source_donation_id uuid not null,
  source_reference_code text,
  reserved_at timestamptz not null default now(),
  reserved_by text not null default 'verified-payment',
  unique (server, player_id_normalized, bonus_key),
  unique (source_donation_id, bonus_key)
);

create table if not exists public.october_verified_purchase_credits (
  source_donation_id uuid primary key,
  server text not null check (server in ('v1', 'v2')),
  player_id_normalized text not null,
  package_id text not null check (package_id in (
    'october-supply-50', 'october-supply-100', 'october-supply-500', 'october-supply-1000'
  )),
  credit_usd numeric not null check (credit_usd > 0),
  verified_at timestamptz not null
);

create table if not exists public.october_verified_purchase_totals (
  server text not null check (server in ('v1', 'v2')),
  player_id_normalized text not null,
  total_usd numeric not null check (total_usd >= 0),
  primary key (server, player_id_normalized)
);

create or replace function public.reserve_october_mount_bonuses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_price numeric;
  v_quantity integer;
  v_player_norm text;
  v_credit_id uuid;
  v_total numeric;
  v_bonus_key text;
  v_bonus_name text;
  v_claim public.october_event_bonus_claims%rowtype;
begin
  if new.payment_verified_at is null or new.status = 'rejected' then
    return new;
  end if;

  v_unit_price := case new.selected_package_id
    when 'october-supply-50' then 50
    when 'october-supply-100' then 100
    when 'october-supply-500' then 500
    when 'october-supply-1000' then 1000
    else null
  end;
  if v_unit_price is null then
    return new;
  end if;

  v_player_norm := public.normalize_playcrows_player_id(new.player_id);
  if coalesce(v_player_norm, '') = '' then
    raise exception 'Player ID is required for October mount bonuses.';
  end if;
  v_quantity := coalesce(new.package_quantity, 1);
  if v_quantity < 1 then
    raise exception 'A positive package quantity is required for October mount bonuses.';
  end if;

  -- The fixed catalog price prevents submitted payment/currency fields from
  -- inflating progress. The donation primary key prevents retries counting twice.
  insert into public.october_verified_purchase_credits (
    source_donation_id, server, player_id_normalized, package_id, credit_usd, verified_at
  ) values (
    new.id, new.server, v_player_norm, new.selected_package_id,
    v_unit_price * v_quantity, new.payment_verified_at
  ) on conflict (source_donation_id) do nothing
  returning source_donation_id into v_credit_id;

  if v_credit_id is null then
    -- Keep the original per-order eligibility/progress snapshot on review edits.
    return new;
  end if;

  -- Atomic upsert serializes purchases for this player/server. Concurrent orders
  -- cannot lose credit or both miss the $2,000 crossing.
  insert into public.october_verified_purchase_totals as totals (
    server, player_id_normalized, total_usd
  ) values (new.server, v_player_norm, v_unit_price * v_quantity)
  on conflict (server, player_id_normalized) do update
    set total_usd = totals.total_usd + excluded.total_usd
  returning total_usd into v_total;

  v_bonus_key := case new.selected_package_id
    when 'october-supply-500' then 'white-tiger-of-manouille-i'
    when 'october-supply-1000' then 'balians-battle-griffin'
  end;
  v_bonus_name := case new.selected_package_id
    when 'october-supply-500' then 'The White Tiger of Manouille I'
    when 'october-supply-1000' then 'Balian''s Battle Griffin'
  end;

  if v_bonus_key is not null then
    insert into public.october_event_bonus_claims (
      server, player_id, player_id_normalized, bonus_key, bonus_name,
      source_donation_id, source_reference_code, reserved_by
    ) values (
      new.server, new.player_id, v_player_norm, v_bonus_key, v_bonus_name,
      new.id, new.reference_code, coalesce(auth.uid()::text, 'verified-payment')
    ) on conflict (server, player_id_normalized, bonus_key) do nothing;

    select * into v_claim from public.october_event_bonus_claims
    where server = new.server and player_id_normalized = v_player_norm and bonus_key = v_bonus_key;
    new.event_bonus_key := v_bonus_key;
    new.event_bonus_name := v_bonus_name;
    new.event_bonus_eligible := v_claim.source_donation_id = new.id;
    new.event_bonus_reserved_at := case when new.event_bonus_eligible then v_claim.reserved_at else null end;
  end if;

  new.october_verified_total_usd := v_total;
  new.october_bonus_name := 'Nureddin''s Red Death';
  new.october_bonus_eligible := false;
  new.october_bonus_reserved_at := null;
  if v_total >= 2000 then
    insert into public.october_event_bonus_claims (
      server, player_id, player_id_normalized, bonus_key, bonus_name,
      source_donation_id, source_reference_code, reserved_by
    ) values (
      new.server, new.player_id, v_player_norm, 'nureddins-red-death', 'Nureddin''s Red Death',
      new.id, new.reference_code, coalesce(auth.uid()::text, 'verified-payment')
    ) on conflict (server, player_id_normalized, bonus_key) do nothing;

    select * into v_claim from public.october_event_bonus_claims
    where server = new.server and player_id_normalized = v_player_norm and bonus_key = 'nureddins-red-death';
    new.october_bonus_eligible := v_claim.source_donation_id = new.id;
    new.october_bonus_reserved_at := case when new.october_bonus_eligible then v_claim.reserved_at else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reserve_october_mount_bonuses on public.donations;
create trigger trg_reserve_october_mount_bonuses
before insert or update of payment_verified_at, status on public.donations
for each row execute function public.reserve_october_mount_bonuses();

-- Replays safely in payment-verification order if deployed after sales begin.
do $$
declare v_order record;
begin
  for v_order in
    select id from public.donations
    where selected_package_id in ('october-supply-50', 'october-supply-100', 'october-supply-500', 'october-supply-1000')
      and payment_verified_at is not null and status <> 'rejected'
    order by payment_verified_at, created_at, id
  loop
    update public.donations set payment_verified_at = payment_verified_at where id = v_order.id;
  end loop;
end;
$$;

alter table public.october_event_bonus_claims enable row level security;
alter table public.october_verified_purchase_credits enable row level security;
alter table public.october_verified_purchase_totals enable row level security;

drop policy if exists "Admins can view October mount claims" on public.october_event_bonus_claims;
create policy "Admins can view October mount claims" on public.october_event_bonus_claims
for select to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "Admins can view October purchase credits" on public.october_verified_purchase_credits;
create policy "Admins can view October purchase credits" on public.october_verified_purchase_credits
for select to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "Admins can view October purchase totals" on public.october_verified_purchase_totals;
create policy "Admins can view October purchase totals" on public.october_verified_purchase_totals
for select to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

revoke all on public.october_event_bonus_claims, public.october_verified_purchase_credits, public.october_verified_purchase_totals from anon, authenticated;
grant select on public.october_event_bonus_claims, public.october_verified_purchase_credits, public.october_verified_purchase_totals to authenticated;
revoke all on function public.reserve_october_mount_bonuses() from public;

comment on column public.donations.october_verified_total_usd is
  'October-only verified package value for this Player ID/server at first verification of this order; not a live balance.';
