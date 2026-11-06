-- Expire deliberately saved, never-submitted drafts after 72 hours of inactivity.
create index cash_draft_expiry on public.cash_closings(updated_at)
 where status='draft' and first_submitted_at is null;
create function private.purge_expired_cash_drafts() returns integer
language plpgsql volatile security definer set search_path='' as $$
declare candidate uuid; locked_id uuid; removed integer=0;
begin
 for candidate in select id from public.cash_closings where status='draft'
  and first_submitted_at is null and submission_key is null
  and updated_at<=statement_timestamp()-interval '3 days' order by updated_at limit 500 loop
  -- Use the same lock order as the saver; never race a submission or an active edit.
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(candidate::text,731002)) then continue; end if;
  locked_id=null;
  select c.id into locked_id from public.cash_closings c where c.id=candidate
   and c.status='draft' and c.first_submitted_at is null and c.submission_key is null
   and c.updated_at<=statement_timestamp()-interval '3 days'
   and not exists(select 1 from public.closing_events e where e.closing_id=c.id and e.action in ('submitted','reviewed','reopened'))
   for update skip locked;
  if locked_id is null then continue; end if;
  delete from public.cash_count_lines where closing_id=locked_id;
  delete from public.closing_events where closing_id=locked_id;
  delete from public.cash_closings where id=locked_id;
  removed=removed+1;
 end loop;
 return removed;
end;
$$;
revoke all on function private.purge_expired_cash_drafts() from public,anon,authenticated;

-- Hosted PostgreSQL has pg_cron; the embedded test database tests the same
-- cleanup function but does not provide extensions or a background scheduler.
do $schedule$
begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron with schema pg_catalog;
  execute $job$select cron.schedule('os-expire-cash-drafts','17 * * * *',
   $command$select private.purge_expired_cash_drafts();
   delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='os-expire-cash-drafts')
    and end_time<now()-interval '7 days';$command$);$job$;
 end if;
end;
$schedule$;
