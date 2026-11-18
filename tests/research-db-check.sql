-- Execute only after both research migrations. All fixtures and changes roll back.
-- This script never uploads files, sends notifications, or modifies existing rows.
begin;
create temporary table research_qa_results(check_name text primary key, passed boolean not null) on commit drop;

do $qa$
declare
  v_actor uuid;
  v_invite uuid;
  v_expired uuid;
  v_revoked uuid;
  v_invalid uuid;
  v_request uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_token text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  v_expired_token text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  v_revoked_token text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  v_invalid_token text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  v_hash text := repeat('a',64);
  v_proof_hash text := repeat('b',64);
  v_payload jsonb := '{"profile":{"displayName":"ROLLBACK QA","contact":"qa-no-contact","region":"Global","server":"QA","characterName":"QA character","characterClass":"Orb","level":80,"playedSince":"2025-01-01","lastPlayed":"2026-01-01"},"entries":[{"tableId":"section-7","rowLabel":"QA observation","values":["QA","Example", "", "", "https://www.nightcrows.com"],"sourceUrl":"https://www.nightcrows.com","observedAt":"2026-01-01","certainty":"uncertain","notes":"Synthetic test; rolled back."}],"consent":true,"website":""}'::jsonb;
  v_saved jsonb;
  v_replay jsonb;
  v_reviewed_at timestamptz;
  v_second_reviewed_at timestamptz;
  v_role text;
  v_table text;
  v_function text;
  v_count integer;
  v_bucket text := 'qa:' || gen_random_uuid()::text;
begin
  select user_id into v_actor from public.admin_users limit 1;
  if v_actor is null then raise exception 'QA requires an existing administrator'; end if;

  insert into public.research_invites(token_hash,label,created_by) values(v_token,'ROLLBACK QA valid',v_actor) returning id into v_invite;
  v_saved := public.research_commit_submission(v_token,v_request,v_payload,v_hash,v_request::text||'/qa.png',v_proof_hash,'image/png',100);
  if v_saved->>'status' <> 'pending' or (v_saved->>'replayed')::boolean or v_saved->>'id' <> v_request::text then
    raise exception 'QA: new submission must be pending, correctly identified, and not replayed';
  end if;
  if not exists(select 1 from public.research_invites where id=v_invite and used_at is not null) then raise exception 'QA: invite was not consumed'; end if;
  insert into research_qa_results values ('new submission is pending and atomically consumes invitation',true);

  v_replay := public.research_commit_submission(v_token,v_request,v_payload,v_hash,v_request::text||'/retry.png',v_proof_hash,'image/png',100);
  if v_replay->>'id' <> v_saved->>'id' or v_replay->>'reference' <> v_saved->>'reference' or v_replay->>'proof_path' <> v_saved->>'proof_path' or not (v_replay->>'replayed')::boolean then raise exception 'QA: identical retry was not idempotent'; end if;
  select count(*) into v_count from public.research_submissions where invite_id=v_invite;
  if v_count <> 1 then raise exception 'QA: retry created duplicate submission'; end if;
  insert into research_qa_results values ('identical retry returns same reference and original proof with no duplicate',true);

  begin
    perform public.research_commit_submission(v_token,v_request,v_payload,repeat('c',64),v_request::text||'/changed.png',v_proof_hash,'image/png',100);
    raise exception 'QA: changed payload hash unexpectedly accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Request conflict' then raise; end if;
  end;
  insert into research_qa_results values ('changed payload cannot replay an existing request',true);

  begin
    perform public.research_commit_submission(v_token,v_other,v_payload,v_hash,v_other::text||'/second.png',v_proof_hash,'image/png',100);
    raise exception 'QA: consumed invitation accepted a second request';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Invite unavailable' then raise; end if;
  end;
  insert into research_qa_results values ('consumed invitation cannot create a second submission',true);

  insert into public.research_invites(token_hash,label,created_by,expires_at) values(v_expired_token,'ROLLBACK QA expired',v_actor,now()-interval '1 day') returning id into v_expired;
  begin
    perform public.research_commit_submission(v_expired_token,v_other,v_payload,v_hash,v_other::text||'/expired.png',v_proof_hash,'image/png',100);
    raise exception 'QA: expired invitation accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Invite unavailable' then raise; end if;
  end;
  insert into research_qa_results values ('expired invitation rejected',true);

  insert into public.research_invites(token_hash,label,created_by,revoked_at) values(v_revoked_token,'ROLLBACK QA revoked',v_actor,now()) returning id into v_revoked;
  begin
    perform public.research_commit_submission(v_revoked_token,v_other,v_payload,v_hash,v_other::text||'/revoked.png',v_proof_hash,'image/png',100);
    raise exception 'QA: revoked invitation accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Invite unavailable' then raise; end if;
  end;
  insert into research_qa_results values ('revoked invitation rejected',true);

  insert into public.research_invites(token_hash,label,created_by) values(v_invalid_token,'ROLLBACK QA invalid payload',v_actor) returning id into v_invalid;
  begin
    perform public.research_commit_submission(v_invalid_token,v_other,jsonb_set(v_payload,'{consent}','false'::jsonb),v_hash,v_other::text||'/invalid.png',v_proof_hash,'image/png',100);
    raise exception 'QA: missing consent accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Invalid research payload' then raise; end if;
  end;
  if exists(select 1 from public.research_invites where id=v_invalid and used_at is not null) then raise exception 'QA: invalid payload consumed invitation'; end if;
  if exists(select 1 from public.research_submissions where id=v_other) then raise exception 'QA: invalid payload persisted'; end if;
  insert into research_qa_results values ('failed validation leaves no submission and does not consume invitation',true);

  v_saved := public.research_review_submission(p_id=>v_request,p_actor=>v_actor,p_status=>'approved',p_expected_status=>'pending',p_notes=>'QA checked official proof and sources.',p_expected_reviewed_at=>null);
  v_reviewed_at := (v_saved->>'reviewed_at')::timestamptz;
  if v_saved->>'status' <> 'approved' or v_saved->>'reviewed_by' <> v_actor::text or v_reviewed_at is null then raise exception 'QA: approved review missing verified actor or timestamp'; end if;
  if not exists(select 1 from public.research_reviews where submission_id=v_request and actor_id=v_actor and previous_status='pending' and status='approved' and notes='QA checked official proof and sources.') then raise exception 'QA: audit record missing'; end if;
  insert into research_qa_results values ('review records decision and verified actor in audit history',true);

  begin
    perform public.research_review_submission(p_id=>v_request,p_actor=>v_actor,p_status=>'rejected',p_expected_status=>'pending',p_notes=>'QA stale review should fail.',p_expected_reviewed_at=>null);
    raise exception 'QA: stale status review accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Review conflict' then raise; end if;
  end;
  insert into research_qa_results values ('stale status review rejected',true);

  v_saved := public.research_review_submission(p_id=>v_request,p_actor=>v_actor,p_status=>'approved',p_expected_status=>'approved',p_notes=>'QA second current review with updated notes.',p_expected_reviewed_at=>v_reviewed_at);
  v_second_reviewed_at := (v_saved->>'reviewed_at')::timestamptz;
  if v_second_reviewed_at is not distinct from v_reviewed_at then raise exception 'QA: review revision did not advance'; end if;
  begin
    perform public.research_review_submission(p_id=>v_request,p_actor=>v_actor,p_status=>'approved',p_expected_status=>'approved',p_notes=>'QA stale same-status review should fail.',p_expected_reviewed_at=>v_reviewed_at);
    raise exception 'QA: stale same-status review accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Review conflict' then raise; end if;
  end;
  select count(*) into v_count from public.research_reviews where submission_id=v_request;
  if v_count <> 2 then raise exception 'QA: failed reviews wrote audit records'; end if;
  insert into research_qa_results values ('stale same-status review rejected and failures leave no audit changes',true);

  begin
    perform public.research_review_submission(p_id=>v_request,p_actor=>gen_random_uuid(),p_status=>'rejected',p_expected_status=>'approved',p_notes=>'QA unauthorized actor should fail.',p_expected_reviewed_at=>v_second_reviewed_at);
    raise exception 'QA: unknown administrator accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Unauthorized' then raise; end if;
  end;
  insert into research_qa_results values ('non-administrator actor rejected',true);

  if public.research_take_rate_limit(v_bucket,2,60) is not true then raise exception 'QA: first rate-limit hit rejected'; end if;
  if public.research_take_rate_limit(v_bucket,2,60) is not true then raise exception 'QA: second rate-limit hit rejected'; end if;
  if public.research_take_rate_limit(v_bucket,2,60) is not false then raise exception 'QA: rate limit failed to block third attempt'; end if;
  update public.research_limits set window_start=clock_timestamp()-interval '61 seconds' where bucket=v_bucket;
  if public.research_take_rate_limit(v_bucket,2,60) is not true then raise exception 'QA: expired rate-limit window did not reset'; end if;
  insert into research_qa_results values ('persistent rate limit enforces cap and resets expired window',true);

  foreach v_role in array array['anon','authenticated'] loop
    foreach v_table in array array['research_invites','research_submissions','research_reviews','research_limits'] loop
      if has_table_privilege(v_role,'public.'||v_table,'SELECT,INSERT,UPDATE,DELETE') then raise exception 'QA: role % unexpectedly has table access to %',v_role,v_table; end if;
      if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=v_table and c.relrowsecurity) then raise exception 'QA: RLS missing on %',v_table; end if;
    end loop;
    for v_function in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('research_commit_submission','research_review_submission','research_take_rate_limit') loop
      if has_function_privilege(v_role,v_function,'EXECUTE') then raise exception 'QA: role % unexpectedly can execute %',v_role,v_function; end if;
      if not has_function_privilege('service_role',v_function,'EXECUTE') then raise exception 'QA: service role missing permission for %',v_function; end if;
    end loop;
  end loop;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('research_commit_submission','research_review_submission','research_take_rate_limit') and p.prosecdef) then raise exception 'QA: research functions must not be SECURITY DEFINER'; end if;
  insert into research_qa_results values ('RLS enabled; clients denied all table and RPC access; service role retained',true);

  if not exists(select 1 from storage.buckets where id='research-evidence' and public=false and file_size_limit=3145728 and allowed_mime_types @> array['image/png','image/jpeg','image/webp']) then raise exception 'QA: private bucket constraints missing'; end if;
  if not exists(select 1 from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and c.relname='objects' and p.polname='research_evidence_private' and not p.polpermissive and p.polcmd='*') then raise exception 'QA: restrictive private evidence policy missing'; end if;
  insert into research_qa_results values ('private screenshot bucket and restrictive storage policy configured',true);
end
$qa$;

select check_name,passed from research_qa_results order by check_name;
rollback;
