-- PlayCrows Event Center v8 - Global 12-hour submission cooldown
-- Run AFTER v7_link_security.
--
-- Rules:
--   * One pending or approved Event Center submission per player every 12 hours.
--   * The cooldown applies across all events, not separately per event.
--   * Rejected claims do not count, so rejection releases the cooldown immediately.
--   * Existing once/weekly duplicate rules remain unchanged.

create or replace function public.submit_event_claim_localized(
  p_event_id uuid,
  p_language text,
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
  v_fields jsonb;
  v_translation jsonb;
  v_field_id text;
  v_field_type text;
  v_required boolean;
  v_require_character boolean;
  v_require_player boolean;
  v_answer jsonb;
  v_min integer;
  v_max integer;
  v_count integer;
  v_link jsonb;
  v_language text;
  v_discord_norm text;
  v_character_norm text;
  v_player_norm text;
  v_local_now timestamp;
  v_period_local timestamp;
  v_period_start timestamptz;
  v_days_since integer;
  v_lock_key text;
begin

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

  v_language := case
    when p_language in ('en','ko','th','pt','zh-TW','ru') then p_language
    else 'en'
  end;

  if v_language = 'en' then
    v_fields := coalesce(v_event.form_fields, '[]'::jsonb);
    v_require_character := coalesce(v_event.require_character_name, false);
    v_require_player := coalesce(v_event.require_player_id, false);
  else
    v_translation := coalesce(v_event.translations -> v_language, '{}'::jsonb);
    -- Older/unconfigured translations safely fall back to English configuration.
    v_fields := coalesce(v_translation->'form_fields', v_event.form_fields, '[]'::jsonb);
    v_require_character := coalesce((v_translation->>'require_character_name')::boolean, v_event.require_character_name, false);
    v_require_player := coalesce((v_translation->>'require_player_id')::boolean, v_event.require_player_id, false);
  end if;

  if length(trim(coalesce(p_discord_username, ''))) < 2 then
    raise exception 'Discord username is required.';
  end if;
  if v_require_character and length(trim(coalesce(p_character_name, ''))) < 1 then
    raise exception 'Character name is required.';
  end if;
  if v_require_player and length(trim(coalesce(p_player_id, ''))) < 1 then
    raise exception 'Player ID / UID is required.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid claim answers.';
  end if;

  -- Validate the fields for the player's selected language on the server.
  for v_field in select value from jsonb_array_elements(v_fields) loop
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

  -- Lock every supplied identity in a deterministic order so two near-simultaneous
  -- submissions cannot bypass the cross-event cooldown by targeting different events.
  for v_lock_key in
    select lock_key
    from (
      select 'discord:' || v_discord_norm as lock_key
      union
      select 'player:' || v_player_norm where v_player_norm is not null
      union
      select 'character:' || v_character_norm where v_character_norm is not null
    ) identities
    order by lock_key
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
  end loop;

  -- Global Event Center cooldown. Rejected claims are intentionally excluded,
  -- which releases the cooldown immediately when an admin rejects a claim.
  if exists (
    select 1
    from public.event_submissions s
    where s.status in ('pending','approved')
      and s.created_at > now() - interval '12 hours'
      and (
        lower(regexp_replace(trim(s.discord_username), '[[:space:]]+', '', 'g')) = v_discord_norm
        or (v_player_norm is not null and nullif(lower(regexp_replace(trim(coalesce(s.player_id,'')), '[[:space:]]+', '', 'g')), '') = v_player_norm)
        or (v_character_norm is not null and nullif(lower(regexp_replace(trim(coalesce(s.character_name,'')), '[[:space:]]+', '', 'g')), '') = v_character_norm)
      )
  ) then
    raise exception 'You can submit only one Event Center claim every 12 hours. If your previous claim is rejected, the cooldown is released immediately.';
  end if;

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

  -- This check deliberately ignores submission_language: one player cannot claim once in EN
  -- and then again in KO for the same event/weekly period.
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
  insert into public.event_submissions(event_id, reference_code, discord_username, character_name, player_id, answers, submission_language)
  values (
    p_event_id,
    v_reference,
    trim(p_discord_username),
    nullif(trim(coalesce(p_character_name,'')), ''),
    nullif(trim(coalesce(p_player_id,'')), ''),
    coalesce(p_answers, '{}'::jsonb),
    v_language
  )
  returning event_submissions.id into v_id;

  return query select v_id, v_reference;
end;
$$;

revoke all on function public.submit_event_claim_localized(uuid,text,text,text,text,jsonb) from public;
grant execute on function public.submit_event_claim_localized(uuid,text,text,text,text,jsonb) to anon, authenticated;
