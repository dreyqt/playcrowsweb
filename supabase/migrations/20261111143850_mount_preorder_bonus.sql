-- Mount pre-orders are bonuses for new verified V1 gift-package purchases.
-- Install this migration BEFORE deploying the new shop. It starts disabled;
-- an authorized administrator launches it from the deployed admin panel.
-- No historical orders or existing September/October/package bonuses are changed.

create schema if not exists mount_preorder_private;
revoke all on schema mount_preorder_private from public, anon, authenticated;
grant usage on schema mount_preorder_private to authenticated;

create table public.mount_preorder_campaign (
  singleton boolean primary key default true check (singleton),
  active boolean not null default false,
  starts_at timestamptz,
  check (not active or starts_at is not null)
);
insert into public.mount_preorder_campaign (singleton) values (true);
alter table public.mount_preorder_campaign enable row level security;
revoke all on public.mount_preorder_campaign from public, anon, authenticated;
grant select on public.mount_preorder_campaign to anon, authenticated;
create policy "Read mount campaign launch status" on public.mount_preorder_campaign
  for select to anon, authenticated using (true);

-- Prices are copied from the server-side V1 catalog, never from submitted cash
-- amounts, reward quantities, or the older V2 cumulative-credit multiplier.
-- Add new gift-package IDs here whenever the server-side catalog expands.
create table mount_preorder_private.package_catalog (
  package_id text primary key,
  unit_price_usd numeric not null check (unit_price_usd > 0)
);
insert into mount_preorder_private.package_catalog (package_id, unit_price_usd) values
  ('november-supply-50',50), ('november-supply-100',100),
  ('november-supply-200',200), ('november-supply-500',500), ('november-supply-1000',1000),
  ('currency-5',5), ('currency-10',10), ('currency-50',50), ('currency-100',100),
  ('currency-200',200), ('currency-500',500), ('currency-1000',1000),
  ('support-skill-bundle',15), ('support-guild-bundle',20),
  ('support-job-advance',25), ('support-awakening',25), ('support-alchemy-pack',20),
  ('support-nc-gears-starter',100), ('support-4th-job-advance',200),
  ('support-change-character-name',200), ('support-intermediate-codex',100),
  ('support-blessing-exp',100), ('support-class-change-50',50),
  ('support-class-change-200',200), ('support-class-change-500',500),
  ('september-supply-50',50), ('september-supply-100',100),
  ('september-supply-500',500), ('september-supply-1000',1000),
  ('october-supply-50',50), ('october-supply-100',100),
  ('october-supply-500',500), ('october-supply-1000',1000),
  ('boosting-50',50), ('boosting-200',200), ('boosting-500',500), ('boosting-1000',1000);

create table mount_preorder_private.steps (
  step integer primary key check (step between 1 and 3),
  mount_key text not null unique,
  mount_name text not null,
  step_usd numeric not null,
  total_required_usd numeric not null
);
insert into mount_preorder_private.steps values
  (1,'rodrigos-flame-horse','Rodrigo''s Flame Horse',500,500),
  (2,'supreme-conquerors-qilin','Supreme Conqueror''s Qilin',1000,1500),
  (3,'golden-jackal-of-ramses-ii','Golden Jackal of Ramses II',2000,3500);

-- Immutable receipts deliberately survive donation deletion and review edits.
-- Provider IDs also prevent a deleted/reinserted paid order counting twice.
create table mount_preorder_private.purchase_credits (
  source_donation_id uuid primary key,
  player_id_normalized text not null check (player_id_normalized <> ''),
  package_id text not null references mount_preorder_private.package_catalog(package_id),
  package_quantity integer not null check (package_quantity between 1 and 999),
  unit_price_usd numeric not null check (unit_price_usd > 0),
  discount_percent numeric not null check (discount_percent >= 0 and discount_percent < 100),
  credit_usd numeric not null check (credit_usd > 0),
  order_created_at timestamptz not null,
  payment_verified_at timestamptz not null,
  credited_at timestamptz not null default clock_timestamp(),
  paypal_capture_id text unique,
  paddle_transaction_id text unique
);
create index mount_preorder_credits_player_idx
  on mount_preorder_private.purchase_credits (player_id_normalized);
create index mount_preorder_credits_package_idx
  on mount_preorder_private.purchase_credits (package_id);

create table mount_preorder_private.purchase_totals (
  player_id_normalized text primary key check (player_id_normalized <> ''),
  total_paid_usd numeric not null check (total_paid_usd > 0)
);

create table mount_preorder_private.reservations (
  player_id_normalized text not null references mount_preorder_private.purchase_totals(player_id_normalized),
  step integer not null references mount_preorder_private.steps(step),
  source_donation_id uuid not null references mount_preorder_private.purchase_credits(source_donation_id),
  reserved_at timestamptz not null default clock_timestamp(),
  delivered_at timestamptz,
  delivered_by uuid,
  primary key (player_id_normalized, step),
  check ((delivered_at is null) = (delivered_by is null))
);
create index mount_preorder_reservations_step_idx
  on mount_preorder_private.reservations (step);
create index mount_preorder_reservations_source_idx
  on mount_preorder_private.reservations (source_donation_id);

alter table mount_preorder_private.package_catalog enable row level security;
alter table mount_preorder_private.steps enable row level security;
alter table mount_preorder_private.purchase_credits enable row level security;
alter table mount_preorder_private.purchase_totals enable row level security;
alter table mount_preorder_private.reservations enable row level security;
revoke all on all tables in schema mount_preorder_private from public, anon, authenticated;

create function mount_preorder_private.credit_purchase()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_campaign public.mount_preorder_campaign%rowtype;
  v_unit_price numeric;
  v_quantity integer;
  v_discount numeric;
  v_credit numeric;
  v_player text;
  v_credit_id uuid;
  v_total numeric;
begin
  if new.server <> 'v1' or new.payment_verified_at is null or new.status = 'rejected' then
    return new;
  end if;

  select * into v_campaign from public.mount_preorder_campaign where singleton;
  if not v_campaign.active or v_campaign.starts_at is null
    or new.created_at is null or new.created_at < v_campaign.starts_at
    or new.payment_verified_at < v_campaign.starts_at then
    return new;
  end if;

  -- Preserve the original account/value when reviewing an already credited order.
  if exists (select 1 from mount_preorder_private.purchase_credits where source_donation_id = new.id) then
    return new;
  end if;

  select unit_price_usd into v_unit_price from mount_preorder_private.package_catalog
    where package_id = new.selected_package_id;
  if v_unit_price is null then return new; end if;
  v_quantity := coalesce(new.package_quantity, 1);
  v_discount := coalesce(new.discount_percent, 0);
  v_player := public.normalize_playcrows_player_id(new.player_id);
  if new.selected_package_amount is distinct from v_unit_price
    or v_quantity < 1 or v_quantity > 999 or v_discount < 0 or v_discount >= 100
    or coalesce(v_player, '') = '' then
    raise exception 'Invalid verified gift-package details for mount pre-order credit.';
  end if;
  v_credit := round(v_unit_price * v_quantity * (1 - v_discount / 100), 2);
  if v_credit <= 0 then return new; end if;

  insert into mount_preorder_private.purchase_credits (
    source_donation_id, player_id_normalized, package_id, package_quantity,
    unit_price_usd, discount_percent, credit_usd, order_created_at, payment_verified_at,
    paypal_capture_id, paddle_transaction_id
  ) values (
    new.id, v_player, new.selected_package_id, v_quantity, v_unit_price, v_discount,
    v_credit, new.created_at, new.payment_verified_at,
    nullif(new.paypal_capture_id, ''), nullif(new.paddle_transaction_id, '')
  ) on conflict do nothing returning source_donation_id into v_credit_id;
  if v_credit_id is null then return new; end if;

  -- The atomic upsert serializes concurrent purchases for the same account.
  insert into mount_preorder_private.purchase_totals as totals (player_id_normalized, total_paid_usd)
    values (v_player, v_credit)
    on conflict (player_id_normalized) do update
      set total_paid_usd = totals.total_paid_usd + excluded.total_paid_usd
    returning total_paid_usd into v_total;

  -- A larger order may earn several steps at once, always including prior steps.
  insert into mount_preorder_private.reservations (player_id_normalized, step, source_donation_id)
    select v_player, step, new.id from mount_preorder_private.steps
    where total_required_usd <= v_total order by step
    on conflict (player_id_normalized, step) do nothing;
  return new;
end;
$$;
revoke all on function mount_preorder_private.credit_purchase() from public, anon, authenticated;

create trigger donations_credit_mount_preorder
  after insert or update of payment_verified_at, status on public.donations
  for each row execute function mount_preorder_private.credit_purchase();

create function public.get_mount_preorder_campaign()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('active', active and starts_at <= now(), 'starts_at', starts_at)
  from public.mount_preorder_campaign where singleton;
$$;
revoke all on function public.get_mount_preorder_campaign() from public;
grant execute on function public.get_mount_preorder_campaign() to anon, authenticated;

create function mount_preorder_private.get_progress(p_player_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_player text := public.normalize_playcrows_player_id(p_player_id);
  v_total numeric;
  v_next_step integer;
  v_remaining numeric;
  v_steps jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if coalesce(v_player, '') = '' then raise exception 'Login ID is required.'; end if;
  select coalesce((select total_paid_usd from mount_preorder_private.purchase_totals
    where player_id_normalized = v_player), 0) into v_total;
  select step, total_required_usd - v_total into v_next_step, v_remaining
    from mount_preorder_private.steps where total_required_usd > v_total order by step limit 1;
  select jsonb_agg(jsonb_build_object(
    'step', s.step, 'mount_key', s.mount_key, 'mount_name', s.mount_name,
    'step_usd', s.step_usd, 'total_required_usd', s.total_required_usd,
    'unlocked', r.step is not null, 'reserved_at', r.reserved_at,
    'source_donation_id', r.source_donation_id,
    'delivery_status', case when r.step is null then null when r.delivered_at is null then 'reserved' else 'delivered' end,
    'delivered_at', r.delivered_at
  ) order by s.step) into v_steps from mount_preorder_private.steps s
    left join mount_preorder_private.reservations r on r.step = s.step and r.player_id_normalized = v_player;
  return public.get_mount_preorder_campaign() || jsonb_build_object(
    'total_paid_usd', v_total, 'next_step', v_next_step,
    'remaining_usd', coalesce(v_remaining, 0), 'steps', v_steps
  );
end;
$$;

create function mount_preorder_private.start_campaign()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  -- Repeated clicks cannot reset the launch time or include earlier purchases.
  update public.mount_preorder_campaign
    set active = true, starts_at = coalesce(starts_at, clock_timestamp()) where singleton;
  return public.get_mount_preorder_campaign();
end;
$$;

create function mount_preorder_private.mark_delivered(p_player_id text, p_step integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_player text := public.normalize_playcrows_player_id(p_player_id);
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_step is null or p_step not between 1 and 3 or coalesce(v_player, '') = '' then
    raise exception 'A valid Login ID and mount step are required.';
  end if;
  -- Serialize delivery with other delivery actions and newly verified orders.
  perform 1 from mount_preorder_private.purchase_totals where player_id_normalized = v_player for update;
  if not exists (select 1 from mount_preorder_private.reservations where player_id_normalized = v_player and step = p_step) then
    raise exception 'This mount has not been reserved.';
  end if;
  if (select count(*) from mount_preorder_private.reservations
      where player_id_normalized = v_player and step < p_step and delivered_at is not null) <> p_step - 1 then
    raise exception 'Deliver the earlier mount steps first.';
  end if;
  update mount_preorder_private.reservations set delivered_at = clock_timestamp(), delivered_by = auth.uid()
    where player_id_normalized = v_player and step = p_step and delivered_at is null;
  return mount_preorder_private.get_progress(p_player_id);
end;
$$;

-- Only these narrow functions access customer data. Authenticated users still
-- need membership of the existing admin_users table on every call.
revoke all on function mount_preorder_private.get_progress(text),
  mount_preorder_private.start_campaign(), mount_preorder_private.mark_delivered(text, integer)
  from public, anon, authenticated;
grant execute on function mount_preorder_private.get_progress(text),
  mount_preorder_private.start_campaign(), mount_preorder_private.mark_delivered(text, integer) to authenticated;

create function public.get_mount_preorder_progress(p_player_id text)
returns jsonb language sql security invoker set search_path = '' as $$
  select mount_preorder_private.get_progress(p_player_id);
$$;
create function public.start_mount_preorder_campaign()
returns jsonb language sql security invoker set search_path = '' as $$
  select mount_preorder_private.start_campaign();
$$;
create function public.mark_mount_preorder_delivered(p_player_id text, p_step integer)
returns jsonb language sql security invoker set search_path = '' as $$
  select mount_preorder_private.mark_delivered(p_player_id, p_step);
$$;
revoke all on function public.get_mount_preorder_progress(text), public.start_mount_preorder_campaign(),
  public.mark_mount_preorder_delivered(text, integer) from public, anon, authenticated;
grant execute on function public.get_mount_preorder_progress(text), public.start_mount_preorder_campaign(),
  public.mark_mount_preorder_delivered(text, integer) to authenticated;

comment on table mount_preorder_private.purchase_credits is
  'Immutable verified payment receipts from campaign launch onward. Review edits do not reverse credit; exceptional refunds/corrections require an audited administrator reconciliation.';
comment on table mount_preorder_private.reservations is
  'Pre-order mount bonuses only; package items_delivered and fulfillment_status must never mark these delivered.';

notify pgrst, 'reload schema';
