-- PlayCrows Event Center v2
-- Adds server-side duplicate protection, weekly claim windows, dynamic multi-link fields,
-- required identity fields, and localized event content.
-- Run AFTER 20260814_event_center.sql.

alter table public.events
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists claim_frequency text not null default 'once',
  add column if not exists weekly_reset_day smallint not null default 1,
  add column if not exists weekly_reset_hour smallint not null default 4,
  add column if not exists weekly_reset_timezone text not null default 'Asia/Manila',
  add column if not exists require_character_name boolean not null default false,
  add column if not exists require_player_id boolean not null default false;

-- Keep values constrained even on projects where the columns already existed.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'events_claim_frequency_check') then
    alter table public.events add constraint events_claim_frequency_check check (claim_frequency in ('once','weekly'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_weekly_reset_day_check') then
    alter table public.events add constraint events_weekly_reset_day_check check (weekly_reset_day between 0 and 6);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_weekly_reset_hour_check') then
    alter table public.events add constraint events_weekly_reset_hour_check check (weekly_reset_hour between 0 and 23);
  end if;
end $$;

-- The v1 index permanently blocked a second approved claim, which conflicts with weekly events.
drop index if exists public.event_submissions_one_open_claim_idx;

-- Public can read published events; admins can manage them. Keep table privileges aligned with RLS.
grant select on table public.events to anon, authenticated;
grant insert, update, delete on table public.events to authenticated;
grant select, update, delete on table public.event_submissions to authenticated;

create or replace function public.submit_event_claim(
  p_event_id uuid,
  p_discord_username text,
  p_character_name text default null,
  p_player_id text default null,
  p_answers jsonb default '{}'::jsonb
)
returns table (id uuid, reference_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_id uuid;
  v_reference text;
  v_field jsonb;
  v_field_id text;
  v_field_type text;
  v_required boolean;
  v_answer jsonb;
  v_min integer;
  v_max integer;
  v_count integer;
  v_link jsonb;
  v_discord_norm text;
  v_character_norm text;
  v_player_norm text;
  v_local_now timestamp;
  v_period_local timestamp;
  v_period_start timestamptz;
  v_days_since integer;
begin
  -- Serialize submissions per event to close race conditions between duplicate requests.
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));

  select * into v_event from public.events where events.id = p_event_id;
  if not found or v_event.published_at is null or v_event.status <> 'active' then
    raise exception 'This event is not accepting claims.';
  end if;
  if v_event.starts_at is not null and now() < v_event.starts_at then
    raise exception 'This event has not started yet.';
  end if;
  if v_event.ends_at is not null and now() > v_event.ends_at then
    raise exception 'This event has ended.';
  end if;

  if length(trim(coalesce(p_discord_username, ''))) < 2 then
    raise exception 'Discord username is required.';
  end if;
  if v_event.require_character_name and length(trim(coalesce(p_character_name, ''))) < 1 then
    raise exception 'Character name is required.';
  end if;
  if v_event.require_player_id and length(trim(coalesce(p_player_id, ''))) < 1 then
    raise exception 'Player ID / UID is required.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid claim answers.';
  end if;

  -- Validate dynamic fields on the server so required proof cannot be bypassed by editing JavaScript.
  for v_field in select value from jsonb_array_elements(coalesce(v_event.form_fields, '[]'::jsonb)) loop
    v_field_id := coalesce(v_field->>'id', '');
    v_field_type := coalesce(v_field->>'type', 'text');
    v_required := coalesce((v_field->>'required')::boolean, false);
    v_answer := p_answers -> v_field_id;

    if v_field_type = 'links' then
      v_min := coalesce((v_field->>'minItems')::integer, case when v_required then 1 else 0 end);
      v_max := greatest(v_min, least(20, coalesce((v_field->>'maxItems')::integer, 10)));
      if v_answer is null then
        v_count := 0;
      elsif jsonb_typeof(v_answer) <> 'array' then
        raise exception 'Invalid link list for %.', coalesce(v_field->>'label', v_field_id);
      else
        select count(*) into v_count
        from jsonb_array_elements(v_answer) a(value)
        where length(trim(a.value #>> '{}')) > 0;

        for v_link in select value from jsonb_array_elements(v_answer) loop
          if length(trim(v_link #>> '{}')) > 0 and (v_link #>> '{}') !~* '^https?://[^[:space:]]+$' then
            raise exception 'Invalid URL in %.', coalesce(v_field->>'label', v_field_id);
          end if;
        end loop;
      end if;
      if v_count < v_min then
        raise exception '% requires at least % link(s).', coalesce(v_field->>'label', v_field_id), v_min;
      end if;
      if v_count > v_max then
        raise exception '% allows at most % link(s).', coalesce(v_field->>'label', v_field_id), v_max;
      end if;
    else
      if v_required and (v_answer is null or length(trim(v_answer #>> '{}')) = 0) then
        raise exception '% is required.', coalesce(v_field->>'label', v_field_id);
      end if;
      if v_field_type = 'url' and v_answer is not null and length(trim(v_answer #>> '{}')) > 0 and (v_answer #>> '{}') !~* '^https?://[^[:space:]]+$' then
        raise exception '% must be a valid URL.', coalesce(v_field->>'label', v_field_id);
      end if;
    end if;
  end loop;

  v_discord_norm := lower(regexp_replace(trim(p_discord_username), '[[:space:]]+', '', 'g'));
  v_character_norm := nullif(lower(regexp_replace(trim(coalesce(p_character_name,'')), '[[:space:]]+', '', 'g')), '');
  v_player_norm := nullif(lower(regexp_replace(trim(coalesce(p_player_id,'')), '[[:space:]]+', '', 'g')), '');

  if v_event.claim_frequency = 'weekly' then
    begin
      v_local_now := now() at time zone v_event.weekly_reset_timezone;
    exception when invalid_parameter_value then
      raise exception 'Invalid weekly reset timezone configured for this event.';
    end;
    v_days_since := mod((extract(dow from v_local_now)::integer - v_event.weekly_reset_day + 7), 7);
    v_period_local := date_trunc('day', v_local_now) - make_interval(days => v_days_since) + make_interval(hours => v_event.weekly_reset_hour);
    if v_local_now < v_period_local then
      v_period_local := v_period_local - interval '7 days';
    end if;
    v_period_start := v_period_local at time zone v_event.weekly_reset_timezone;
  else
    v_period_start := '-infinity'::timestamptz;
  end if;

  if exists (
    select 1
    from public.event_submissions s
    where s.event_id = p_event_id
      and s.status in ('pending','approved')
      and s.created_at >= v_period_start
      and (
        lower(regexp_replace(trim(s.discord_username), '[[:space:]]+', '', 'g')) = v_discord_norm
        or (v_player_norm is not null and nullif(lower(regexp_replace(trim(coalesce(s.player_id,'')), '[[:space:]]+', '', 'g')), '') = v_player_norm)
        or (v_character_norm is not null and nullif(lower(regexp_replace(trim(coalesce(s.character_name,'')), '[[:space:]]+', '', 'g')), '') = v_character_norm)
      )
  ) then
    if v_event.claim_frequency = 'weekly' then
      raise exception 'A pending or approved claim already exists for this weekly claim period using the same Discord, character, or Player ID / UID.';
    else
      raise exception 'A pending or approved claim already exists for this event using the same Discord, character, or Player ID / UID.';
    end if;
  end if;

  v_reference := 'EV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.event_submissions(event_id, reference_code, discord_username, character_name, player_id, answers)
  values (
    p_event_id,
    v_reference,
    trim(p_discord_username),
    nullif(trim(coalesce(p_character_name,'')), ''),
    nullif(trim(coalesce(p_player_id,'')), ''),
    coalesce(p_answers, '{}'::jsonb)
  )
  returning event_submissions.id into v_id;

  return query select v_id, v_reference;
end;
$$;

revoke all on function public.submit_event_claim(uuid,text,text,text,jsonb) from public;
grant execute on function public.submit_event_claim(uuid,text,text,text,jsonb) to anon, authenticated;
