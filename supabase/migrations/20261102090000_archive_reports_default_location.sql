-- Time-limited insight into colleagues' closings, a full-archive permission,
-- a management report and a personal default location.

alter table public.app_roles drop constraint known_permissions;
alter table public.app_roles add constraint known_permissions check (permissions <@ array[
  'cash.open','cash.submit','cash.read_own','cash.read_all','cash.archive','cash.review','cash.reopen','cash.reports'
]::text[]);
-- Managers could already see the full history; keep that behaviour explicit.
update public.app_roles set permissions=array_append(permissions,'cash.archive')
 where id='40000000-0000-0000-0000-000000000002' and 'cash.read_all'=any(permissions) and not 'cash.archive'=any(permissions);
update public.app_roles set permissions=array['cash.open','cash.submit','cash.read_own','cash.read_all','cash.archive','cash.review','cash.reopen','cash.reports']
 where id='40000000-0000-0000-0000-000000000003' and is_admin;

-- Oldest work date a colleague's closing stays visible without cash.archive.
create function private.recent_cutoff() returns date
language sql stable set search_path='' as $$
 select ((pg_catalog.now() at time zone 'Europe/Amsterdam')::date - 2);
$$;

-- Own closings stay visible; colleagues' closings only for the last two
-- work days unless the role may browse the full archive.
create or replace function private.can_read_closing(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cash_closings c where c.id=target and private.can_access_location(c.location_id)
  and ((c.employee_id=(select auth.uid()) and (private.has_permission('cash.read_own') or private.has_permission('cash.submit')))
   or private.has_permission('cash.archive')
   or (private.has_permission('cash.read_all') and c.work_date>=private.recent_cutoff())));
$$;

alter table public.profiles add column default_location_id uuid references public.locations(id) on delete set null;

create function private.set_default_location(p_location uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
begin
 if not private.is_enabled_staff() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_location is not null and not private.can_access_location(p_location) then
  raise exception 'LOCATION_FORBIDDEN' using errcode='42501'; end if;
 update public.profiles set default_location_id=p_location where id=(select auth.uid());
end;
$$;

-- Submitted and reviewed closings in a date range, for roles with cash.reports.
create function private.cash_report(p_from date,p_to date) returns table(
 id uuid,location_id uuid,location_name text,work_date date,employee_name text,status public.closing_status,
 turnover_cents bigint,sold_vouchers_cents bigint,ideal_cents bigint,pax_cents bigint,paynl_cents bigint,
 shop_vouchers_cents bigint,redeemed_vouchers_cents bigint,counted_cents bigint,opening_cents bigint,
 cash_cents bigint,result_cents bigint,register_cents bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_permission('cash.reports') then raise exception 'REPORTS_FORBIDDEN' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'INVALID_PERIOD' using errcode='22023'; end if;
 return query
  select c.id,c.location_id,l.name,c.work_date,c.employee_name,c.status,
   c.turnover_cents,c.sold_vouchers_cents,c.ideal_cents,c.pax_cents,c.paynl_cents,
   c.shop_vouchers_cents,c.redeemed_vouchers_cents,c.counted_cents::bigint,c.opening_cents,
   c.cash_cents,c.result_cents,c.register_cents
  from public.cash_closings c join public.locations l on l.id=c.location_id
  where c.status in ('submitted','reviewed') and c.work_date between p_from and p_to
   and private.can_access_location(c.location_id)
  order by c.work_date,l.name;
end;
$$;

create function public.set_default_location(p_location uuid) returns void
language sql security invoker set search_path='' as $$ select private.set_default_location(p_location); $$;
create function public.cash_report(p_from date,p_to date) returns table(
 id uuid,location_id uuid,location_name text,work_date date,employee_name text,status public.closing_status,
 turnover_cents bigint,sold_vouchers_cents bigint,ideal_cents bigint,pax_cents bigint,paynl_cents bigint,
 shop_vouchers_cents bigint,redeemed_vouchers_cents bigint,counted_cents bigint,opening_cents bigint,
 cash_cents bigint,result_cents bigint,register_cents bigint)
language sql security invoker set search_path='' as $$ select * from private.cash_report(p_from,p_to); $$;

revoke all on function private.recent_cutoff(),private.set_default_location(uuid),private.cash_report(date,date) from public,anon,authenticated;
grant execute on function private.set_default_location(uuid),private.cash_report(date,date) to authenticated;
revoke all on function public.set_default_location(uuid),public.cash_report(date,date) from public,anon,authenticated;
grant execute on function public.set_default_location(uuid),public.cash_report(date,date) to authenticated;
