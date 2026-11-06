create table public.user_permission_grants (
 user_id uuid not null references public.profiles(id) on delete cascade,
 permission text not null check (permission in ('cash.open','cash.submit','cash.read_own','cash.read_all','cash.archive','cash.review','cash.reopen','cash.reports')),
 expires_at timestamptz,
 primary key(user_id,permission)
);
alter table public.user_permission_grants enable row level security;
revoke all on public.user_permission_grants from public,anon,authenticated;
grant select on public.user_permission_grants to authenticated;
create policy grants_read on public.user_permission_grants for select to authenticated
 using ((select private.is_enabled_staff()) and (user_id=(select auth.uid()) or (select private.is_admin())));

-- Effective rights are checked against server time on every statement, not JWT claims.
create or replace function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_enabled_staff() and exists (
  select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id
  where p.id=(select auth.uid()) and (r.is_admin or permission=any(r.permissions)
   or exists(select 1 from public.user_permission_grants g where g.user_id=p.id
    and (g.permission=has_permission.permission or has_permission.permission='cash.open')
    and (g.expires_at is null or g.expires_at>statement_timestamp())))
 );
$$;

create function private.admin_save_user_grants(p_user_id uuid,p_grants jsonb,p_expected_version integer,p_reason text) returns void
language plpgsql volatile security definer set search_path='' as $$
declare old_values jsonb; new_values jsonb; item jsonb; expiry timestamptz;
begin
 perform private.lock_access_management();
 if p_grants is null or jsonb_typeof(p_grants)<>'array' or jsonb_array_length(p_grants)>8
  or p_reason is null or length(trim(p_reason)) not between 3 and 500 then
  raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id) then
  raise exception 'USER_NOT_FOUND' using errcode='22023'; end if;
 if p_expected_version is null or (select management_version from public.profiles where id=p_user_id)<>p_expected_version then
  raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
 select coalesce(jsonb_agg(to_jsonb(g) order by g.permission),'[]') into old_values from public.user_permission_grants g where user_id=p_user_id;
 delete from public.user_permission_grants where user_id=p_user_id;
 for item in select value from jsonb_array_elements(p_grants) loop
  if jsonb_typeof(item)<>'object' or not item ? 'permission' or not item ? 'expires_at' then
   raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  expiry=(item->>'expires_at')::timestamptz;
  if expiry is not null and (not isfinite(expiry) or expiry<=statement_timestamp()) then
   raise exception 'INVALID_EXPIRY' using errcode='22023'; end if;
  insert into public.user_permission_grants(user_id,permission,expires_at) values(p_user_id,item->>'permission',expiry);
 end loop;
 update public.profiles set management_version=management_version+1 where id=p_user_id;
 select coalesce(jsonb_agg(to_jsonb(g) order by g.permission),'[]') into new_values from public.user_permission_grants g where user_id=p_user_id;
 insert into public.access_events(actor_id,entity_type,entity_id,reason,before_values,after_values)
 values(auth.uid(),'user',p_user_id,trim(p_reason),jsonb_build_object('extra_permissions',old_values),jsonb_build_object('extra_permissions',new_values));
end;
$$;
create function public.admin_save_user_grants(p_user_id uuid,p_grants jsonb,p_expected_version integer,p_reason text) returns void
language sql security invoker set search_path='' as $$ select private.admin_save_user_grants(p_user_id,p_grants,p_expected_version,p_reason); $$;
revoke all on function private.admin_save_user_grants(uuid,jsonb,integer,text),public.admin_save_user_grants(uuid,jsonb,integer,text) from public,anon,authenticated;
grant execute on function private.admin_save_user_grants(uuid,jsonb,integer,text),public.admin_save_user_grants(uuid,jsonb,integer,text) to authenticated;
