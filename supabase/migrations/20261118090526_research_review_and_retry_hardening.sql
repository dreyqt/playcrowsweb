-- Guard every review against stale same-status edits and status ABA races.
drop function public.research_review_submission(uuid,uuid,text,text,text);
create function public.research_review_submission(
  p_id uuid,p_actor uuid,p_status text,p_expected_status text,p_notes text,p_expected_reviewed_at timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_row public.research_submissions;
begin
  if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'Unauthorized'; end if;
  if p_status not in ('pending','approved','rejected') or length(trim(p_notes)) not between 10 and 4000 then raise exception 'Review notes required'; end if;
  select * into v_row from public.research_submissions where id=p_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v_row.status is distinct from p_expected_status or v_row.reviewed_at is distinct from p_expected_reviewed_at then raise exception 'Review conflict'; end if;
  insert into public.research_reviews(submission_id,actor_id,previous_status,status,notes)
  values(p_id,p_actor,v_row.status,p_status,trim(p_notes));
  update public.research_submissions set status=p_status,reviewed_at=clock_timestamp(),reviewed_by=p_actor,review_notes=trim(p_notes)
  where id=p_id returning * into v_row;
  return to_jsonb(v_row);
end $$;
revoke all on function public.research_review_submission(uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.research_review_submission(uuid,uuid,text,text,text,timestamptz) to service_role;
