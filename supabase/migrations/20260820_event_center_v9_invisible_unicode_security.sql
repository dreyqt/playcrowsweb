-- PlayCrows Event Center v9 - Invisible Unicode / emoji bypass hardening
-- Run AFTER v8_12h_global_cooldown.
--
-- Security goals:
--   * Zero-width characters, emoji variation selectors, bidi controls, Unicode tag
--     characters, and similar invisible code points cannot make the same player look unique.
--   * The same stripping is applied to proof URL normalization so hidden Unicode cannot
--     bypass duplicate-link checks.
--   * Existing 12-hour global cooldown behavior remains unchanged.
--   * Rejected claims still release the cooldown immediately.

create or replace function public.strip_event_invisible_chars(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := coalesce(p_value, '');
  v_code integer;
begin
  -- Common format/default-ignorable characters used for invisible identity changes.
  foreach v_code in array array[
    173,   -- soft hyphen
    847,   -- combining grapheme joiner
    1564,  -- arabic letter mark
    6158,  -- mongolian vowel separator
    8203, 8204, 8205, 8206, 8207, -- zero-width + direction marks
    8234, 8235, 8236, 8237, 8238, -- bidi embedding/override controls
    8288, 8289, 8290, 8291, 8292, -- word joiner / invisible operators
    8294, 8295, 8296, 8297, 8298, 8299, 8300, 8301, 8302, 8303,
    65279 -- BOM / zero-width no-break space
  ] loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- Unicode variation selectors, including the common emoji VS-16 (U+FE0F).
  for v_code in 65024..65039 loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- Unicode TAG characters can be embedded in emoji sequences while remaining invisible.
  for v_code in 917504..917631 loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- Variation Selectors Supplement.
  for v_code in 917760..917999 loop
    v := replace(v, chr(v_code), '');
  end loop;

  return v;
end;
$$;

create or replace function public.normalize_event_identity(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    lower(
      regexp_replace(
        btrim(public.strip_event_invisible_chars(coalesce(p_value, ''))),
        '[[:space:]]+',
        '',
        'g'
      )
    ),
    ''
  );
$$;

-- Replaces v7 URL normalization with invisible-Unicode stripping first.
create or replace function public.normalize_event_claim_url(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
  v_host text;
  v_rest text;
begin
  v := btrim(public.strip_event_invisible_chars(coalesce(p_url, '')));
  if v = '' or v !~* '^https?://[^[:space:]]+$' then
    return null;
  end if;

  v := regexp_replace(v, '#.*$', '');
  v := regexp_replace(v, '^https?://', '', 'i');

  v_host := substring(v from '^([^/?]+)');
  if v_host is null then
    return null;
  end if;
  v_rest := substring(v from length(v_host) + 1);
  v_host := lower(v_host);
  v_host := regexp_replace(v_host, '^www\.', '', 'i');

  if v_host in ('m.facebook.com', 'web.facebook.com') then
    v_host := 'facebook.com';
  end if;

  v := v_host || coalesce(v_rest, '');
  v := regexp_replace(v, '/+$', '');
  return nullif(v, '');
end;
$$;

create or replace function public.extract_event_claim_urls(p_answers jsonb)
returns table(field_id text, raw_url text, normalized_url text)
language sql
immutable
as $$
  with fields as (
    select e.key as field_id, e.value
    from jsonb_each(coalesce(p_answers, '{}'::jsonb)) e
  ), values_expanded as (
    select f.field_id,
           case when jsonb_typeof(f.value) = 'string' then f.value #>> '{}' else null end as raw_url
    from fields f
    where jsonb_typeof(f.value) = 'string'

    union all

    select f.field_id, a.value #>> '{}' as raw_url
    from fields f
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(f.value) = 'array' then f.value else '[]'::jsonb end
    ) a(value)
    where jsonb_typeof(f.value) = 'array'
      and jsonb_typeof(a.value) = 'string'
  )
  select v.field_id,
         btrim(v.raw_url),
         public.normalize_event_claim_url(v.raw_url)
  from values_expanded v
  where public.normalize_event_claim_url(v.raw_url) is not null;
$$;

-- Update the duplicate-proof guard to compare normalized identities rather than raw
-- whitespace-only normalization.
create or replace function public.guard_event_submission_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_unique integer;
  v_has_approved_conflict boolean;
begin
  select count(*), count(distinct normalized_url)
    into v_total, v_unique
  from public.extract_event_claim_urls(new.answers);

  if v_total <> v_unique then
    raise exception 'Duplicate links detected in this claim. Please submit each proof link only once.';
  end if;

  if tg_op = 'INSERT' or new.status = 'approved' then
    select exists (
      select 1
      from public.extract_event_claim_urls(new.answers) incoming
      join public.event_submission_links l
        on l.event_id = new.event_id
       and l.normalized_url = incoming.normalized_url
      join public.event_submissions prior on prior.id = l.submission_id
      where prior.id <> new.id
        and prior.status = 'approved'
        and not (
          public.normalize_event_identity(prior.discord_username) = public.normalize_event_identity(new.discord_username)
          or (
            public.normalize_event_identity(prior.player_id) is not null
            and public.normalize_event_identity(prior.player_id) = public.normalize_event_identity(new.player_id)
          )
          or (
            public.normalize_event_identity(prior.character_name) is not null
            and public.normalize_event_identity(prior.character_name) = public.normalize_event_identity(new.character_name)
          )
        )
    ) into v_has_approved_conflict;

    if v_has_approved_conflict then
      raise exception 'One or more submitted links have already been used in an approved claim for this event.';
    end if;
  end if;

  return new;
end;
$$;

-- Rebuild normalized proof-link rows so historical submissions receive the stronger
-- canonicalization too. The source submissions themselves are not deleted or reset.
delete from public.event_submission_links;
insert into public.event_submission_links(submission_id, event_id, field_id, raw_url, normalized_url)
select s.id, s.event_id, x.field_id, x.raw_url, x.normalized_url
from public.event_submissions s
cross join lateral public.extract_event_claim_urls(s.answers) x
on conflict (submission_id, normalized_url) do nothing;

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

  if coalesce(length(public.normalize_event_identity(p_discord_username)), 0) < 2 then
    raise exception 'Discord username is required.';
  end if;
  if v_require_character and public.normalize_event_identity(p_character_name) is null then
    raise exception 'Character name is required.';
  end if;
  if v_require_player and public.normalize_event_identity(p_player_id) is null then
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
          if length(trim(v_link #>> '{}')) > 0 and public.normalize_event_claim_url(v_link #>> '{}') is null then
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
      if v_field_type = 'url' and v_answer is not null and length(trim(v_answer #>> '{}')) > 0 and public.normalize_event_claim_url(v_answer #>> '{}') is null then
        raise exception '% must be a valid URL.', coalesce(v_field->>'label', v_field_id);
      end if;
    end if;
  end loop;

  v_discord_norm := public.normalize_event_identity(p_discord_username);
  v_character_norm := public.normalize_event_identity(p_character_name);
  v_player_norm := public.normalize_event_identity(p_player_id);

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
        public.normalize_event_identity(s.discord_username) = v_discord_norm
        or (v_player_norm is not null and public.normalize_event_identity(s.player_id) = v_player_norm)
        or (v_character_norm is not null and public.normalize_event_identity(s.character_name) = v_character_norm)
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
        public.normalize_event_identity(s.discord_username) = v_discord_norm
        or (v_player_norm is not null and public.normalize_event_identity(s.player_id) = v_player_norm)
        or (v_character_norm is not null and public.normalize_event_identity(s.character_name) = v_character_norm)
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
    btrim(public.strip_event_invisible_chars(p_discord_username)),
    nullif(btrim(public.strip_event_invisible_chars(coalesce(p_character_name,''))), ''),
    nullif(btrim(public.strip_event_invisible_chars(coalesce(p_player_id,''))), ''),
    coalesce(p_answers, '{}'::jsonb),
    v_language
  )
  returning event_submissions.id into v_id;

  return query select v_id, v_reference;
end;
$$;

revoke all on function public.submit_event_claim_localized(uuid,text,text,text,text,jsonb) from public;
grant execute on function public.submit_event_claim_localized(uuid,text,text,text,text,jsonb) to anon, authenticated;
