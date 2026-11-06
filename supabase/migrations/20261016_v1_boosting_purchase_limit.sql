-- Each V1 Boosting tier may be purchased once per normalized PlayCrows Login ID.
-- Apply before the updated edge functions and frontend. V2 is unaffected.
-- Existing orders remain intact, including historical quantities and duplicates.
begin;

-- Keep writes from slipping between the historical seed and trigger installation.
lock table public.donations in share row exclusive mode;

create table if not exists public.v1_boosting_limit_settings (
  singleton boolean primary key default true check (singleton),
  effective_at timestamptz not null default clock_timestamp()
);
insert into public.v1_boosting_limit_settings(singleton) values (true) on conflict do nothing;

create table if not exists public.v1_boosting_purchase_claims (
  player_id_normalized text not null,
  package_id text not null check (package_id in ('boosting-50','boosting-200','boosting-500','boosting-1000')),
  source_donation_id uuid,
  paypal_order_id text,
  consumed boolean not null default false,
  reserved_at timestamptz not null default now(),
  primary key (player_id_normalized, package_id),
  check (player_id_normalized <> '')
);
create unique index if not exists v1_boosting_purchase_claims_paypal_order_uidx
  on public.v1_boosting_purchase_claims(paypal_order_id) where paypal_order_id is not null;

-- A claim row is retained when released; row locks serialize manual submissions,
-- PayPal captures, review transitions and retries against the same account/tier.
create or replace function public.lock_v1_boosting_claim(p_player_id text, p_package_id text)
returns public.v1_boosting_purchase_claims
language plpgsql security definer set search_path = public
as $$
declare v_player text; v_claim public.v1_boosting_purchase_claims;
begin
  v_player := public.normalize_playcrows_player_id(p_player_id);
  if coalesce(v_player, '') = '' or p_package_id is null
     or p_package_id not in ('boosting-50','boosting-200','boosting-500','boosting-1000') then
    raise exception 'Invalid V1 Boosting account or package.';
  end if;
  insert into public.v1_boosting_purchase_claims(player_id_normalized,package_id)
    values(v_player,p_package_id) on conflict do nothing;
  select * into v_claim from public.v1_boosting_purchase_claims
    where player_id_normalized=v_player and package_id=p_package_id for update;
  return v_claim;
end;
$$;

create or replace function public.check_v1_boosting_eligibility(
  p_player_id text, p_package_id text, p_paypal_order_id text default null)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(public.normalize_playcrows_player_id(p_player_id),'') <> ''
    and p_package_id in ('boosting-50','boosting-200','boosting-500','boosting-1000')
    and not exists (
      select 1 from public.v1_boosting_purchase_claims c
      where c.player_id_normalized=public.normalize_playcrows_player_id(p_player_id)
        and c.package_id=p_package_id
        and (c.consumed or c.source_donation_id is not null or c.paypal_order_id is not null)
        and (p_paypal_order_id is null or c.paypal_order_id is distinct from p_paypal_order_id)
    );
$$;

create or replace function public.reserve_v1_boosting_paypal(
  p_player_id text, p_package_id text, p_paypal_order_id text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_claim public.v1_boosting_purchase_claims;
begin
  if coalesce(p_paypal_order_id,'') !~ '^[A-Za-z0-9]+$' then
    raise exception 'Invalid PayPal order ID.';
  end if;
  v_claim := public.lock_v1_boosting_claim(p_player_id,p_package_id);
  if v_claim.paypal_order_id = p_paypal_order_id then return; end if;
  if v_claim.consumed or v_claim.source_donation_id is not null or v_claim.paypal_order_id is not null then
    raise exception 'V1_BOOSTING_LIMIT: Each V1 Boosting package can be purchased only once per account. This tier is already purchased or awaiting payment review.';
  end if;
  update public.v1_boosting_purchase_claims set paypal_order_id=p_paypal_order_id,reserved_at=now()
    where player_id_normalized=v_claim.player_id_normalized and package_id=v_claim.package_id;
end;
$$;

-- A known unpaid manual rejection releases its hold. Any verification or delivery
-- consumes the claim permanently, even if an administrator later clears a field.
-- If old duplicate pending orders exist, the remaining order keeps the hold.
create or replace function public.release_v1_boosting_donation_claim(
  p_player_id text, p_package_id text, p_donation_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_claim public.v1_boosting_purchase_claims; v_replacement public.donations;
begin
  v_claim := public.lock_v1_boosting_claim(p_player_id,p_package_id);
  if v_claim.consumed or v_claim.source_donation_id is distinct from p_donation_id then return; end if;
  select * into v_replacement from public.donations d
    where d.id <> p_donation_id and d.server='v1' and d.selected_package_id=p_package_id
      and public.normalize_playcrows_player_id(d.player_id)=v_claim.player_id_normalized
      and (d.status <> 'rejected' or d.payment_verified_at is not null or d.fulfillment_status='delivered')
    order by (d.payment_verified_at is not null or d.fulfillment_status='delivered') desc,d.created_at,d.id limit 1;
  update public.v1_boosting_purchase_claims set source_donation_id=v_replacement.id,
    paypal_order_id=v_replacement.paypal_order_id,
    consumed=coalesce(v_replacement.payment_verified_at is not null or v_replacement.fulfillment_status='delivered',false),
    reserved_at=now()
    where player_id_normalized=v_claim.player_id_normalized and package_id=v_claim.package_id;
end;
$$;

create or replace function public.guard_v1_boosting_purchase()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_claim public.v1_boosting_purchase_claims;
  v_effective timestamptz;
  v_same_identity boolean := false;
  v_historical boolean := false;
  v_consumed boolean;
  v_old_consumed boolean := false;
begin
  select effective_at into v_effective from public.v1_boosting_limit_settings where singleton;
  if tg_op in ('UPDATE','DELETE') then
    v_old_consumed := old.payment_verified_at is not null or old.fulfillment_status='delivered';
    if tg_op='UPDATE' then
      v_same_identity := row(new.server,public.normalize_playcrows_player_id(new.player_id),new.selected_package_id,new.package_quantity)
        is not distinct from row(old.server,public.normalize_playcrows_player_id(old.player_id),old.selected_package_id,old.package_quantity);
    end if;
    if old.server='v1' and old.selected_package_id in ('boosting-50','boosting-200','boosting-500','boosting-1000') then
      if v_old_consumed then
        v_claim := public.lock_v1_boosting_claim(old.player_id,old.selected_package_id);
        update public.v1_boosting_purchase_claims set consumed=true
          where player_id_normalized=v_claim.player_id_normalized and package_id=v_claim.package_id;
      end if;
      if tg_op='DELETE' or not v_same_identity then
        perform public.release_v1_boosting_donation_claim(old.player_id,old.selected_package_id,old.id);
      end if;
    end if;
    if tg_op='DELETE' then return old; end if;
    v_historical := v_same_identity and (old.status <> 'rejected' or v_old_consumed)
      and (old.created_at < v_effective or (old.payment_method='paypal'
        and old.paypal_capture_id is not null and old.paypal_order_id is not null
        and old.payment_verified_at < v_effective));
  end if;
  if new.server <> 'v1' or new.selected_package_id is null
     or new.selected_package_id not in ('boosting-50','boosting-200','boosting-500','boosting-1000') then return new; end if;

  -- Recovery/late submission of a PayPal payment made before this rule is allowed.
  -- Only trusted server handlers set payment_verified_at from PayPal evidence.
  if tg_op='INSERT' and new.payment_method='paypal' and new.paypal_capture_id is not null
    and new.paypal_order_id is not null and new.payment_verified_at < v_effective then
    v_historical := true;
  end if;
  if not v_historical and new.package_quantity is distinct from 1
    and not (v_same_identity and new.status='rejected' and new.payment_verified_at is null
      and new.fulfillment_status <> 'delivered') then
    raise exception 'V1_BOOSTING_LIMIT: Each V1 Boosting package is limited to quantity 1 and one purchase per account.';
  end if;
  v_claim := public.lock_v1_boosting_claim(new.player_id,new.selected_package_id);
  v_consumed := new.payment_verified_at is not null or new.fulfillment_status='delivered'
    or (v_same_identity and v_old_consumed);

  if new.status='rejected' and not v_consumed then
    perform public.release_v1_boosting_donation_claim(new.player_id,new.selected_package_id,new.id);
    return new;
  end if;
  if v_claim.source_donation_id=new.id or
    (v_claim.source_donation_id is null and v_claim.paypal_order_id is not null and v_claim.paypal_order_id=new.paypal_order_id) or
    (not v_claim.consumed and v_claim.source_donation_id is null and v_claim.paypal_order_id is null) then
    update public.v1_boosting_purchase_claims set source_donation_id=new.id,
      paypal_order_id=coalesce(v_claim.paypal_order_id,new.paypal_order_id),
      consumed=v_claim.consumed or v_consumed,reserved_at=now()
      where player_id_normalized=v_claim.player_id_normalized and package_id=v_claim.package_id;
  elsif v_historical then
    update public.v1_boosting_purchase_claims set consumed=v_claim.consumed or v_consumed
      where player_id_normalized=v_claim.player_id_normalized and package_id=v_claim.package_id;
  else
    raise exception 'V1_BOOSTING_LIMIT: Each V1 Boosting package can be purchased only once per account. This tier is already purchased or awaiting payment review.';
  end if;
  return new;
end;
$$;

-- Seed one ledger key for all historical active/paid orders, including duplicates.
-- This does not edit their quantities, rewards, accounting or review state.
insert into public.v1_boosting_purchase_claims(player_id_normalized,package_id,source_donation_id,paypal_order_id,consumed)
select distinct on (public.normalize_playcrows_player_id(d.player_id),d.selected_package_id)
  public.normalize_playcrows_player_id(d.player_id),d.selected_package_id,d.id,d.paypal_order_id,
  d.payment_verified_at is not null or d.fulfillment_status='delivered'
from public.donations d
where d.server='v1' and d.selected_package_id in ('boosting-50','boosting-200','boosting-500','boosting-1000')
  and coalesce(public.normalize_playcrows_player_id(d.player_id),'') <> ''
  and (d.status <> 'rejected' or d.payment_verified_at is not null or d.fulfillment_status='delivered')
order by public.normalize_playcrows_player_id(d.player_id),d.selected_package_id,
  (d.payment_verified_at is not null or d.fulfillment_status='delivered') desc,d.created_at,d.id
on conflict (player_id_normalized,package_id) do nothing;

drop trigger if exists donations_guard_v1_boosting_purchase on public.donations;
create trigger donations_guard_v1_boosting_purchase before insert or update or delete on public.donations
for each row execute function public.guard_v1_boosting_purchase();

alter table public.v1_boosting_purchase_claims enable row level security;
alter table public.v1_boosting_limit_settings enable row level security;
revoke all on public.v1_boosting_purchase_claims, public.v1_boosting_limit_settings from anon,authenticated;
revoke all on function public.lock_v1_boosting_claim(text,text),
  public.check_v1_boosting_eligibility(text,text,text), public.reserve_v1_boosting_paypal(text,text,text),
  public.release_v1_boosting_donation_claim(text,text,uuid), public.guard_v1_boosting_purchase() from public,anon,authenticated;
grant execute on function public.check_v1_boosting_eligibility(text,text,text),
  public.reserve_v1_boosting_paypal(text,text,text) to service_role;

comment on table public.v1_boosting_purchase_claims is
  'One purchase per normalized Login ID per V1 Boosting tier. PayPal holds start before capture and do not expire automatically: ambiguous payments require provider reconciliation before an administrator releases a hold.';
commit;
