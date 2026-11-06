-- Daily summaries are separate from cash drafts and never expire with them.
alter table public.app_roles drop constraint known_permissions;
alter table public.app_roles add constraint known_permissions check(permissions <@ array['cash.open','cash.submit','cash.read_own','cash.read_all','cash.archive','cash.review','cash.reopen','cash.reports','cash.shared_account','day.open','day.edit']::text[]);
alter table public.app_roles drop constraint permission_dependencies;
alter table public.app_roles add constraint permission_dependencies check(
 (not permissions && array['cash.submit','cash.read_own','cash.read_all','cash.archive','cash.review','cash.reopen','cash.reports','cash.shared_account']::text[] or 'cash.open'=any(permissions))
 and (not 'day.edit'=any(permissions) or 'day.open'=any(permissions)));
alter table public.user_permission_grants drop constraint user_permission_grants_permission_check;
alter table public.user_permission_grants add constraint user_permission_grants_permission_check check(permission in ('cash.open','cash.submit','cash.read_own','cash.read_all','cash.archive','cash.review','cash.reopen','cash.reports','day.open','day.edit'));
do $$ declare source text; begin
 source=pg_get_functiondef('private.admin_save_user_grants(uuid,jsonb,integer,text)'::regprocedure);
 execute replace(source,'jsonb_array_length(p_grants)>8','jsonb_array_length(p_grants)>10');
end $$;
create or replace function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_enabled_staff() and exists(select 1 from public.profiles p join public.app_roles r on r.id=p.access_role_id
 where p.id=(select auth.uid()) and (r.is_admin or permission=any(r.permissions) or exists(
  select 1 from public.user_permission_grants g where g.user_id=p.id and (g.permission=has_permission.permission
   or (has_permission.permission='cash.open' and g.permission like 'cash.%') or (has_permission.permission='day.open' and g.permission='day.edit'))
  and (g.expires_at is null or g.expires_at>statement_timestamp()))));
$$;

create table public.feedback (
 id uuid primary key, author_id uuid not null references public.profiles(id), author_name text not null,
 location_id uuid references public.locations(id), kind text not null check(kind in ('idea','bug')),
 title text not null check(length(trim(title)) between 3 and 120), description text not null check(length(trim(description)) between 3 and 4000),
 status text not null default 'new' check(status in ('new','planned','done')),
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index feedback_author on public.feedback(author_id);
alter table public.feedback enable row level security;
revoke all on public.feedback from public,anon,authenticated;
grant select on public.feedback to authenticated;
create policy feedback_read on public.feedback for select to authenticated using((select private.is_enabled_staff()) and (author_id=(select auth.uid()) or (select private.is_admin())));
create function private.send_feedback(p_id uuid,p_location uuid,p_kind text,p_title text,p_description text) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare old public.feedback;
begin
 if not private.is_enabled_staff() or (p_location is not null and not private.can_access_location(p_location)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,731003));
 select * into old from public.feedback where id=p_id;
 if found then
  if old.author_id<>auth.uid() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return old.id;
 end if;
 insert into public.feedback(id,author_id,author_name,location_id,kind,title,description)
 select p_id,p.id,p.full_name,p_location,p_kind,trim(p_title),trim(p_description) from public.profiles p where p.id=auth.uid();
 return p_id;
end;
$$;
create function private.update_feedback(p_id uuid,p_version integer,p_status text) returns void
language plpgsql volatile security definer set search_path='' as $$
begin
 perform private.lock_access_management();
 update public.feedback set status=p_status,version=version+1,updated_at=now() where id=p_id and version=p_version;
 if not found then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
end;
$$;

create table public.daily_summaries (
 id uuid primary key default gen_random_uuid(),location_id uuid not null references public.locations(id),work_date date not null,
 notes text not null default '' check(length(notes)<=4000),rides jsonb not null default '[]',diners text not null default '' check(length(diners)<=4000),waste jsonb not null default '[]',
 version integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid not null references public.profiles(id),updated_name text not null,
 unique(location_id,work_date)
);
alter table public.daily_summaries enable row level security;
revoke all on public.daily_summaries from public,anon,authenticated;
grant select on public.daily_summaries to authenticated;
create policy daily_read on public.daily_summaries for select to authenticated using((select private.has_permission('day.open')) and private.can_access_location(location_id));
create table public.daily_events (
 id uuid primary key default gen_random_uuid(),summary_id uuid not null references public.daily_summaries(id),actor_id uuid not null references public.profiles(id),occurred_at timestamptz not null default now(),before_values jsonb,after_values jsonb not null
);
create index daily_events_summary on public.daily_events(summary_id);
alter table public.daily_events enable row level security;
revoke all on public.daily_events from public,anon,authenticated;
grant select on public.daily_events to authenticated;
create policy daily_events_read on public.daily_events for select to authenticated using(exists(select 1 from public.daily_summaries d where d.id=summary_id));
create function private.save_daily_summary(p_location uuid,p_date date,p_version integer,p_payload jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare old public.daily_summaries; saved public.daily_summaries; item jsonb; k text; field text; actor text;
begin
 if not private.has_permission('day.edit') or not private.can_access_location(p_location) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_date is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or p_version is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_location::text||p_date::text,731004));
 if not private.has_permission('day.edit') or not private.can_access_location(p_location) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into old from public.daily_summaries where location_id=p_location and work_date=p_date for update;
 if coalesce(old.version,0)<>p_version then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
 foreach field in array array['notes','diners'] loop
  if jsonb_typeof(p_payload->field) is distinct from 'string' or length(p_payload->>field)>4000 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 end loop;
 foreach field in array array['rides','waste'] loop
  if jsonb_typeof(p_payload->field) is distinct from 'array' or jsonb_array_length(p_payload->field)>50 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  for item in select x from jsonb_array_elements(p_payload->field) x loop
   if jsonb_typeof(item) is distinct from 'object' then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
   for k in select unnest(case when field='rides' then array['car','driver','passengers'] else array['product','quantity','reason'] end) loop
    if jsonb_typeof(item->k) is distinct from 'string' or length(item->>k)>500 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
   end loop;
   if (field='rides' and (length(trim(item->>'car'))=0 or length(trim(item->>'driver'))=0)) or (field='waste' and (length(trim(item->>'product'))=0 or length(trim(item->>'quantity'))=0)) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  end loop;
 end loop;
 select full_name into actor from public.profiles where id=auth.uid();
 insert into public.daily_summaries(location_id,work_date,notes,diners,rides,waste,updated_by,updated_name)
 values(p_location,p_date,p_payload->>'notes',p_payload->>'diners',p_payload->'rides',p_payload->'waste',auth.uid(),actor)
 on conflict(location_id,work_date) do update set notes=excluded.notes,diners=excluded.diners,rides=excluded.rides,waste=excluded.waste,updated_by=excluded.updated_by,updated_name=excluded.updated_name,updated_at=now(),version=public.daily_summaries.version+1 returning * into saved;
 insert into public.daily_events(summary_id,actor_id,before_values,after_values) values(saved.id,auth.uid(),case when old.id is not null then to_jsonb(old) end,to_jsonb(saved));
 return to_jsonb(saved);
end;
$$;
create function public.send_feedback(p_id uuid,p_location uuid,p_kind text,p_title text,p_description text) returns uuid language sql security invoker set search_path='' as $$ select private.send_feedback(p_id,p_location,p_kind,p_title,p_description); $$;
create function public.update_feedback(p_id uuid,p_version integer,p_status text) returns void language sql security invoker set search_path='' as $$ select private.update_feedback(p_id,p_version,p_status); $$;
create function public.save_daily_summary(p_location uuid,p_date date,p_version integer,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.save_daily_summary(p_location,p_date,p_version,p_payload); $$;
revoke all on function private.send_feedback(uuid,uuid,text,text,text),private.update_feedback(uuid,integer,text),private.save_daily_summary(uuid,date,integer,jsonb),public.send_feedback(uuid,uuid,text,text,text),public.update_feedback(uuid,integer,text),public.save_daily_summary(uuid,date,integer,jsonb) from public,anon,authenticated;
grant execute on function private.send_feedback(uuid,uuid,text,text,text),private.update_feedback(uuid,integer,text),private.save_daily_summary(uuid,date,integer,jsonb),public.send_feedback(uuid,uuid,text,text,text),public.update_feedback(uuid,integer,text),public.save_daily_summary(uuid,date,integer,jsonb) to authenticated;
