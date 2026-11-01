-- Phase 1: read-only app foundation. Version matches the applied hosted migration.
-- Execute using migrations as the database owner, never from the frontend.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.staff_role as enum ('employee', 'manager');
create type public.closing_status as enum ('draft', 'submitted', 'reviewed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  role public.staff_role not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('heiloo', 'heerhugowaard')),
  name text not null
);
insert into public.locations(id, slug, name) values
  ('10000000-0000-0000-0000-000000000001', 'heiloo', 'Heiloo'),
  ('10000000-0000-0000-0000-000000000002', 'heerhugowaard', 'Heerhugowaard');

create table public.location_memberships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary key (user_id, location_id)
);

create table public.cash_closings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id),
  work_date date not null,
  employee_id uuid not null references public.profiles(id),
  employee_name text not null check (length(trim(employee_name)) between 1 and 120),
  status public.closing_status not null default 'draft',
  expected_cents bigint check (expected_cents between 0 and 1000000000),
  counted_cents bigint not null default 0 check (counted_cents between 0 and 1000000000),
  difference_cents bigint generated always as (counted_cents - expected_cents) stored,
  difference_explanation text not null default '' check (length(difference_explanation) <= 4000),
  notes text not null default '' check (length(notes) <= 4000),
  version integer not null default 1 check (version > 0),
  submission_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Retain the first submission timestamp when reopened, reserving this day.
  first_submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  constraint submitted_has_amounts check (
    status = 'draft' or (expected_cents is not null and first_submitted_at is not null
      and submission_key is not null and (difference_cents = 0 or length(trim(difference_explanation)) > 0))
  ),
  constraint reviewed_has_reviewer check (
    (status = 'reviewed' and reviewed_at is not null and reviewed_by is not null)
    or (status <> 'reviewed' and reviewed_at is null and reviewed_by is null)
  )
);
-- A reopened closing retains its reservation: a second final closing cannot appear.
create unique index one_final_closing_per_location_day
  on public.cash_closings(location_id, work_date) where first_submitted_at is not null;
create index closings_filter on public.cash_closings(location_id, work_date desc, status);
create index closings_employee on public.cash_closings(employee_id);

create table public.cash_count_lines (
  closing_id uuid not null references public.cash_closings(id) on delete restrict,
  denomination_cents integer not null check (denomination_cents in (1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000,50000)),
  quantity integer not null check (quantity between 0 and 10000),
  subtotal_cents bigint generated always as (denomination_cents::bigint * quantity) stored,
  primary key (closing_id, denomination_cents)
);

create table public.closing_events (
  id uuid primary key default gen_random_uuid(),
  closing_id uuid not null references public.cash_closings(id) on delete restrict,
  actor_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  action text not null check (action in ('created', 'saved', 'submitted', 'reviewed', 'reopened')),
  reason text,
  before_values jsonb,
  after_values jsonb not null,
  constraint reopening_requires_reason check (action <> 'reopened' or length(trim(coalesce(reason, ''))) > 0)
);
create index events_closing on public.closing_events(closing_id, occurred_at);

-- These helpers read server-managed roles and assignments. They do not trust
-- user_metadata, a UI role selector, or arbitrary user IDs from the caller.
create function private.is_enabled_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active)
    and exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified' and f.factor_type = 'totp');
$$;
create function private.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_enabled_staff() and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'manager'
  );
$$;
create function private.can_access_location(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_enabled_staff() and (private.is_manager() or exists (
    select 1 from public.location_memberships where user_id = (select auth.uid()) and location_id = target
  ));
$$;
create function private.can_read_closing(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cash_closings c where c.id = target
    and private.can_access_location(c.location_id)
    and (c.employee_id = (select auth.uid()) or private.is_manager()));
$$;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_enabled_staff(), private.is_manager(),
  private.can_access_location(uuid), private.can_read_closing(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.location_memberships enable row level security;
alter table public.cash_closings enable row level security;
alter table public.cash_count_lines enable row level security;
alter table public.closing_events enable row level security;

-- No browser or app writes in phase 1. Owner/service-role setup is out of band.
revoke all on public.profiles, public.locations, public.location_memberships,
  public.cash_closings, public.cash_count_lines, public.closing_events from anon, authenticated;
grant select on public.profiles, public.locations, public.location_memberships,
  public.cash_closings, public.cash_count_lines, public.closing_events to authenticated;

create policy profiles_read on public.profiles for select to authenticated
  using (private.is_enabled_staff() and (id = (select auth.uid()) or private.is_manager()));
create policy locations_read on public.locations for select to authenticated
  using (private.can_access_location(id));
create policy memberships_read on public.location_memberships for select to authenticated
  using (private.is_enabled_staff() and (user_id = (select auth.uid()) or private.is_manager()));
create policy closings_read on public.cash_closings for select to authenticated
  using (private.can_access_location(location_id) and (employee_id = (select auth.uid()) or private.is_manager()));
create policy count_lines_read on public.cash_count_lines for select to authenticated
  using (private.can_read_closing(closing_id));
create policy events_read on public.closing_events for select to authenticated
  using (private.can_read_closing(closing_id));
