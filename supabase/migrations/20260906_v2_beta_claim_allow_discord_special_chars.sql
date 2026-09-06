-- Allow Discord usernames/display names containing punctuation and Unicode characters.
-- Keeps a 2-64 character limit and rejects control characters/newlines.

create or replace function public.submit_v2_beta_claim(
  p_player_id text, p_nickname text, p_discord_id text, p_event_type text,
  p_locale text, p_proof_links jsonb, p_screenshot_path text default null
)
returns table(id uuid, reference_code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_reference text;
  v_count int;
  v_claim_date date := (now() at time zone 'Asia/Manila')::date;
  v_normalized_links text[];
  v_duplicate_refs text[] := '{}'::text[];
begin
  if not coalesce((select enabled from public.v2_beta_claim_settings where v2_beta_claim_settings.id = true), false) then raise exception 'Beta claims are currently closed.'; end if;
  if length(trim(coalesce(p_player_id,''))) < 2 or length(trim(coalesce(p_nickname,''))) < 2 then raise exception 'Valid V2 Player ID and nickname are required.'; end if;
  if length(trim(coalesce(p_discord_id,''))) < 2 or length(trim(coalesce(p_discord_id,''))) > 64 or coalesce(p_discord_id,'') ~ '[[:cntrl:]]' then raise exception 'A valid Discord ID or username is required.'; end if;
  if p_event_type not in ('share_fb','invite_discord','share_livestream') or p_locale not in ('en','ko','th','pt','zh-TW','ru') then raise exception 'Invalid event selection.'; end if;
  if jsonb_typeof(p_proof_links) <> 'array' then raise exception 'Proof links are required.'; end if;
  select count(*) into v_count from jsonb_array_elements_text(p_proof_links) x where x ~* '^https?://';
  if (p_event_type = 'share_fb' and (v_count <> 5 or (select count(distinct public.normalize_v2_beta_proof_url(value)) from jsonb_array_elements_text(p_proof_links)) <> 5))
     or (p_event_type in ('invite_discord','share_livestream') and v_count <> 1) then raise exception 'Complete and unique proof links are required.'; end if;
  if p_event_type = 'invite_discord' and (coalesce(p_screenshot_path,'') = '' or not exists (select 1 from storage.objects where bucket_id='v2-beta-proofs' and name=p_screenshot_path)) then raise exception 'Invite Tracker screenshot is required.'; end if;
  if p_event_type <> 'invite_discord' and p_screenshot_path is not null then raise exception 'Unexpected screenshot.'; end if;
  if exists (select 1 from public.v2_beta_claims c where c.event_type=p_event_type and c.claim_date=v_claim_date and c.status in ('for_review','pending','approved') and (lower(trim(c.player_id))=lower(trim(p_player_id)) or lower(trim(c.discord_id))=lower(trim(p_discord_id)))) then raise exception 'You already have an active submission for this event today.'; end if;
  select array_agg(distinct public.normalize_v2_beta_proof_url(value))
    into v_normalized_links
    from jsonb_array_elements_text(p_proof_links);
  select coalesce(array_agg(distinct c.reference_code), '{}'::text[])
    into v_duplicate_refs
   from public.v2_beta_claims c
    cross join lateral jsonb_array_elements_text(c.proof_links) existing_link(value)
   where lower(trim(c.player_id)) <> lower(trim(p_player_id))
     and c.status in ('for_review','pending','approved')
     and public.normalize_v2_beta_proof_url(existing_link.value) = any(v_normalized_links);
  v_reference := 'V2-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.v2_beta_claims(reference_code,player_id,nickname,discord_id,event_type,locale,claim_date,proof_links,screenshot_path,duplicate_link_detected,duplicate_link_references)
  values(v_reference,trim(p_player_id),trim(p_nickname),trim(p_discord_id),p_event_type,p_locale,v_claim_date,p_proof_links,p_screenshot_path,cardinality(v_duplicate_refs)>0,v_duplicate_refs)
  returning v2_beta_claims.id into v_id;
  if cardinality(v_duplicate_refs) > 0 then
    update public.v2_beta_claims c
       set duplicate_link_detected = true,
           duplicate_link_references = array(
             select distinct item
               from unnest(coalesce(c.duplicate_link_references, '{}'::text[]) || array[v_reference]) item
           ),
           updated_at = now()
     where c.reference_code = any(v_duplicate_refs)
       and c.status in ('for_review','pending','approved');
  end if;
  return query select v_id, v_reference;
exception when unique_violation then raise exception 'You already have an active submission for this event today.';
end; $$;
revoke all on function public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text) from public;
grant execute on function public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text) to anon, authenticated;

