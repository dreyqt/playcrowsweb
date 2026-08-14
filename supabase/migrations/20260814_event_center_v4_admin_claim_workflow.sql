-- PlayCrows Event Center v4
-- Adds a moderator verification step without changing the public claim status model.
-- New submissions remain status='pending'. In the admin dashboard they display as
-- "New" until a moderator verifies the requirements, then as "Pending" until the
-- owner marks the reward Approved + Sent.

alter table public.event_submissions
  add column if not exists moderator_verified_at timestamptz,
  add column if not exists moderator_verified_by text;

comment on column public.event_submissions.moderator_verified_at is
  'When set, a moderator has verified that the submission meets event requirements.';

comment on column public.event_submissions.moderator_verified_by is
  'Admin email or user id that marked the claim ready for reward processing.';

grant select, update on table public.event_submissions to authenticated;
