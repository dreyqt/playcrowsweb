-- Reduce the final additional spend from $2,000 to $1,500 ($3,000 overall).
-- Filename matches the applied Supabase migration history version.
-- Keep the original campaign start, earned credit and delivered mounts intact.
-- Serialize with payment verification so no purchase misses the new threshold.
lock table public.donations in share row exclusive mode;

update mount_preorder_private.steps
set step_usd = 1500, total_required_usd = 3000
where step = 3;

-- Accounts already meeting the lower total qualify immediately. Attribute the
-- reservation to their first qualifying recorded receipt, retaining all existing
-- reservation/delivery records. Only already credited post-launch spending counts.
with eligible_accounts as (
  select t.player_id_normalized
  from mount_preorder_private.purchase_totals t
  where t.total_paid_usd >= 3000
    and not exists (
      select 1 from mount_preorder_private.reservations r
      where r.player_id_normalized = t.player_id_normalized and r.step = 3
    )
    and 2 = (
      select count(*) from mount_preorder_private.reservations r
      where r.player_id_normalized = t.player_id_normalized and r.step in (1, 2)
    )
), running_credit as (
  select c.player_id_normalized, c.source_donation_id, c.credited_at,
    sum(c.credit_usd) over (
      partition by c.player_id_normalized
      order by c.credited_at, c.source_donation_id rows unbounded preceding
    ) as total_paid_usd
  from mount_preorder_private.purchase_credits c
  join eligible_accounts a using (player_id_normalized)
), qualifying_receipts as (
  select distinct on (player_id_normalized)
    player_id_normalized, source_donation_id
  from running_credit where total_paid_usd >= 3000
  order by player_id_normalized, credited_at, source_donation_id
)
insert into mount_preorder_private.reservations (player_id_normalized, step, source_donation_id)
select player_id_normalized, 3, source_donation_id from qualifying_receipts
on conflict (player_id_normalized, step) do nothing;

notify pgrst, 'reload schema';
