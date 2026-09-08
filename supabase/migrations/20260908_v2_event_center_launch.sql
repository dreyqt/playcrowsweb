-- PlayCrows V2 launch: server-aware Event Center + cloned V2 Event001.
-- V1 event records are preserved and backfilled to server='v1'.

alter table public.events
  add column if not exists server text;

update public.events
set server = 'v1'
where server is null or server not in ('v1', 'v2');

alter table public.events
  alter column server set default 'v1',
  alter column server set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_server_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_server_check check (server in ('v1', 'v2'));
  end if;
end $$;

-- Event URLs are now scoped by server, so V1 and V2 may intentionally share the
-- same slug (for example Event001 on both servers).
alter table public.events drop constraint if exists events_slug_key;
drop index if exists public.events_slug_key;
create unique index if not exists events_server_slug_key
  on public.events(server, slug);

create index if not exists events_server_published_idx
  on public.events(server, published_at desc);

-- Clone the latest V1 Event001 into an independent V2 event. The copied event
-- becomes claimable exactly at the V2 official launch (Sep 9, 2026 12:00 PM GMT+8).
-- If a V2 Event001 already exists, nothing is duplicated.
do $$
declare
  v_source public.events%rowtype;
begin
  if not exists (
    select 1
    from public.events
    where server = 'v2'
      and regexp_replace(event_number, '^0+', '') = '1'
  ) then
    select *
    into v_source
    from public.events
    where server = 'v1'
      and regexp_replace(event_number, '^0+', '') = '1'
    order by published_at desc nulls last, created_at desc
    limit 1;

    if found then
      insert into public.events (
        server, slug, event_number, title, short_description, description,
        mechanics, rewards, form_fields, action_links, translations,
        status, starts_at, ends_at, published_at,
        claim_frequency, weekly_reset_day, weekly_reset_hour, weekly_reset_timezone,
        require_character_name, require_player_id, created_at, updated_at
      )
      values (
        'v2', v_source.slug, v_source.event_number, v_source.title,
        v_source.short_description, v_source.description,
        v_source.mechanics, v_source.rewards, v_source.form_fields,
        v_source.action_links, v_source.translations,
        'active', '2026-09-09T04:00:00Z'::timestamptz, null, now(),
        v_source.claim_frequency, v_source.weekly_reset_day,
        v_source.weekly_reset_hour, v_source.weekly_reset_timezone,
        v_source.require_character_name, v_source.require_player_id, now(), now()
      );
    else
      raise notice 'No V1 Event001 was found. Create V2 Event001 from Event Admin after this migration.';
    end if;
  end if;
end $$;

-- Keep the 12-hour anti-duplicate cooldown independent per server so a V1
-- event claim does not prevent the same player from participating in V2.
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
      select v_event.server || ':discord:' || v_discord_norm as lock_key
      union
      select v_event.server || ':player:' || v_player_norm where v_player_norm is not null
      union
      select v_event.server || ':character:' || v_character_norm where v_character_norm is not null
    ) identities
    order by lock_key
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
  end loop;

  -- Server-scoped Event Center cooldown. V1 and V2 are independent. Rejected
  -- claims are intentionally excluded, which releases the cooldown immediately.
  if exists (
    select 1
    from public.event_submissions s
    join public.events prior_event on prior_event.id = s.event_id
    where prior_event.server = v_event.server
      and s.status in ('pending','approved')
      and s.created_at > now() - interval '12 hours'
      and (
        public.normalize_event_identity(s.discord_username) = v_discord_norm
        or (v_player_norm is not null and public.normalize_event_identity(s.player_id) = v_player_norm)
        or (v_character_norm is not null and public.normalize_event_identity(s.character_name) = v_character_norm)
      )
  ) then
    raise exception 'You can submit only one Event Center claim every 12 hours on this server. If your previous claim is rejected, the cooldown is released immediately.';
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
