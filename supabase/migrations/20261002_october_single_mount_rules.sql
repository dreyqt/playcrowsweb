-- Supersedes the October three-mount promotion without deleting its audit data.
-- One White Tiger per normalized Player ID/server, shared by $100 and $500 tiers.
-- No $1,000 mount and no cumulative-spend mount are awarded after this migration.
-- Requires 20261001_october_mount_bonuses.sql and the existing fulfillment schema.
begin;

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

  if new.selected_package_id not in ('october-supply-100', 'october-supply-500') then
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

-- Remove retired entitlements only from outstanding orders; historical claim
-- rows and completed delivery text/evidence are retained for audit purposes.
update public.donations
set october_bonus_name = null, october_bonus_eligible = null,
    october_bonus_reserved_at = null, october_verified_total_usd = null
where selected_package_id in ('october-supply-50', 'october-supply-100', 'october-supply-500', 'october-supply-1000')
  and fulfillment_status <> 'delivered';

update public.donations
set event_bonus_key = null, event_bonus_name = null,
    event_bonus_eligible = null, event_bonus_reserved_at = null
where selected_package_id in ('october-supply-50', 'october-supply-1000')
  and fulfillment_status <> 'delivered';

-- Clear the known auto-generated retired mount suffixes from outstanding drafts.
-- Leave other staff text and all completed delivery evidence untouched.
update public.donations
set items_delivered = replace(replace(items_delivered,
      ' + Balian''s Battle Griffin (One-Time Event Bonus)', ''),
      ' + Nureddin''s Red Death (One-Time October $2,000 Bonus)', ''),
    fulfillment_notes = replace(replace(fulfillment_notes,
      ' + Balian''s Battle Griffin (One-Time Event Bonus)', ''),
      ' + Nureddin''s Red Death (One-Time October $2,000 Bonus)', '')
where selected_package_id in ('october-supply-50', 'october-supply-100', 'october-supply-500', 'october-supply-1000')
  and fulfillment_status <> 'delivered';

-- Previously purchased $100 packages also qualify. Preserve any existing Tiger
-- reservation; otherwise the earliest verified eligible order gets the reward.
-- For already-delivered packages this records a supplemental entitlement without
-- rewriting the original fulfillment evidence; staff must deliver it separately.
do $$
declare v_order record;
begin
  for v_order in
    select id from public.donations
    where selected_package_id in ('october-supply-100', 'october-supply-500')
      and payment_verified_at is not null and status <> 'rejected'
    order by payment_verified_at, created_at, id
  loop
    update public.donations set payment_verified_at = payment_verified_at where id = v_order.id;
  end loop;
end;
$$;

comment on table public.october_verified_purchase_totals is
  'Historical totals for the retired October cumulative promotion. No longer updated or used for new rewards.';
comment on table public.october_event_bonus_claims is
  'Current White Tiger reservations plus retained historical retired-mount audit entries. Only White Tiger is currently fulfillable.';

revoke all on function public.reserve_october_mount_bonuses() from public;
commit;
