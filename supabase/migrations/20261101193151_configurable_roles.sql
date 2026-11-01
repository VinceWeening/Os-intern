-- Configurable application roles. Authentication remains owned by Supabase.
create table public.app_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 60),
  description text not null default '' check (length(description) <= 300),
  is_admin boolean not null default false,
  all_locations boolean not null default false,
  permissions text[] not null default '{}',
  version integer not null default 1 check (version > 0),
  constraint known_permissions check (permissions <@ array['cash.open','cash.submit','cash.read_own','cash.read_all','cash.review','cash.reopen']::text[]),
  constraint permission_dependencies check (cardinality(permissions) = 0 or 'cash.open' = any(permissions)),
  constraint no_null_permissions check (array_position(permissions, null) is null)
);
create unique index app_roles_name_unique on public.app_roles(lower(trim(name)));
insert into public.app_roles(id,name,description,is_admin,all_locations,permissions) values
  ('40000000-0000-0000-0000-000000000001','Medewerker','Kassa-afslag voor toegewezen vestigingen.',false,false,array['cash.open','cash.submit','cash.read_own']),
  ('40000000-0000-0000-0000-000000000002','Manager','Kassa-afslagen van beide vestigingen bekijken en controleren.',false,true,array['cash.open','cash.submit','cash.read_own','cash.read_all','cash.review','cash.reopen']),
  ('40000000-0000-0000-0000-000000000003','Beheerder','Alle onderdelen, gebruikers en rollen beheren.',true,true,array['cash.open','cash.submit','cash.read_own','cash.read_all','cash.review','cash.reopen']);

alter table public.profiles add column access_role_id uuid not null default '40000000-0000-0000-0000-000000000001' references public.app_roles(id);
alter table public.profiles add column management_version integer not null default 1 check (management_version > 0);
update public.profiles set access_role_id='40000000-0000-0000-0000-000000000002' where role='manager';
comment on column public.profiles.role is 'Legacy migration field; not used for authorization. Use access_role_id.';
create index profiles_access_role on public.profiles(access_role_id);
create table public.access_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  entity_type text not null check (entity_type in ('user','role')),
  entity_id uuid not null,
  reason text not null check (length(trim(reason)) between 3 and 500),
  before_values jsonb,
  after_values jsonb not null
);
create index access_events_recent on public.access_events(occurred_at desc);
create index access_events_actor on public.access_events(actor_id);
alter table public.app_roles enable row level security;
alter table public.access_events enable row level security;
revoke all on public.app_roles, public.access_events from anon, authenticated;
grant select on public.app_roles, public.access_events to authenticated;

create function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_enabled_staff() and exists (
   select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id
   where p.id=(select auth.uid()) and r.is_admin
 );
$$;
create function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_enabled_staff() and exists (
   select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id
   where p.id=(select auth.uid()) and (r.is_admin or permission=any(r.permissions))
 );
$$;
-- Kept as a compatibility helper. A permission is no longer inferred from a name.
create or replace function private.is_manager() returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_permission('cash.read_all');
$$;
create or replace function private.can_access_location(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_enabled_staff() and (
  exists (select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id
          where p.id=(select auth.uid()) and (r.is_admin or r.all_locations))
  or exists (select 1 from public.location_memberships where user_id=(select auth.uid()) and location_id=target)
 );
$$;
create or replace function private.can_read_closing(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists (select 1 from public.cash_closings c where c.id=target
  and private.can_access_location(c.location_id)
  and (private.has_permission('cash.read_all') or (c.employee_id=(select auth.uid()) and private.has_permission('cash.read_own'))));
$$;
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
 using (private.is_enabled_staff() and (id=(select auth.uid()) or private.is_admin()));
drop policy memberships_read on public.location_memberships;
create policy memberships_read on public.location_memberships for select to authenticated
 using (private.is_enabled_staff() and (user_id=(select auth.uid()) or private.is_admin()));
drop policy closings_read on public.cash_closings;
create policy closings_read on public.cash_closings for select to authenticated
 using (private.can_access_location(location_id) and (private.has_permission('cash.read_all')
  or (employee_id=(select auth.uid()) and private.has_permission('cash.read_own'))));
create policy roles_read on public.app_roles for select to authenticated using ((select private.is_enabled_staff()));
create policy access_events_read on public.access_events for select to authenticated using ((select private.is_admin()));

-- Serialize all access-management writes. Recheck authority after obtaining the
-- lock: a concurrent admin may have removed the caller's rights while waiting.
create function private.lock_access_management() returns void
language plpgsql volatile security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(731001);
 if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
end;
$$;

create function private.admin_list_users() returns table(
 id uuid, email text, full_name text, access_role_id uuid, active boolean,
 management_version integer, location_ids uuid[], has_profile boolean
)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 return query select u.id, u.email::text, coalesce(p.full_name,''), p.access_role_id, coalesce(p.active,false),
  coalesce(p.management_version,0), coalesce((select array_agg(m.location_id order by m.location_id) from public.location_memberships m where m.user_id=u.id),'{}'::uuid[]), p.id is not null
 from auth.users u left join public.profiles p on p.id=u.id order by lower(coalesce(p.full_name,u.email));
end;
$$;

create function private.admin_save_user(p_id uuid, p_name text, p_role_id uuid,
 p_active boolean, p_location_ids uuid[], p_expected_version integer, p_reason text) returns void
language plpgsql volatile security definer set search_path='' as $$
declare
 old_profile public.profiles;
 old_role public.app_roles;
 new_role public.app_roles;
 old_locations uuid[];
 new_locations uuid[];
 old_snapshot jsonb;
begin
 perform private.lock_access_management();
 if p_id is null or p_name is null or length(trim(p_name)) not between 1 and 120
  or p_active is null or p_expected_version is null or p_reason is null or length(trim(p_reason)) not between 3 and 500
  or p_location_ids is null or array_position(p_location_ids,null) is not null then
  raise exception 'INVALID_INPUT' using errcode='22023';
 end if;
 if not exists(select 1 from auth.users where id=p_id) then raise exception 'USER_NOT_FOUND' using errcode='22023'; end if;
 select * into new_role from public.app_roles where id=p_role_id;
 if not found then raise exception 'ROLE_NOT_FOUND' using errcode='22023'; end if;
 select coalesce(array_agg(distinct x order by x),'{}'::uuid[]) into new_locations from unnest(p_location_ids) x;
 if exists(select 1 from unnest(new_locations) x where not exists(select 1 from public.locations l where l.id=x)) then
  raise exception 'INVALID_LOCATION' using errcode='22023';
 end if;
 select * into old_profile from public.profiles where id=p_id for update;
 if coalesce(old_profile.management_version,0)<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
 select coalesce(array_agg(location_id order by location_id),'{}'::uuid[]) into old_locations from public.location_memberships where user_id=p_id;
 if old_profile.id is not null then
  select * into old_role from public.app_roles where id=old_profile.access_role_id;
  old_snapshot=jsonb_build_object('profile',to_jsonb(old_profile),'location_ids',old_locations);
  if old_profile.active and old_role.is_admin and not (p_active and new_role.is_admin)
    and not exists(select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id where p.active and r.is_admin and p.id<>p_id) then
    raise exception 'LAST_ADMIN' using errcode='23514';
  end if;
 end if;
 insert into public.profiles(id,full_name,access_role_id,active,management_version)
 values(p_id,trim(p_name),p_role_id,p_active,p_expected_version+1)
 on conflict(id) do update set full_name=excluded.full_name,access_role_id=excluded.access_role_id,
  active=excluded.active,management_version=excluded.management_version;
 delete from public.location_memberships where user_id=p_id;
 insert into public.location_memberships(user_id,location_id) select p_id,x from unnest(new_locations) x;
 insert into public.access_events(actor_id,entity_type,entity_id,reason,before_values,after_values)
 values(auth.uid(),'user',p_id,trim(p_reason),old_snapshot,
  jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where p.id=p_id),'location_ids',new_locations));
end;
$$;

create function private.admin_save_role(p_id uuid, p_name text, p_description text,
 p_is_admin boolean, p_all_locations boolean, p_permissions text[], p_expected_version integer, p_reason text) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare old_role public.app_roles; result_id uuid; normalized text[];
begin
 perform private.lock_access_management();
 if p_name is null or length(trim(p_name)) not between 2 and 60 or p_description is null or length(p_description)>300
  or p_is_admin is null or p_all_locations is null or p_permissions is null or array_position(p_permissions,null) is not null
  or p_expected_version is null or p_reason is null or length(trim(p_reason)) not between 3 and 500 then
  raise exception 'INVALID_INPUT' using errcode='22023';
 end if;
 select coalesce(array_agg(distinct x order by x),'{}'::text[]) into normalized from unnest(p_permissions) x;
 if p_id is not null then
  select * into old_role from public.app_roles where id=p_id for update;
  if not found then raise exception 'ROLE_NOT_FOUND' using errcode='22023'; end if;
  if old_role.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if old_role.is_admin and not p_is_admin
   and not exists(select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id where p.active and r.is_admin and r.id<>p_id) then
   raise exception 'LAST_ADMIN' using errcode='23514';
  end if;
  update public.app_roles set name=trim(p_name), description=trim(p_description),is_admin=p_is_admin,
   all_locations=p_all_locations, permissions=normalized,version=version+1 where id=p_id returning id into result_id;
 else
  if p_expected_version<>0 then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  insert into public.app_roles(name,description,is_admin,all_locations,permissions)
   values(trim(p_name),trim(p_description),p_is_admin,p_all_locations,normalized) returning id into result_id;
 end if;
 insert into public.access_events(actor_id,entity_type,entity_id,reason,before_values,after_values)
 values(auth.uid(),'role',result_id,trim(p_reason),case when old_role.id is null then null else to_jsonb(old_role) end,
  (select to_jsonb(r) from public.app_roles r where id=result_id));
 return result_id;
end;
$$;

-- Public API wrappers remain invoker functions; checks live in private helpers.
create function public.admin_list_users() returns table(id uuid,email text,full_name text,access_role_id uuid,active boolean,management_version integer,location_ids uuid[],has_profile boolean)
 language sql security invoker set search_path='' as $$ select * from private.admin_list_users(); $$;
create function public.admin_save_user(p_id uuid,p_name text,p_role_id uuid,p_active boolean,p_location_ids uuid[],p_expected_version integer,p_reason text) returns void
 language sql security invoker set search_path='' as $$ select private.admin_save_user(p_id,p_name,p_role_id,p_active,p_location_ids,p_expected_version,p_reason); $$;
create function public.admin_save_role(p_id uuid,p_name text,p_description text,p_is_admin boolean,p_all_locations boolean,p_permissions text[],p_expected_version integer,p_reason text) returns uuid
 language sql security invoker set search_path='' as $$ select private.admin_save_role(p_id,p_name,p_description,p_is_admin,p_all_locations,p_permissions,p_expected_version,p_reason); $$;

revoke all on function private.is_admin(),private.has_permission(text),private.lock_access_management(),private.admin_list_users(),
 private.admin_save_user(uuid,text,uuid,boolean,uuid[],integer,text),private.admin_save_role(uuid,text,text,boolean,boolean,text[],integer,text)
 from public,anon,authenticated;
grant execute on function private.is_admin(),private.has_permission(text),private.admin_list_users(),
 private.admin_save_user(uuid,text,uuid,boolean,uuid[],integer,text),private.admin_save_role(uuid,text,text,boolean,boolean,text[],integer,text) to authenticated;
revoke all on function public.admin_list_users(),public.admin_save_user(uuid,text,uuid,boolean,uuid[],integer,text),
 public.admin_save_role(uuid,text,text,boolean,boolean,text[],integer,text) from public,anon,authenticated;
grant execute on function public.admin_list_users(),public.admin_save_user(uuid,text,uuid,boolean,uuid[],integer,text),
 public.admin_save_role(uuid,text,text,boolean,boolean,text[],integer,text) to authenticated;
