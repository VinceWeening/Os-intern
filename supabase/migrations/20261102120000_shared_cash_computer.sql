-- A shared OS computer account: the closing is recorded on the employee who
-- picks their name, while the audit trail keeps the computer as the actor.

alter table public.app_roles drop constraint known_permissions;
alter table public.app_roles add constraint known_permissions check (permissions <@ array[
  'cash.open','cash.submit','cash.read_own','cash.read_all','cash.archive','cash.review','cash.reopen','cash.reports','cash.shared_account'
]::text[]);
insert into public.app_roles(id,name,description,is_admin,all_locations,permissions) values
 ('40000000-0000-0000-0000-000000000004','Kassacomputer','Gedeeld account op de kassacomputer. Bij een afslag kiest de medewerker zijn naam.',
  false,false,array['cash.open','cash.submit','cash.read_own','cash.shared_account'])
on conflict (id) do nothing;

alter table public.cash_closings add column created_by uuid references public.profiles(id) on delete set null;

-- Administrators have every permission, but are never a shared account.
create function private.is_shared_account() returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_enabled_staff() and exists(select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id
  where p.id=(select auth.uid()) and not r.is_admin and 'cash.shared_account'=any(r.permissions));
$$;

-- Active personal accounts that may submit closings for a location.
create function private.cash_staff_for(p_location uuid) returns table(id uuid,full_name text)
language sql stable security definer set search_path='' as $$
 select p.id,p.full_name from public.profiles p join public.app_roles r on r.id=p.access_role_id
 where p.active and (r.is_admin or ('cash.submit'=any(r.permissions) and not 'cash.shared_account'=any(r.permissions)))
  and (r.is_admin or r.all_locations or exists(select 1 from public.location_memberships m where m.user_id=p.id and m.location_id=p_location))
 order by p.full_name;
$$;

create function private.cash_staff(p_location uuid) returns table(id uuid,full_name text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_shared_account() then raise exception 'CASH_FORBIDDEN' using errcode='42501'; end if;
 if p_location is null or not private.can_access_location(p_location) then raise exception 'LOCATION_FORBIDDEN' using errcode='42501'; end if;
 return query select s.id,s.full_name from private.cash_staff_for(p_location) s;
end;
$$;

-- The computer may read and continue only what it entered itself, for the
-- same two work days that apply to colleagues.
create or replace function private.can_read_closing(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cash_closings c where c.id=target and private.can_access_location(c.location_id)
  and ((c.employee_id=(select auth.uid()) and (private.has_permission('cash.read_own') or private.has_permission('cash.submit')))
   or (c.created_by=(select auth.uid()) and private.is_shared_account() and c.work_date>=private.recent_cutoff())
   or private.has_permission('cash.archive')
   or (private.has_permission('cash.read_all') and c.work_date>=private.recent_cutoff())));
$$;
create or replace function private.can_edit_closing(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_permission('cash.submit') and exists(select 1 from public.cash_closings c
  where c.id=target and private.can_access_location(c.location_id) and c.status='draft'
   and (c.employee_id=(select auth.uid())
    or (c.created_by=(select auth.uid()) and private.is_shared_account() and c.work_date>=private.recent_cutoff())
    or (c.first_submitted_at is not null and private.has_permission('cash.reopen'))));
$$;

-- The existing save logic stays intact; this wrapper assigns the employee.
alter function private.save_cash_closing(uuid,integer,jsonb,boolean,uuid) rename to save_cash_closing_core;
revoke all on function private.save_cash_closing_core(uuid,integer,jsonb,boolean,uuid) from public,anon,authenticated;

create function private.save_cash_closing(p_id uuid,p_expected_version integer,p_payload jsonb,p_submit boolean,p_submission_key uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare existing public.cash_closings; chosen uuid; chosen_name text; snapshot jsonb; earlier uuid[];
begin
 if not private.is_shared_account() then
  return private.save_cash_closing_core(p_id,p_expected_version,p_payload,p_submit,p_submission_key);
 end if;
 if coalesce(p_payload->>'employee_id','')!~'^[0-9a-fA-F-]{36}$' then raise exception 'EMPLOYEE_REQUIRED' using errcode='22023'; end if;
 chosen=(p_payload->>'employee_id')::uuid;
 if coalesce(p_payload->>'location_id','')!~'^[0-9a-fA-F-]{36}$'
  or not exists(select 1 from private.cash_staff_for((p_payload->>'location_id')::uuid) s where s.id=chosen) then
  raise exception 'EMPLOYEE_FORBIDDEN' using errcode='42501'; end if;
 select * into existing from public.cash_closings where id=p_id;
 select coalesce(array_agg(e.id),'{}') into earlier from public.closing_events e where e.closing_id=p_id;
 snapshot=private.save_cash_closing_core(p_id,p_expected_version,p_payload,p_submit,p_submission_key);
 -- An idempotent retry returns the already submitted closing unchanged.
 if existing.id is not null and existing.status<>'draft' then return snapshot; end if;
 select p.full_name into chosen_name from public.profiles p where p.id=chosen;
 update public.cash_closings c set employee_id=chosen,employee_name=chosen_name,created_by=coalesce(c.created_by,auth.uid()) where c.id=p_id;
 -- Only the event this save added should show the chosen employee.
 update public.closing_events e set after_values=private.cash_snapshot(p_id)
  where e.closing_id=p_id and e.id<>all(earlier);
 return private.cash_snapshot(p_id);
end;
$$;

create function public.cash_staff(p_location uuid) returns table(id uuid,full_name text)
language sql security invoker set search_path='' as $$ select * from private.cash_staff(p_location); $$;

revoke all on function private.is_shared_account(),private.cash_staff_for(uuid),private.cash_staff(uuid),private.save_cash_closing(uuid,integer,jsonb,boolean,uuid) from public,anon,authenticated;
grant execute on function private.cash_staff(uuid),private.save_cash_closing(uuid,integer,jsonb,boolean,uuid) to authenticated;
revoke all on function public.cash_staff(uuid) from public,anon,authenticated;
grant execute on function public.cash_staff(uuid) to authenticated;
