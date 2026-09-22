-- Refresh legacy PlayCrows event download URLs after V1 and V2 moved to
-- single multi-language PC and Android clients.
--
-- This updates existing Event Center records across both servers, including
-- localized translations and copy-action payloads stored inside JSONB.

create or replace function public.refresh_event_client_download_links(
  p_text text,
  p_server text
)
returns text
language plpgsql
immutable
as $$
begin
  if p_text is null then
    return null;
  end if;

  if p_server = 'v1' then
    p_text := regexp_replace(
      p_text,
      'https?://download\.playcrows\.com/pv1/PlayV1-PC-[A-Za-z0-9._-]+\.zip',
      'http://download.playcrows.com/pv1/PlayV1-PC-all-11.zip',
      'gi'
    );
    p_text := regexp_replace(
      p_text,
      'https?://download\.playcrows\.com/pv1/PlayAZ-v1-[A-Za-z0-9._-]+\.apk',
      'http://download.playcrows.com/pv1/PlayAZ-v1-all-11.apk',
      'gi'
    );
  elsif p_server = 'v2' then
    p_text := regexp_replace(
      p_text,
      'https?://download\.playcrows\.com/pv2/PlayV2-PC-[A-Za-z0-9._-]+\.zip',
      'http://download.playcrows.com/pv2/PlayV2-PC-all-5.zip',
      'gi'
    );
    p_text := regexp_replace(
      p_text,
      'https?://download\.playcrows\.com/pv2/PlayAZ-v2-[A-Za-z0-9._-]+\.apk',
      'http://download.playcrows.com/pv2/PlayAZ-v2-all-5.apk',
      'gi'
    );
  end if;

  return p_text;
end;
$$;

update public.events
set
  title = public.refresh_event_client_download_links(title, server),
  short_description = public.refresh_event_client_download_links(short_description, server),
  description = public.refresh_event_client_download_links(description, server),
  mechanics = public.refresh_event_client_download_links(mechanics::text, server)::jsonb,
  rewards = public.refresh_event_client_download_links(rewards::text, server)::jsonb,
  form_fields = public.refresh_event_client_download_links(form_fields::text, server)::jsonb,
  action_links = public.refresh_event_client_download_links(action_links::text, server)::jsonb,
  translations = public.refresh_event_client_download_links(translations::text, server)::jsonb,
  updated_at = now()
where server in ('v1', 'v2');

drop function public.refresh_event_client_download_links(text, text);
