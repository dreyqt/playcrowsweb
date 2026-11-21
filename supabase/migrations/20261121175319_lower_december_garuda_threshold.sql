-- Reduce the Garuda milestone to $1,500 without rewriting the original migration.
-- Existing verified December purchases count at full listed USD value.
-- Package delivery and the one-time bonus delivery are separate facts: an old
-- delivered package can become eligible now, without rewriting its evidence.
begin;
lock table public.donations in access exclusive mode;

alter table public.donations add column if not exists december_bonus_delivered_at timestamptz;
alter table december_bonus_private.reward_claims add column if not exists delivered_by uuid;

create or replace function december_bonus_private.process_donation()
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
    new.december_bonus_delivered_at := null;
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
      if v_total < 1500 or not exists(select 1 from december_bonus_private.purchase_credits c
        where c.source_donation_id=v_claim.source_donation_id and c.active) then
        v_claim.source_donation_id := null; v_claim.reserved_at := null;
      end if;
      if v_claim.source_donation_id is null and v_total >= 1500 then
        if tg_op <> 'DELETE' and v_active then
          v_claim.source_donation_id := new.id;
        else
          select d.id into v_claim.source_donation_id from public.donations d
            join december_bonus_private.purchase_credits c on c.source_donation_id=d.id
            where c.player_id_normalized=v_player and c.active and d.payment_verified_at is not null and d.status <> 'rejected'
              and d.id is distinct from case when tg_op='DELETE' then old.id else new.id end
            order by (d.fulfillment_status='delivered'),c.verified_at,d.created_at,d.id limit 1;
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
        update december_bonus_private.reward_claims set delivered_at=coalesce(delivered_at,clock_timestamp()),delivered_by=coalesce(delivered_by,auth.uid())
          where player_id_normalized=v_player returning * into v_claim;
      end if;
    end if;
    new.december_bonus_name := 'Garuda of Eternity Wings';
    new.december_bonus_eligible := case when v_eligible then true when new.payment_verified_at is null then null else false end;
    new.december_verified_total_usd := case when new.payment_verified_at is not null or v_credit.source_donation_id is not null then coalesce(v_total,0) else null end;
    new.december_bonus_reserved_at := case when v_eligible then v_claim.reserved_at else null end;
    new.december_bonus_delivered_at := case when v_eligible then v_claim.delivered_at else null end;
    if new.fulfillment_status <> 'delivered' then
      new.items_delivered := replace(new.items_delivered,
        ' + Garuda of Eternity Wings (One-Time December $2,500 Bonus)',
        ' + Garuda of Eternity Wings (One-Time December $1,500 Bonus)');
      if not v_eligible then
        new.items_delivered := replace(new.items_delivered,' + Garuda of Eternity Wings (One-Time December $1,500 Bonus)','');
      end if;
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

-- Serialize with all normal per-account accounting. Prefer an unfulfilled order,
-- but reserve against a completed package if it is the only qualifying source.
-- An already-delivered Garuda remains consumed, including deleted source orders.
do $$
declare
  v_total record;
  v_claim december_bonus_private.reward_claims;
  v_source uuid;
begin
  for v_total in select * from december_bonus_private.player_totals order by player_id_normalized for update loop
    insert into december_bonus_private.reward_claims(player_id_normalized) values(v_total.player_id_normalized) on conflict do nothing;
    select * into v_claim from december_bonus_private.reward_claims where player_id_normalized=v_total.player_id_normalized;
    if v_claim.delivered_at is not null then continue; end if;
    v_source := null;
    if v_total.total_usd >= 1500 then
      select d.id into v_source
        from public.donations d join december_bonus_private.purchase_credits c on c.source_donation_id=d.id
        where c.player_id_normalized=v_total.player_id_normalized and c.active
          and d.server='v1' and d.payment_verified_at is not null and d.status <> 'rejected'
        order by (d.id=v_claim.source_donation_id) desc nulls last,
          (d.fulfillment_status='delivered'), c.verified_at,d.created_at,d.id limit 1;
    end if;
    update december_bonus_private.reward_claims
      set source_donation_id=v_source,
        reserved_at=case when v_source is null then null when v_source=v_claim.source_donation_id then v_claim.reserved_at else clock_timestamp() end
      where player_id_normalized=v_total.player_id_normalized;
  end loop;
end;
$$;

-- Snapshot refresh runs the replacement trigger in metadata-only mode. It does
-- not replay purchase credit, mark bonuses delivered or change completed evidence.
update public.donations set december_bonus_delivered_at=december_bonus_delivered_at
where server='v1' and selected_package_id in
  ('december-supply-50','december-supply-100','december-supply-200','december-supply-500','december-supply-1000');

-- The existing order workflow records Garuda alongside a newly delivered pack.
-- This admin-only action records a supplemental Garuda for an ALREADY delivered
-- package that became eligible after the threshold reduction. No new purchase
-- and no rewriting of the original package screenshot/text are needed.
create or replace function public.mark_december_bonus_delivered(p_donation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_donation public.donations;
  v_player text;
  v_total numeric;
  v_claim december_bonus_private.reward_claims;
  v_result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.admin_users where user_id=auth.uid()) then
    raise exception 'Administrator access required.';
  end if;
  -- Same lock order as normal donation writes: source donation, then account.
  select * into v_donation from public.donations where id=p_donation_id for update;
  if not found or v_donation.server is distinct from 'v1' or
    v_donation.selected_package_id not in ('december-supply-50','december-supply-100','december-supply-200','december-supply-500','december-supply-1000') then
    raise exception 'December order not found.';
  end if;
  v_player := public.normalize_playcrows_player_id(v_donation.player_id);
  select total_usd into v_total from december_bonus_private.player_totals where player_id_normalized=v_player for update;
  select * into v_claim from december_bonus_private.reward_claims where player_id_normalized=v_player;
  if v_claim.source_donation_id is distinct from p_donation_id then
    raise exception 'Garuda is not reserved for this order. Save Review and refresh eligibility.';
  end if;
  if v_claim.delivered_at is not null then return to_jsonb(v_donation); end if;
  if v_donation.fulfillment_status is distinct from 'delivered' then
    raise exception 'Use the package delivery workflow for an undelivered package.';
  end if;
  if coalesce(v_total,0) < 1500 or v_donation.payment_verified_at is null or v_donation.status='rejected' or
    not exists(select 1 from december_bonus_private.purchase_credits where source_donation_id=p_donation_id and active) then
    raise exception 'This player does not currently qualify for the December reward.';
  end if;
  update december_bonus_private.reward_claims set delivered_at=clock_timestamp(),delivered_by=auth.uid()
    where player_id_normalized=v_player returning * into v_claim;
  update public.donations set december_bonus_delivered_at=v_claim.delivered_at
    where id=p_donation_id returning to_jsonb(donations.*) into v_result;
  return v_result;
end;
$$;
revoke all on function public.mark_december_bonus_delivered(uuid) from public,anon,authenticated;
grant execute on function public.mark_december_bonus_delivered(uuid) to authenticated;
comment on function public.mark_december_bonus_delivered(uuid) is
  'Admin-only idempotent supplemental Garuda delivery. Uses current $1,500 December eligibility and preserves package fulfillment evidence.';
comment on column public.donations.december_bonus_delivered_at is
  'Actual one-time Garuda delivery timestamp from the private claim, independent of ordinary package fulfillment.';
comment on table december_bonus_private.reward_claims is
  'One Garuda per normalized V1 Login ID at $1,500 verified December listed value. Undelivered claims can reverse; delivered claims stay consumed after rejection/deletion.';
notify pgrst, 'reload schema';
commit;
