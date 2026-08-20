-- PlayCrows Event Center v10 - Blank Unicode filler bypass hardening
-- Run AFTER v9_invisible_unicode_security.
--
-- Incident addressed:
--   U+3164 HANGUL FILLER (ㅤ) renders as blank but is Unicode category Lo,
--   not whitespace. Attackers could append it to a Character Name / Player ID
--   to evade identity and 12-hour cooldown comparisons.
--
-- This migration extends the canonical sanitizer to blank-looking Unicode
-- fillers/separators, including Hangul fillers and BRAILLE PATTERN BLANK.
-- The existing cooldown still counts only pending/approved claims, so a
-- rejected claim releases the cooldown immediately.

create or replace function public.strip_event_invisible_chars(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := coalesce(p_value, '');
  v_code integer;
begin
  -- Single code points: default-ignorable controls + blank-looking characters
  -- that are NOT reliably classified as whitespace by all runtimes.
  foreach v_code in array array[
    160,   -- NO-BREAK SPACE
    173,   -- SOFT HYPHEN
    847,   -- COMBINING GRAPHEME JOINER
    1564,  -- ARABIC LETTER MARK
    4447,  -- U+115F HANGUL CHOSEONG FILLER
    4448,  -- U+1160 HANGUL JUNGSEONG FILLER
    5760,  -- OGHAM SPACE MARK
    6068,  -- KHMER VOWEL INHERENT AQ
    6069,  -- KHMER VOWEL INHERENT AA
    6158,  -- MONGOLIAN VOWEL SEPARATOR
    8232,  -- LINE SEPARATOR
    8233,  -- PARAGRAPH SEPARATOR
    8239,  -- NARROW NO-BREAK SPACE
    8287,  -- MEDIUM MATHEMATICAL SPACE
    10240, -- U+2800 BRAILLE PATTERN BLANK
    12288, -- IDEOGRAPHIC SPACE
    12644, -- U+3164 HANGUL FILLER (observed bypass)
    65279, -- BOM / ZERO WIDTH NO-BREAK SPACE
    65440  -- U+FFA0 HALFWIDTH HANGUL FILLER
  ] loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- EN QUAD through HAIR SPACE + zero-width/direction marks.
  for v_code in 8192..8207 loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- Bidi embedding/override controls.
  for v_code in 8234..8238 loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- Word joiners, invisible operators, bidi isolates and deprecated controls.
  for v_code in 8288..8303 loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- Unicode variation selectors, including emoji VS-16 (U+FE0F).
  for v_code in 65024..65039 loop
    v := replace(v, chr(v_code), '');
  end loop;

  -- Unicode TAG characters can be embedded in emoji sequences while invisible.
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

-- normalize_event_identity() and normalize_event_claim_url() from v9 call the
-- sanitizer above dynamically, so replacing it immediately strengthens all
-- cooldown / duplicate comparisons, including comparisons against old rows.

-- Clean stored identity fields so moderators no longer see hidden filler padding.
update public.event_submissions
set
  discord_username = btrim(public.strip_event_invisible_chars(discord_username)),
  character_name = nullif(btrim(public.strip_event_invisible_chars(coalesce(character_name, ''))), ''),
  player_id = nullif(btrim(public.strip_event_invisible_chars(coalesce(player_id, ''))), '')
where
  discord_username is distinct from btrim(public.strip_event_invisible_chars(discord_username))
  or character_name is distinct from nullif(btrim(public.strip_event_invisible_chars(coalesce(character_name, ''))), '')
  or player_id is distinct from nullif(btrim(public.strip_event_invisible_chars(coalesce(player_id, ''))), '');

-- Rebuild stored normalized proof URLs under the stronger sanitizer as well.
delete from public.event_submission_links;
insert into public.event_submission_links(submission_id, event_id, field_id, raw_url, normalized_url)
select s.id, s.event_id, x.field_id, x.raw_url, x.normalized_url
from public.event_submissions s
cross join lateral public.extract_event_claim_urls(s.answers) x
on conflict (submission_id, normalized_url) do nothing;
