-- PlayCrows Event Center v3: configurable action buttons / event links
-- Run this after the v2 Event Center migration.

alter table public.events
  add column if not exists action_links jsonb not null default '[]'::jsonb;

comment on column public.events.action_links is
  'Configurable public event links rendered as action buttons. Each item stores id, label, url, and optional translated labels.';
