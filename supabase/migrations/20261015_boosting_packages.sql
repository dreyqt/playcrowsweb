-- Boosting packages: keep cash paid, package face value and cumulative credit separate.
-- Apply before deploying the updated submission/recovery functions and admin UI.
-- Existing rows keep null credit so their historical accounting is not rewritten.
alter table public.donations
  add column if not exists cumulative_credit_usd numeric(14, 2),
  add column if not exists boosting_bonus_rewards jsonb not null default '[]'::jsonb;

alter table public.donations
  drop constraint if exists donations_cumulative_credit_usd_check;
alter table public.donations
  add constraint donations_cumulative_credit_usd_check check (cumulative_credit_usd >= 0);

create or replace function public.get_boosting_bonus_rewards(p_package_id text, p_quantity integer)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when p_quantity is null or p_quantity < 1 or p_quantity > 999 then '[]'::jsonb
    when p_package_id = 'boosting-500' then jsonb_build_array(
      jsonb_build_object('name', 'Golden Necklace Insignia (Attributed)', 'quantity', 4 * p_quantity),
      jsonb_build_object('name', 'Golden Ring Insignia (Attribution)', 'quantity', 4 * p_quantity)
    )
    when p_package_id = 'boosting-1000' then jsonb_build_array(
      jsonb_build_object('name', 'Gaspard''s Savage Greatsword (Bound)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Theophil''s Creed Spear (Bound)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Brandt''s Domination Twin Sword (Bound)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Alyn''s Illusion Longbow (Bound)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Johannes'' Motive Scepter (Bound)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Ludwig''s Straight Sword of Justice (Bound)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Clemens'' Freedom Dagger (Bound)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Zenesia''s Ruling Segum (Attributed)', 'quantity', p_quantity),
      jsonb_build_object('name', 'Eleanor''s Ambition Staff (Bound)', 'quantity', p_quantity)
    )
    else '[]'::jsonb
  end;
$$;

create or replace function public.set_donation_package_credit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_unit_amount numeric;
  v_quantity integer;
  v_base_credit numeric;
begin
  -- Status, verification and fulfillment edits must neither recalculate historical
  -- credit nor allow an arbitrary replacement of these server-derived snapshots.
  if tg_op = 'UPDATE' then
    if row(new.server, new.selected_package_id, new.selected_package_title,
           new.selected_package_amount, new.package_quantity, new.currency, new.amount)
       is not distinct from
       row(old.server, old.selected_package_id, old.selected_package_title,
           old.selected_package_amount, old.package_quantity, old.currency, old.amount) then
      new.cumulative_credit_usd := old.cumulative_credit_usd;
      new.boosting_bonus_rewards := old.boosting_bonus_rewards;
      return new;
    end if;
  end if;

  v_quantity := coalesce(new.package_quantity, 1);
  v_unit_amount := new.selected_package_amount;
  if new.selected_package_id like 'boosting-%' then
    v_unit_amount := case new.selected_package_id
      when 'boosting-50' then 50
      when 'boosting-200' then 200
      when 'boosting-500' then 500
      when 'boosting-1000' then 1000
      else null
    end;
    if v_unit_amount is null
       or new.server not in ('v1', 'v2') or new.server is null
       or new.package_quantity is null or new.package_quantity not between 1 and 999
       or new.selected_package_amount is distinct from v_unit_amount
       or new.selected_package_title is distinct from 'BOOSTING PACKAGE' then
      raise exception 'Invalid Boosting package, price, title, server or quantity.';
    end if;
  end if;

  -- Package face value remains the ordinary credit basis, even with a discount.
  -- Legacy records without package metadata use their recorded USD equivalent.
  v_base_credit := case when v_unit_amount is not null
    then v_unit_amount * greatest(v_quantity, 1)
    else new.amount / case new.currency when 'PHP' then 60 when 'GBP' then 0.79 else 1 end
  end;
  new.cumulative_credit_usd := round(v_base_credit * case
    when new.server = 'v2' and new.selected_package_id in
      ('boosting-50', 'boosting-200', 'boosting-500', 'boosting-1000') then 2
    else 1
  end, 2);
  new.boosting_bonus_rewards := public.get_boosting_bonus_rewards(new.selected_package_id, v_quantity);
  return new;
end;
$$;

drop trigger if exists donations_set_package_credit on public.donations;
create trigger donations_set_package_credit
before insert or update on public.donations
for each row execute function public.set_donation_package_credit();

comment on column public.donations.cumulative_credit_usd is
  'Full package value times quantity; V2 Boosting packages alone receive 2x. Separate from cash paid and event selections. Count only eligible verified orders; null retains historical fallback.';
comment on column public.donations.boosting_bonus_rewards is
  'Server-derived order-total reward snapshot: $500 gives both insignias x4 per package; $1000 gives all nine weapons x1 each per package. Grant only after payment verification; no weapon choice.';
