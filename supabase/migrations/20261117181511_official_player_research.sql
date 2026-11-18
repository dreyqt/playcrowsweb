-- PlayCrows official-server research. The Edge Function is the only data writer.
-- No existing donation, payment, event, or administrator records are modified.
create table public.research_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  label text not null check (length(label) between 1 and 120),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  revoked_at timestamptz
);

create table public.research_submissions (
  id uuid primary key,
  reference text not null unique,
  invite_id uuid not null unique references public.research_invites(id),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 250000),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  proof_path text not null unique,
  proof_sha256 text not null check (proof_sha256 ~ '^[a-f0-9]{64}$'),
  proof_mime text not null check (proof_mime in ('image/png','image/jpeg','image/webp')),
  proof_size integer not null check (proof_size between 32 and 3145728),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_notes text not null default '' check (length(review_notes) <= 4000)
);
create index research_submissions_created_at_idx on public.research_submissions(created_at desc, id desc);
create index research_submissions_proof_sha256_idx on public.research_submissions(proof_sha256);
create index research_submissions_reviewed_by_idx on public.research_submissions(reviewed_by);
create index research_invites_created_at_idx on public.research_invites(created_at desc, id desc);
create index research_invites_created_by_idx on public.research_invites(created_by);

create table public.research_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.research_submissions(id),
  actor_id uuid not null references auth.users(id),
  previous_status text not null check (previous_status in ('pending','approved','rejected')),
  status text not null check (status in ('pending','approved','rejected')),
  notes text not null check (length(notes) between 10 and 4000),
  created_at timestamptz not null default now()
);
create index research_reviews_submission_idx on public.research_reviews(submission_id,created_at desc);
create index research_reviews_actor_idx on public.research_reviews(actor_id);

create table public.research_limits (
  bucket text primary key check (length(bucket) <= 120),
  window_start timestamptz not null default now(),
  hits integer not null default 1 check (hits > 0)
);

alter table public.research_invites enable row level security;
alter table public.research_submissions enable row level security;
alter table public.research_reviews enable row level security;
alter table public.research_limits enable row level security;
revoke all on public.research_invites, public.research_submissions, public.research_reviews, public.research_limits from public, anon, authenticated;
grant select,insert,update,delete on public.research_invites, public.research_submissions, public.research_reviews, public.research_limits to service_role;
comment on table public.research_submissions is 'Private official-server research. Submission acceptance is not verification; staff must check gameplay evidence and each citation before approval.';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('research-evidence','research-evidence',false,3145728,array['image/png','image/jpeg','image/webp']);
-- Restrictive policies prevent any broad, pre-existing Storage policies from
-- accidentally making this new bucket accessible to ordinary API callers.
create policy research_evidence_private on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id <> 'research-evidence')
with check (bucket_id <> 'research-evidence');

create function public.research_take_rate_limit(p_bucket text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_hits integer;
begin
  if length(p_bucket) > 120 or p_limit not between 1 and 1000 or p_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit';
  end if;
  insert into public.research_limits(bucket,window_start,hits) values(p_bucket,clock_timestamp(),1)
  on conflict(bucket) do update set
    hits=case when research_limits.window_start <= clock_timestamp()-make_interval(secs=>p_seconds) then 1 else research_limits.hits+1 end,
    window_start=case when research_limits.window_start <= clock_timestamp()-make_interval(secs=>p_seconds) then clock_timestamp() else research_limits.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

create function public.research_commit_submission(
  p_token_hash text,p_request_id uuid,p_payload jsonb,p_payload_sha256 text,
  p_proof_path text,p_proof_sha256 text,p_proof_mime text,p_proof_size integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_invite public.research_invites; v_saved public.research_submissions;
begin
  select * into v_invite from public.research_invites where token_hash=p_token_hash for update;
  if not found then raise exception 'Invite unavailable' using errcode='P0001'; end if;
  select * into v_saved from public.research_submissions where id=p_request_id;
  if found then
    if v_saved.invite_id <> v_invite.id or v_saved.payload_sha256 <> p_payload_sha256 then
      raise exception 'Request conflict' using errcode='P0001';
    end if;
    return jsonb_build_object('id',v_saved.id,'reference',v_saved.reference,'status',v_saved.status,'created_at',v_saved.created_at,'proof_path',v_saved.proof_path,'replayed',true);
  end if;
  if v_invite.used_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'Invite unavailable' using errcode='P0001';
  end if;
  if jsonb_typeof(p_payload->'profile') is distinct from 'object' or jsonb_typeof(p_payload->'entries') is distinct from 'array'
     or jsonb_array_length(p_payload->'entries') not between 1 and 30 or p_payload->'consent' is distinct from 'true'::jsonb then
    raise exception 'Invalid research payload' using errcode='P0001';
  end if;
  if p_proof_path not like p_request_id::text || '/%' then raise exception 'Invalid evidence path'; end if;
  insert into public.research_submissions(id,reference,invite_id,payload,payload_sha256,proof_path,proof_sha256,proof_mime,proof_size)
  values(p_request_id,'NCR-'||upper(replace(p_request_id::text,'-','')),v_invite.id,p_payload,p_payload_sha256,p_proof_path,p_proof_sha256,p_proof_mime,p_proof_size)
  returning * into v_saved;
  update public.research_invites set used_at=now() where id=v_invite.id;
  return jsonb_build_object('id',v_saved.id,'reference',v_saved.reference,'status',v_saved.status,'created_at',v_saved.created_at,'proof_path',v_saved.proof_path,'replayed',false);
end $$;

create function public.research_review_submission(p_id uuid,p_actor uuid,p_status text,p_expected_status text,p_notes text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_row public.research_submissions;
begin
  if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'Unauthorized'; end if;
  if p_status not in ('pending','approved','rejected') or length(trim(p_notes)) not between 10 and 4000 then raise exception 'Review notes required'; end if;
  select * into v_row from public.research_submissions where id=p_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v_row.status is distinct from p_expected_status then raise exception 'Review conflict'; end if;
  insert into public.research_reviews(submission_id,actor_id,previous_status,status,notes)
  values(p_id,p_actor,v_row.status,p_status,trim(p_notes));
  update public.research_submissions set status=p_status,reviewed_at=now(),reviewed_by=p_actor,review_notes=trim(p_notes)
  where id=p_id returning * into v_row;
  return to_jsonb(v_row);
end $$;

revoke all on function public.research_take_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.research_commit_submission(text,uuid,jsonb,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.research_review_submission(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.research_take_rate_limit(text,integer,integer) to service_role;
grant execute on function public.research_commit_submission(text,uuid,jsonb,text,text,text,text,integer) to service_role;
grant execute on function public.research_review_submission(uuid,uuid,text,text,text) to service_role;
