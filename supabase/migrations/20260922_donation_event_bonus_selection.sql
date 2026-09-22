-- PlayCrows Web Shop: purchase-based Event Reward bonus selection.
-- $100 package value = 1 selection. V1 exposes EVENT001-EVENT007;
-- V2 exposes EVENT001-EVENT006.

alter table public.donations
  add column if not exists event_bonus_selections jsonb not null default '[]'::jsonb;

alter table public.donations
  add column if not exists event_bonus_selection_count integer not null default 0;

alter table public.donations
  drop constraint if exists donations_event_bonus_selection_count_check;

alter table public.donations
  add constraint donations_event_bonus_selection_count_check
  check (event_bonus_selection_count >= 0);

comment on column public.donations.event_bonus_selections is
  'Server-validated snapshot of the repeatable $100 Event Reward bonus selections for this donation.';

comment on column public.donations.event_bonus_selection_count is
  'Number of $100 Event Reward bonus selections granted by the package value at submission time.';

-- The webshop needs the reward catalog even when the newest Event Center entry
-- is still a draft. Expose only the event number, title, and reward list.
create or replace function public.get_donation_event_bonus_catalog(p_server text)
returns table (
  event_number text,
  title text,
  rewards jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized_events as (
    select
      regexp_replace(e.event_number, '^0+', '') as normalized_number,
      e.title,
      e.rewards,
      e.updated_at,
      e.created_at
    from public.events e
    where p_server in ('v1', 'v2')
      and e.server = p_server
      and e.event_number ~ '^0*[0-9]+$'
  ),
  ranked as (
    select
      normalized_number,
      title,
      rewards,
      row_number() over (
        partition by normalized_number
        order by updated_at desc nulls last, created_at desc
      ) as rn
    from normalized_events
    where normalized_number <> ''
      and nullif(normalized_number, '')::integer between 1 and case when p_server = 'v1' then 7 else 6 end
  )
  select
    lpad(normalized_number, 3, '0') as event_number,
    title,
    coalesce(rewards, '[]'::jsonb) as rewards
  from ranked
  where rn = 1
  order by nullif(normalized_number, '')::integer;
$$;

revoke all on function public.get_donation_event_bonus_catalog(text) from public;
grant execute on function public.get_donation_event_bonus_catalog(text) to anon, authenticated;
