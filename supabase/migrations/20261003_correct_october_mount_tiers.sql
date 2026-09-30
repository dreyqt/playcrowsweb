-- Corrects the mistaken $100 eligibility to $1,000. Active tiers: $500 / $1,000.
-- Apply after 20261002_october_single_mount_rules.sql. Re-runnable.
-- Previously completed deliveries remain historical evidence; no clawback occurs.
begin;

-- Archive mistaken, not-yet-delivered $100 Tiger reservations before releasing
-- their shared claim slot. A later qualifying $500/$1,000 purchase can then win.
create table if not exists public.october_mount_rule_corrections (
  claim_id uuid primary key,
  server text not null,
  player_id text not null,
  player_id_normalized text not null,
  bonus_key text not null,
  bonus_name text not null,
  source_donation_id uuid not null,
  source_reference_code text,
  reserved_at timestamptz not null,
  reserved_by text not null,
  corrected_at timestamptz not null default now(),
  correction_reason text not null default 'Mistaken $100 eligibility corrected to $1,000'
);

insert into public.october_mount_rule_corrections (
  claim_id, server, player_id, player_id_normalized, bonus_key, bonus_name,
  source_donation_id, source_reference_code, reserved_at, reserved_by
)
select c.id, c.server, c.player_id, c.player_id_normalized, c.bonus_key, c.bonus_name,
  c.source_donation_id, c.source_reference_code, c.reserved_at, c.reserved_by
from public.october_event_bonus_claims c
join public.donations d on d.id = c.source_donation_id
where c.bonus_key = 'white-tiger-of-manouille-i'
  and d.selected_package_id = 'october-supply-100'
  and d.fulfillment_status <> 'delivered'
on conflict (claim_id) do nothing;

delete from public.october_event_bonus_claims c
using public.october_mount_rule_corrections a, public.donations d
where c.id = a.claim_id and d.id = c.source_donation_id
  and c.bonus_key = 'white-tiger-of-manouille-i'
  and d.selected_package_id = 'october-supply-100'
  and d.fulfillment_status <> 'delivered';

create or replace function public.reserve_october_mount_bonuses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_norm text;
  v_claim public.october_event_bonus_claims%rowtype;
begin
  if new.selected_package_id not in (
    'october-supply-50', 'october-supply-100', 'october-supply-500', 'october-supply-1000'
  ) or new.selected_package_id is null then
    return new;
  end if;

  -- Retain completed delivery evidence. Undelivered orders cannot carry forward
  -- the retired cumulative reward even when old eligibility data exists.
  if new.fulfillment_status <> 'delivered' then
    new.october_bonus_name := null;
    new.october_bonus_eligible := null;
    new.october_bonus_reserved_at := null;
    new.october_verified_total_usd := null;
  end if;

  if new.selected_package_id not in ('october-supply-500', 'october-supply-1000') then
    if new.fulfillment_status <> 'delivered' then
      new.event_bonus_key := null;
      new.event_bonus_name := null;
      new.event_bonus_eligible := null;
      new.event_bonus_reserved_at := null;
    end if;
    return new;
  end if;

  if new.payment_verified_at is null or new.status = 'rejected' then
    return new;
  end if;
  v_player_norm := public.normalize_playcrows_player_id(new.player_id);
  if coalesce(v_player_norm, '') = '' then
    raise exception 'Player ID is required for the October mount bonus.';
  end if;
  if coalesce(new.package_quantity, 1) < 1 then
    raise exception 'A positive package quantity is required for the October mount bonus.';
  end if;

  -- The same key for BOTH eligible tiers prevents a second Tiger from a different
  -- tier, repeated verification, concurrent orders or an earlier $500 claim.
  insert into public.october_event_bonus_claims (
    server, player_id, player_id_normalized, bonus_key, bonus_name,
    source_donation_id, source_reference_code, reserved_by
  ) values (
    new.server, new.player_id, v_player_norm, 'white-tiger-of-manouille-i',
    'The White Tiger of Manouille I', new.id, new.reference_code,
    coalesce(auth.uid()::text, 'verified-payment')
  ) on conflict (server, player_id_normalized, bonus_key) do nothing;

  select * into v_claim from public.october_event_bonus_claims
  where server = new.server and player_id_normalized = v_player_norm
    and bonus_key = 'white-tiger-of-manouille-i';

  new.event_bonus_key := 'white-tiger-of-manouille-i';
  new.event_bonus_name := 'The White Tiger of Manouille I';
  new.event_bonus_eligible := v_claim.source_donation_id = new.id;
  new.event_bonus_reserved_at := case when new.event_bonus_eligible then v_claim.reserved_at else null end;
  return new;
end;
$$;

-- Clear the mistaken $100 entitlement and generated draft text. Completed
-- delivery evidence and completed claim reservations are intentionally retained.
update public.donations
set event_bonus_key = null, event_bonus_name = null,
    event_bonus_eligible = null, event_bonus_reserved_at = null,
    items_delivered = replace(items_delivered,
      ' + The White Tiger of Manouille I (One-Time Event Bonus)', ''),
    fulfillment_notes = replace(fulfillment_notes,
      ' + The White Tiger of Manouille I (One-Time Event Bonus)', '')
where selected_package_id = 'october-supply-100' and fulfillment_status <> 'delivered';

-- Earlier verified $1,000 purchases now qualify. Keep existing $500 reservations;
-- otherwise the earliest qualifying order wins. Delivered packages may require
-- supplemental mount fulfillment without editing their original delivery evidence.
do $$
declare v_order record;
begin
  for v_order in
    select id from public.donations
    where selected_package_id in ('october-supply-500', 'october-supply-1000')
      and payment_verified_at is not null and status <> 'rejected'
    order by payment_verified_at, created_at, id
  loop
    update public.donations set payment_verified_at = payment_verified_at where id = v_order.id;
  end loop;
end;
$$;

alter table public.october_mount_rule_corrections enable row level security;
drop policy if exists "Admins can view October rule corrections" on public.october_mount_rule_corrections;
create policy "Admins can view October rule corrections" on public.october_mount_rule_corrections
for select to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
revoke all on public.october_mount_rule_corrections from anon, authenticated;
grant select on public.october_mount_rule_corrections to authenticated;
revoke all on function public.reserve_october_mount_bonuses() from public;
commit;
