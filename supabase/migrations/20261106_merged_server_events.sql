-- V2 has merged into V1. Retire public V2 entry points without deleting history.
-- Apply in a checkout maintenance window before the updated functions/frontend.
begin;

update public.events
set status = 'ended', published_at = null
where server = 'v2' and (status <> 'ended' or published_at is not null);

drop policy if exists "Public read published events" on public.events;
create policy "Public read published events" on public.events
for select to anon, authenticated
using (server = 'v1' and published_at is not null and status in ('active','ended'));

create or replace view public.event_public_results
with (security_invoker = false)
as
select s.id, s.event_id, s.discord_username, s.status,
  case when s.status = 'rejected' then s.rejection_reason else null end as rejection_reason,
  s.reward_sent_at, s.updated_at
from public.event_submissions s
join public.events e on e.id = s.event_id
where e.server = 'v1' and e.published_at is not null
  and e.status in ('active','ended') and s.status in ('approved','rejected');

-- This public security-definer catalog intentionally includes V1 draft reward
-- configurations. Retire its V2 branch as well as the Event Center listings.
create or replace function public.get_donation_event_bonus_catalog(p_server text)
returns table (event_number text, title text, rewards jsonb)
language sql stable security definer set search_path = public
as $$
  with normalized_events as (
    select regexp_replace(e.event_number, '^0+', '') as normalized_number,
      e.title, e.rewards, e.updated_at, e.created_at
    from public.events e
    where p_server = 'v1' and e.server = 'v1' and e.event_number ~ '^0*[0-9]+$'
  ), ranked as (
    select normalized_number, title, rewards,
      row_number() over (partition by normalized_number order by updated_at desc nulls last, created_at desc) as rn
    from normalized_events
    where normalized_number <> '' and nullif(normalized_number, '')::integer between 1 and 7
  )
  select lpad(normalized_number, 3, '0'), title, coalesce(rewards, '[]'::jsonb)
  from ranked where rn = 1 order by nullif(normalized_number, '')::integer;
$$;
revoke all on function public.get_donation_event_bonus_catalog(text) from public;
grant execute on function public.get_donation_event_bonus_catalog(text) to anon,authenticated;

-- This guard covers both the legacy and localized security-definer claim RPCs,
-- including stale pages and an accidental later republication of a V2 event.
create or replace function public.guard_merged_server_event_claim()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.events e where e.id = new.event_id and e.server = 'v2') then
    raise exception 'V2 has merged into V1. V2 events no longer accept claims.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_merged_server_event_claim() from public,anon,authenticated;
drop trigger if exists event_submissions_guard_merged_server on public.event_submissions;
create trigger event_submissions_guard_merged_server before insert on public.event_submissions
for each row execute function public.guard_merged_server_event_claim();

-- Old V2 records remain editable by administrators. Only new unpaid orders are
-- closed; trusted handlers may still record already completed provider payments.
create or replace function public.guard_merged_server_donation()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.server = 'v2' and not coalesce((
    new.payment_verified_at is not null and (
      (new.payment_method = 'paypal' and new.paypal_order_id is not null
        and new.paypal_capture_id is not null and new.paypal_payment_status = 'COMPLETED')
      or (new.payment_method = 'paddle' and new.paddle_transaction_id is not null
        and new.paddle_payment_status = 'COMPLETED')
    )
  ), false) then
    raise exception 'V2 has merged into V1. New purchases must use V1.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_merged_server_donation() from public,anon,authenticated;
drop trigger if exists donations_guard_merged_server on public.donations;
create trigger donations_guard_merged_server before insert on public.donations
for each row execute function public.guard_merged_server_donation();

-- Beta claims are a separate legacy event system. Some installations never
-- enabled it, so retire its public permissions only when it is present.
do $$
begin
  if to_regclass('public.v2_beta_claim_settings') is not null then
    update public.v2_beta_claim_settings set enabled = false, updated_at = now() where id = true;
  end if;
  if to_regprocedure('public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text)') is not null then
    revoke all on function public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text) from public,anon,authenticated;
  end if;
  if to_regprocedure('public.get_v2_beta_public_results()') is not null then
    revoke all on function public.get_v2_beta_public_results() from public,anon,authenticated;
  end if;
  if to_regclass('storage.objects') is not null then
    drop policy if exists "Upload V2 beta proof" on storage.objects;
  end if;
end;
$$;

commit;
