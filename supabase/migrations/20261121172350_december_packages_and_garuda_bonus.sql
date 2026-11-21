-- Apply before deploying December checkout/admin code. No campaign date gate:
-- "December" identifies the package family, including pre-December sales.
-- Garuda is once per normalized V1 Login ID, at $2,500 in VERIFIED LIST PRICE.
-- Cash discounts/currency conversion never change this campaign's credit.
begin;
lock table public.donations in share row exclusive mode;

create schema if not exists december_bonus_private;
revoke all on schema december_bonus_private from public, anon, authenticated;

create table december_bonus_private.settings (
  singleton boolean primary key default true check (singleton),
  retired_months_at timestamptz not null default clock_timestamp()
);
insert into december_bonus_private.settings(singleton) values(true);

alter table public.donations
  add column if not exists december_bonus_name text,
  add column if not exists december_bonus_eligible boolean,
  add column if not exists december_verified_total_usd numeric(14,2),
  add column if not exists december_bonus_reserved_at timestamptz;

create table december_bonus_private.purchase_credits (
  source_donation_id uuid primary key,
  player_id_normalized text not null check (player_id_normalized <> ''),
  package_id text not null check (package_id in
    ('december-supply-50','december-supply-100','december-supply-200','december-supply-500','december-supply-1000')),
  package_quantity integer not null check (package_quantity between 1 and 999),
  credit_usd numeric(14,2) not null check (credit_usd > 0),
  active boolean not null,
  verified_at timestamptz not null,
  paypal_order_id text unique,
  paypal_capture_id text unique,
  paddle_transaction_id text unique
);
create index december_purchase_player_idx on december_bonus_private.purchase_credits(player_id_normalized);

create table december_bonus_private.player_totals (
  player_id_normalized text primary key check (player_id_normalized <> ''),
  total_usd numeric(14,2) not null default 0 check (total_usd >= 0)
);
create table december_bonus_private.reward_claims (
  player_id_normalized text primary key references december_bonus_private.player_totals(player_id_normalized),
  source_donation_id uuid unique,
  reserved_at timestamptz,
  delivered_at timestamptz,
  check (delivered_at is null or source_donation_id is not null)
);

-- A standalone private trigger is not an RPC. Table RLS determines who may
-- verify/reject payments; callers cannot directly edit the ledger or claims.
create function december_bonus_private.process_donation()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_player text;
  v_unit numeric;
  v_total numeric;
  v_delta numeric := 0;
  v_active boolean := false;
  v_credit december_bonus_private.purchase_credits;
  v_claim december_bonus_private.reward_claims;
  v_retired_at timestamptz;
  v_metadata_only boolean := false;
  v_is_december boolean := false;
  v_eligible boolean := false;
begin
  if tg_op <> 'DELETE' then
    -- Existing historical orders can still be reviewed/fulfilled. New stale
    -- monthly orders are rejected, except recovery of a provider payment that
    -- was already captured before this retirement became effective.
    if new.selected_package_id ~ '^(september|october|november)-supply-' then
      if tg_op = 'INSERT' or row(new.server,new.player_id,new.selected_package_id,new.selected_package_amount,new.package_quantity,new.amount,new.currency)
        is distinct from row(old.server,old.player_id,old.selected_package_id,old.selected_package_amount,old.package_quantity,old.amount,old.currency) then
        select retired_months_at into v_retired_at from december_bonus_private.settings where singleton;
        if (new.payment_verified_at < v_retired_at and
          ((new.payment_method='paypal' and new.paypal_order_id is not null and new.paypal_capture_id is not null)
           or (new.payment_method='paddle' and new.paddle_transaction_id is not null))) is not true then
          raise exception 'PACKAGE_RETIRED: This monthly package is no longer available.';
        end if;
      end if;
    end if;
    v_is_december := coalesce(new.selected_package_id like 'december-supply-%',false);
  end if;

  if tg_op in ('UPDATE','DELETE') then
    select * into v_credit from december_bonus_private.purchase_credits where source_donation_id=old.id;
    if v_credit.source_donation_id is not null and tg_op='UPDATE' and
      row(new.server,public.normalize_playcrows_player_id(new.player_id),new.selected_package_id,new.selected_package_amount,new.package_quantity,
          new.amount,new.currency,new.payment_method,new.paypal_order_id,new.paypal_capture_id,new.paddle_transaction_id)
      is distinct from
      row(old.server,public.normalize_playcrows_player_id(old.player_id),old.selected_package_id,old.selected_package_amount,old.package_quantity,
          old.amount,old.currency,old.payment_method,old.paypal_order_id,old.paypal_capture_id,old.paddle_transaction_id) then
      raise exception 'Verified December purchase identity, price, quantity and payment evidence are immutable; reject/reconcile the original order instead.';
    end if;
    if tg_op='UPDATE' then
      v_metadata_only := row(new.server,new.player_id,new.selected_package_id,new.selected_package_amount,new.package_quantity,
        new.amount,new.currency,new.payment_method,new.paypal_order_id,new.paypal_capture_id,new.paddle_transaction_id,
        new.payment_verified_at,new.status,new.fulfillment_status)
        is not distinct from row(old.server,old.player_id,old.selected_package_id,old.selected_package_amount,old.package_quantity,
        old.amount,old.currency,old.payment_method,old.paypal_order_id,old.paypal_capture_id,old.paddle_transaction_id,
        old.payment_verified_at,old.status,old.fulfillment_status);
      if old.fulfillment_status='delivered' and old.december_bonus_eligible is true and
        row(new.fulfillment_status,new.items_delivered,new.fulfilled_at,new.delivered_to,new.fulfilled_by,
          new.fulfillment_evidence_path,new.fulfillment_evidence_name,new.fulfillment_evidence_mime_type,new.fulfillment_evidence_size_bytes)
        is distinct from row(old.fulfillment_status,old.items_delivered,old.fulfilled_at,old.delivered_to,old.fulfilled_by,
          old.fulfillment_evidence_path,old.fulfillment_evidence_name,old.fulfillment_evidence_mime_type,old.fulfillment_evidence_size_bytes) then
        raise exception 'Delivered December reward evidence is immutable.';
      end if;
    end if;
  end if;

  if not v_is_december and v_credit.source_donation_id is null then
    if tg_op='DELETE' then return old; end if;
    new.december_bonus_name := null; new.december_bonus_eligible := null;
    new.december_verified_total_usd := null; new.december_bonus_reserved_at := null;
    return new;
  end if;

  if tg_op <> 'DELETE' then
    v_unit := case new.selected_package_id when 'december-supply-50' then 50 when 'december-supply-100' then 100
      when 'december-supply-200' then 200 when 'december-supply-500' then 500 when 'december-supply-1000' then 1000 end;
    v_player := public.normalize_playcrows_player_id(new.player_id);
    if new.server is distinct from 'v1' or v_unit is null or coalesce(v_player,'')=''
      or new.selected_package_title is distinct from 'DECEMBER PACKAGE'
      or new.selected_package_amount is distinct from v_unit
      or new.package_quantity is null or new.package_quantity not between 1 and 999 then
      raise exception 'Invalid December package, server, price, title, account or quantity.';
    end if;
    v_active := new.payment_verified_at is not null and new.status <> 'rejected';
  else
    v_player := v_credit.player_id_normalized;
  end if;

  if not v_metadata_only then
    -- The row lock serializes all December writes for one normalized account.
    -- Ledger delta and reservation are in the same transaction as the donation.
    insert into december_bonus_private.player_totals(player_id_normalized) values(v_player) on conflict do nothing;
    select total_usd into v_total from december_bonus_private.player_totals where player_id_normalized=v_player for update;
    if v_active and v_credit.source_donation_id is null then
      insert into december_bonus_private.purchase_credits(source_donation_id,player_id_normalized,package_id,package_quantity,
        credit_usd,active,verified_at,paypal_order_id,paypal_capture_id,paddle_transaction_id)
      values(new.id,v_player,new.selected_package_id,new.package_quantity,v_unit*new.package_quantity,true,new.payment_verified_at,
        new.paypal_order_id,new.paypal_capture_id,new.paddle_transaction_id) returning * into v_credit;
      v_delta := v_credit.credit_usd;
    elsif v_credit.source_donation_id is not null and v_credit.active is distinct from v_active then
      v_delta := case when v_active then v_credit.credit_usd else -v_credit.credit_usd end;
      update december_bonus_private.purchase_credits set active=v_active where source_donation_id=v_credit.source_donation_id;
    end if;
    update december_bonus_private.player_totals set total_usd=total_usd+v_delta where player_id_normalized=v_player returning total_usd into v_total;
    insert into december_bonus_private.reward_claims(player_id_normalized) values(v_player) on conflict do nothing;
    select * into v_claim from december_bonus_private.reward_claims where player_id_normalized=v_player;

    if v_claim.delivered_at is null then
      if v_total < 2500 or not exists(select 1 from december_bonus_private.purchase_credits c
        where c.source_donation_id=v_claim.source_donation_id and c.active) then
        v_claim.source_donation_id := null; v_claim.reserved_at := null;
      end if;
      if v_claim.source_donation_id is null and v_total >= 2500 then
        if tg_op <> 'DELETE' and v_active and new.fulfillment_status <> 'delivered' then
          v_claim.source_donation_id := new.id;
        else
          select d.id into v_claim.source_donation_id from public.donations d
            join december_bonus_private.purchase_credits c on c.source_donation_id=d.id
            where c.player_id_normalized=v_player and c.active and d.fulfillment_status <> 'delivered'
              and d.id is distinct from case when tg_op='DELETE' then old.id else new.id end
            order by c.verified_at,d.created_at,d.id limit 1;
        end if;
        if v_claim.source_donation_id is not null then v_claim.reserved_at := clock_timestamp(); end if;
      end if;
      update december_bonus_private.reward_claims set source_donation_id=v_claim.source_donation_id,reserved_at=v_claim.reserved_at
        where player_id_normalized=v_player;
    end if;
  else
    select total_usd into v_total from december_bonus_private.player_totals where player_id_normalized=v_player;
    select * into v_claim from december_bonus_private.reward_claims where player_id_normalized=v_player;
  end if;

  if tg_op <> 'DELETE' then
    v_eligible := coalesce(v_claim.source_donation_id=new.id,false);
    if new.fulfillment_status='delivered' and (tg_op='INSERT' or old.fulfillment_status is distinct from 'delivered') then
      if tg_op='INSERT' or old.payment_verified_at is null or not v_active or
        coalesce(old.december_bonus_eligible,false) is distinct from v_eligible or
        (coalesce(new.items_delivered,'') ilike '%Garuda of Eternity Wings%') is distinct from v_eligible then
        raise exception 'DECEMBER_REVIEW_REQUIRED: Save payment verification and refresh the Garuda reservation before delivery; delivery items must match the current reservation.';
      end if;
      if v_eligible then
        update december_bonus_private.reward_claims set delivered_at=coalesce(delivered_at,clock_timestamp())
          where player_id_normalized=v_player returning * into v_claim;
      end if;
    end if;
    new.december_bonus_name := 'Garuda of Eternity Wings';
    new.december_bonus_eligible := case when v_eligible then true when new.payment_verified_at is null then null else false end;
    new.december_verified_total_usd := case when new.payment_verified_at is not null or v_credit.source_donation_id is not null then coalesce(v_total,0) else null end;
    new.december_bonus_reserved_at := case when v_eligible then v_claim.reserved_at else null end;
    if not v_eligible and new.fulfillment_status <> 'delivered' then
      new.items_delivered := replace(new.items_delivered,' + Garuda of Eternity Wings (One-Time December $2,500 Bonus)','');
    end if;
  end if;

  -- Never update a sibling donation while holding the player lock: concurrent
  -- reviews already hold their own donation row locks, which would deadlock.
  -- Other order snapshots refresh on their next review; fulfillment always
  -- checks the authoritative claim under the player lock above.
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function december_bonus_private.process_donation() from public,anon,authenticated;
create trigger donations_zz_december_bonus before insert or update or delete on public.donations
  for each row execute function december_bonus_private.process_donation();

alter table december_bonus_private.settings enable row level security;
alter table december_bonus_private.purchase_credits enable row level security;
alter table december_bonus_private.player_totals enable row level security;
alter table december_bonus_private.reward_claims enable row level security;
revoke all on all tables in schema december_bonus_private from public,anon,authenticated;

-- December is also an ordinary gift purchase for the separately managed mount
-- pre-order campaign. Historical catalog prices remain for completed recovery.
insert into mount_preorder_private.package_catalog(package_id,unit_price_usd) values
  ('december-supply-50',50),('december-supply-100',100),('december-supply-200',200),
  ('december-supply-500',500),('december-supply-1000',1000)
on conflict(package_id) do update set unit_price_usd=excluded.unit_price_usd;

comment on column public.donations.december_verified_total_usd is
  'Verified December LIST PRICE total recorded on the latest review of this order. Discounts are ignored; rejected/deleted orders are excluded. This is not a live balance.';
comment on table december_bonus_private.reward_claims is
  'One Garuda per normalized V1 Login ID. Undelivered reservations reverse when eligibility is lost; delivered claims remain permanently consumed and auditable even after rejection/deletion.';
notify pgrst, 'reload schema';
commit;
