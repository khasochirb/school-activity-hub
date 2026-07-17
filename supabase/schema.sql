-- School Activity Hub MVP schema for Supabase PostgreSQL.
-- Phase 1 only: tables, constraints, RLS policies, and fake seed data.
-- Supabase Auth owns auth.users. public.profiles links app roles to auth users.

create extension if not exists pgcrypto;

do $$
begin
  create type public.school_status as enum ('active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.profile_role as enum ('school_admin', 'teacher', 'student');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.profile_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.school_connection_status as enum (
    'pending',
    'approved',
    'rejected',
    'blocked',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.roster_status as enum ('active', 'inactive', 'graduated', 'withdrawn');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.invite_code_status as enum ('active', 'redeemed', 'revoked', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.club_status as enum ('active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.club_member_role as enum ('member', 'leader');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.club_member_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_status as enum (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'canceled',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_risk_level as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_attendee_status as enum (
    'registered',
    'attended',
    'no_show',
    'canceled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_permission_status as enum (
    'not_required',
    'pending',
    'received',
    'declined'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.checkin_method as enum ('qr', 'manual', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.checkin_result as enum ('success', 'duplicate', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  province text,
  timezone text not null default 'America/Vancouver',
  status public.school_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_name_not_blank check (length(btrim(name)) > 0),
  constraint schools_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  role public.profile_role not null default 'student',
  status public.profile_status not null default 'active',
  username text,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_id_school_unique unique (id, school_id),
  constraint profiles_full_name_not_blank check (length(btrim(full_name)) > 0),
  constraint profiles_username_format check (
    username is null
    or username ~ '^[a-z0-9_][a-z0-9_.-]{1,30}$'
  )
);

create unique index if not exists profiles_school_username_unique
  on public.profiles (school_id, lower(username))
  where username is not null;

create table if not exists public.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_school_id uuid references public.schools(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_created_at_idx
  on public.platform_audit_logs (created_at desc);

create index if not exists platform_audit_logs_target_school_created_at_idx
  on public.platform_audit_logs (target_school_id, created_at desc);

create table if not exists public.school_connections (
  id uuid primary key default gen_random_uuid(),
  requester_school_id uuid not null references public.schools(id) on delete cascade,
  receiver_school_id uuid not null references public.schools(id) on delete cascade,
  requested_by_profile_id uuid references public.profiles(id) on delete set null,
  responded_by_profile_id uuid references public.profiles(id) on delete set null,
  status public.school_connection_status not null default 'pending',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_connections_different_schools check (
    requester_school_id <> receiver_school_id
  )
);

alter table public.school_connections
  add column if not exists requested_at timestamptz not null default now();

create unique index if not exists school_connections_school_pair_unique
  on public.school_connections (
    least(requester_school_id::text, receiver_school_id::text),
    greatest(requester_school_id::text, receiver_school_id::text)
  );

create index if not exists school_connections_requester_status_idx
  on public.school_connections (requester_school_id, status, created_at desc);

create index if not exists school_connections_receiver_status_idx
  on public.school_connections (receiver_school_id, status, created_at desc);

create table if not exists public.student_rosters (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  student_number text,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  grade_level text,
  homeroom text,
  status public.roster_status not null default 'active',
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_rosters_id_school_unique unique (id, school_id),
  constraint student_rosters_first_name_not_blank check (length(btrim(first_name)) > 0),
  constraint student_rosters_last_name_not_blank check (length(btrim(last_name)) > 0)
);

create unique index if not exists student_rosters_school_student_number_unique
  on public.student_rosters (school_id, student_number)
  where student_number is not null;

create unique index if not exists student_rosters_profile_unique
  on public.student_rosters (profile_id)
  where profile_id is not null;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_school_status_created_at_idx
  on public.announcements (school_id, status, created_at desc);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_roster_id uuid,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  code_hash text not null unique,
  code_hint text,
  status public.invite_code_status not null default 'active',
  max_uses integer not null default 1,
  use_count integer not null default 0,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invite_codes_one_time_only check (max_uses = 1),
  constraint invite_codes_use_count_valid check (use_count between 0 and max_uses),
  constraint invite_codes_roster_school_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id)
    on delete cascade
);

create index if not exists invite_codes_school_status_idx
  on public.invite_codes (school_id, status, expires_at);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  advisor_profile_id uuid references public.profiles(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  category text,
  status public.club_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_id_school_unique unique (id, school_id),
  constraint clubs_school_slug_unique unique (school_id, slug),
  constraint clubs_name_not_blank check (length(btrim(name)) > 0),
  constraint clubs_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

-- Existing Supabase projects may already have public.clubs from an older
-- schema. Keep this non-destructive patch so rerunning the schema adds the
-- optional category field without dropping data.
alter table public.clubs
  add column if not exists category text;

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  club_id uuid not null,
  student_roster_id uuid not null,
  role public.club_member_role not null default 'member',
  status public.club_member_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_memberships_club_student_unique unique (club_id, student_roster_id),
  constraint club_memberships_club_school_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id)
    on delete cascade,
  constraint club_memberships_student_school_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id)
    on delete cascade
);

create index if not exists club_memberships_school_student_idx
  on public.club_memberships (school_id, student_roster_id);

create table if not exists public.club_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  converted_club_id uuid references public.clubs(id) on delete set null,
  title text not null,
  description text,
  category text,
  status text not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_requests_title_not_blank check (length(btrim(title)) > 0),
  constraint club_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'archived')
  )
);

create index if not exists club_requests_school_status_created_at_idx
  on public.club_requests (school_id, status, created_at desc);

create table if not exists public.club_request_supports (
  id uuid primary key default gen_random_uuid(),
  club_request_id uuid not null references public.club_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint club_request_supports_request_profile_unique unique (
    club_request_id,
    profile_id
  )
);

create index if not exists club_request_supports_request_idx
  on public.club_request_supports (club_request_id);

create index if not exists club_request_supports_profile_idx
  on public.club_request_supports (profile_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  club_id uuid,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  submitted_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  category text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer,
  allow_connected_school_registration boolean not null default false,
  risk_level public.event_risk_level not null default 'low',
  permission_required boolean not null default false,
  permission_note text,
  status public.event_status not null default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_id_school_unique unique (id, school_id),
  constraint events_title_not_blank check (length(btrim(title)) > 0),
  constraint events_time_order check (ends_at > starts_at),
  constraint events_capacity_positive check (capacity is null or capacity > 0),
  constraint events_club_school_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id)
    on delete restrict
);

alter table public.events
  add column if not exists category text;

alter table public.events
  add column if not exists allow_connected_school_registration boolean not null default false;

alter table public.events
  add column if not exists risk_level public.event_risk_level not null default 'low';

alter table public.events
  add column if not exists permission_required boolean not null default false;

alter table public.events
  add column if not exists permission_note text;

alter table public.events
  drop constraint if exists events_connected_registration_requires_shared;

create index if not exists events_school_status_starts_at_idx
  on public.events (school_id, status, starts_at);

create index if not exists events_school_club_idx
  on public.events (school_id, club_id);

create table if not exists public.event_school_shares (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, school_id)
);

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  event_id uuid not null,
  student_roster_id uuid,
  attendee_school_id uuid not null references public.schools(id) on delete cascade,
  attendee_profile_id uuid references public.profiles(id) on delete set null,
  status public.event_attendee_status not null default 'registered',
  permission_status public.event_permission_status not null default 'not_required',
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_attendees_id_school_unique unique (id, school_id),
  constraint event_attendees_event_student_unique unique (event_id, student_roster_id),
  constraint event_attendees_event_school_fk foreign key (event_id, school_id)
    references public.events(id, school_id)
    on delete cascade,
  constraint event_attendees_student_school_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id)
    on delete cascade
);

alter table public.event_attendees
  add column if not exists attendee_school_id uuid references public.schools(id) on delete cascade;

alter table public.event_attendees
  add column if not exists attendee_profile_id uuid references public.profiles(id) on delete set null;

alter table public.event_attendees
  add column if not exists permission_status public.event_permission_status not null default 'not_required';

alter table public.event_attendees
  alter column student_roster_id drop not null;

update public.event_attendees
set attendee_school_id = school_id
where attendee_school_id is null;

update public.event_attendees ea
set attendee_profile_id = sr.profile_id
from public.student_rosters sr
where ea.student_roster_id = sr.id
  and ea.attendee_profile_id is null
  and sr.profile_id is not null;

alter table public.event_attendees
  alter column attendee_school_id set not null;

update public.event_attendees ea
set permission_status = case
  when e.permission_required then 'pending'::public.event_permission_status
  else 'not_required'::public.event_permission_status
end
from public.events e
where e.id = ea.event_id
  and e.school_id = ea.school_id
  and ea.permission_status = 'not_required';

create index if not exists event_attendees_school_student_idx
  on public.event_attendees (school_id, student_roster_id);

create index if not exists event_attendees_attendee_profile_idx
  on public.event_attendees (attendee_school_id, attendee_profile_id);

create unique index if not exists event_attendees_event_profile_unique
  on public.event_attendees (event_id, attendee_profile_id)
  where attendee_profile_id is not null;

create table if not exists public.attendance_checkins (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  event_id uuid not null,
  student_roster_id uuid,
  event_attendee_id uuid references public.event_attendees(id) on delete set null,
  attendee_school_id uuid not null references public.schools(id) on delete cascade,
  attendee_profile_id uuid references public.profiles(id) on delete set null,
  checked_in_by_profile_id uuid references public.profiles(id) on delete set null,
  method public.checkin_method not null,
  result public.checkin_result not null,
  qr_token_hash text,
  checked_in_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint attendance_checkins_event_school_fk foreign key (event_id, school_id)
    references public.events(id, school_id)
    on delete cascade,
  constraint attendance_checkins_student_school_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id)
    on delete cascade
);

alter table public.attendance_checkins
  add column if not exists attendee_school_id uuid references public.schools(id) on delete cascade;

alter table public.attendance_checkins
  add column if not exists attendee_profile_id uuid references public.profiles(id) on delete set null;

alter table public.attendance_checkins
  alter column student_roster_id drop not null;

update public.attendance_checkins
set attendee_school_id = school_id
where attendee_school_id is null;

update public.attendance_checkins ac
set attendee_profile_id = sr.profile_id
from public.student_rosters sr
where ac.student_roster_id = sr.id
  and ac.attendee_profile_id is null
  and sr.profile_id is not null;

alter table public.attendance_checkins
  alter column attendee_school_id set not null;

create index if not exists attendance_checkins_school_event_idx
  on public.attendance_checkins (school_id, event_id, checked_in_at desc);

create index if not exists attendance_checkins_school_student_idx
  on public.attendance_checkins (school_id, student_roster_id, checked_in_at desc);

create index if not exists attendance_checkins_attendee_profile_idx
  on public.attendance_checkins (attendee_school_id, attendee_profile_id, checked_in_at desc);

create unique index if not exists attendance_checkins_one_success_per_event_student
  on public.attendance_checkins (event_id, student_roster_id)
  where result = 'success';

create unique index if not exists attendance_checkins_one_success_per_event_profile
  on public.attendance_checkins (event_id, attendee_profile_id)
  where result = 'success' and attendee_profile_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_school_connection_identity_changes()
returns trigger
language plpgsql
as $$
begin
  if new.requester_school_id <> old.requester_school_id
    or new.receiver_school_id <> old.receiver_school_id
    or new.requested_by_profile_id is distinct from old.requested_by_profile_id
    or new.requested_at <> old.requested_at then
    raise exception 'School connection request identity cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_schools_updated_at on public.schools;
create trigger set_schools_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists prevent_school_connection_identity_changes on public.school_connections;
create trigger prevent_school_connection_identity_changes
  before update on public.school_connections
  for each row execute function public.prevent_school_connection_identity_changes();

drop trigger if exists set_school_connections_updated_at on public.school_connections;
create trigger set_school_connections_updated_at
  before update on public.school_connections
  for each row execute function public.set_updated_at();

drop trigger if exists set_student_rosters_updated_at on public.student_rosters;
create trigger set_student_rosters_updated_at
  before update on public.student_rosters
  for each row execute function public.set_updated_at();

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

drop trigger if exists set_invite_codes_updated_at on public.invite_codes;
create trigger set_invite_codes_updated_at
  before update on public.invite_codes
  for each row execute function public.set_updated_at();

drop trigger if exists set_clubs_updated_at on public.clubs;
create trigger set_clubs_updated_at
  before update on public.clubs
  for each row execute function public.set_updated_at();

drop trigger if exists set_club_memberships_updated_at on public.club_memberships;
create trigger set_club_memberships_updated_at
  before update on public.club_memberships
  for each row execute function public.set_updated_at();

drop trigger if exists set_club_requests_updated_at on public.club_requests;
create trigger set_club_requests_updated_at
  before update on public.club_requests
  for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists set_event_attendees_updated_at on public.event_attendees;
create trigger set_event_attendees_updated_at
  before update on public.event_attendees
  for each row execute function public.set_updated_at();

create or replace function public.current_profile_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.school_id
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.current_profile_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('school_admin', 'teacher')
$$;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.profile_id = auth.uid()
      and pa.status = 'active'
  )
$$;

create or replace function public.current_user_can_manage_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_school_id = public.current_profile_school_id()
    and public.current_profile_role() in ('school_admin', 'teacher')
$$;

create or replace function public.schools_have_approved_connection(
  first_school_id uuid,
  second_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select first_school_id <> second_school_id
    and exists (
      select 1
      from public.school_connections sc
      where sc.status = 'approved'
        and (
          (
            sc.requester_school_id = first_school_id
            and sc.receiver_school_id = second_school_id
          )
          or (
            sc.requester_school_id = second_school_id
            and sc.receiver_school_id = first_school_id
          )
        )
    )
$$;

create or replace function public.current_student_roster_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sr.id
  from public.student_rosters sr
  where sr.profile_id = auth.uid()
    and sr.school_id = public.current_profile_school_id()
    and sr.status = 'active'
  limit 1
$$;

create or replace function public.current_user_is_club_leader(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_club_id is not null
    and exists (
      select 1
      from public.club_memberships cm
      join public.student_rosters sr
        on sr.id = cm.student_roster_id
       and sr.school_id = cm.school_id
      where cm.club_id = target_club_id
        and cm.role = 'leader'
        and cm.status = 'active'
        and sr.profile_id = auth.uid()
        and sr.status = 'active'
    )
$$;

create or replace function public.current_user_can_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and (
        public.current_user_can_manage_school(e.school_id)
        or public.current_user_is_club_leader(e.club_id)
      )
  )
$$;

create or replace function public.current_user_can_manage_event_owner_school(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and public.current_user_can_manage_school(e.school_id)
  )
$$;

create or replace function public.current_user_can_share_event_with_school(
  target_event_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.status = 'approved'
      and public.current_user_can_manage_school(e.school_id)
      and public.schools_have_approved_connection(e.school_id, target_school_id)
  )
$$;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_audit_logs enable row level security;
alter table public.school_connections enable row level security;
alter table public.student_rosters enable row level security;
alter table public.announcements enable row level security;
alter table public.invite_codes enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.club_requests enable row level security;
alter table public.club_request_supports enable row level security;
alter table public.events enable row level security;
alter table public.event_school_shares enable row level security;
alter table public.event_attendees enable row level security;
alter table public.attendance_checkins enable row level security;

drop policy if exists "Schools are visible to their members" on public.schools;
create policy "Schools are visible to their members"
  on public.schools
  for select
  to authenticated
  using (id = public.current_profile_school_id());

drop policy if exists "School admins can view active school directory" on public.schools;
create policy "School admins can view active school directory"
  on public.schools
  for select
  to authenticated
  using (
    status = 'active'
    and public.current_profile_role() = 'school_admin'
  );

drop policy if exists "School admins can update their school" on public.schools;
create policy "School admins can update their school"
  on public.schools
  for update
  to authenticated
  using (
    id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  )
  with check (
    id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  );

drop policy if exists "Profiles are visible to self and school staff" on public.profiles;
create policy "Profiles are visible to self and school staff"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_can_manage_school(school_id)
  );

drop policy if exists "School staff can create allowed profiles" on public.profiles;
create policy "School staff can create allowed profiles"
  on public.profiles
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and (
      (
        public.current_profile_role() = 'school_admin'
        and role in ('school_admin', 'teacher', 'student')
      )
      or (
        public.current_profile_role() = 'teacher'
        and role = 'student'
      )
    )
  );

drop policy if exists "School admins can update school profiles" on public.profiles;
create policy "School admins can update school profiles"
  on public.profiles
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  )
  with check (school_id = public.current_profile_school_id());

drop policy if exists "Teachers can update student profiles" on public.profiles;
create policy "Teachers can update student profiles"
  on public.profiles
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'teacher'
    and role = 'student'
  )
  with check (
    school_id = public.current_profile_school_id()
    and role = 'student'
  );

drop policy if exists "Platform admins can view platform admins" on public.platform_admins;
create policy "Platform admins can view platform admins"
  on public.platform_admins
  for select
  to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can view platform audit logs" on public.platform_audit_logs;
create policy "Platform admins can view platform audit logs"
  on public.platform_audit_logs
  for select
  to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "School admins can view their school connections" on public.school_connections;
create policy "School admins can view their school connections"
  on public.school_connections
  for select
  to authenticated
  using (
    public.current_profile_role() = 'school_admin'
    and public.current_profile_school_id() in (
      requester_school_id,
      receiver_school_id
    )
  );

drop policy if exists "School admins can request school connections" on public.school_connections;
create policy "School admins can request school connections"
  on public.school_connections
  for insert
  to authenticated
  with check (
    public.current_profile_role() = 'school_admin'
    and requester_school_id = public.current_profile_school_id()
    and requester_school_id <> receiver_school_id
    and requested_by_profile_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "Receiver school admins can respond to pending connections" on public.school_connections;
create policy "Receiver school admins can respond to pending connections"
  on public.school_connections
  for update
  to authenticated
  using (
    public.current_profile_role() = 'school_admin'
    and receiver_school_id = public.current_profile_school_id()
    and status = 'pending'
  )
  with check (
    public.current_profile_role() = 'school_admin'
    and receiver_school_id = public.current_profile_school_id()
    and status in ('approved', 'rejected')
    and responded_by_profile_id = auth.uid()
    and responded_at is not null
  );

drop policy if exists "Rosters are visible to staff and the roster student" on public.student_rosters;
create policy "Rosters are visible to staff and the roster student"
  on public.student_rosters
  for select
  to authenticated
  using (
    public.current_user_can_manage_school(school_id)
    or profile_id = auth.uid()
  );

drop policy if exists "School staff can create rosters" on public.student_rosters;
create policy "School staff can create rosters"
  on public.student_rosters
  for insert
  to authenticated
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "School staff can update rosters" on public.student_rosters;
create policy "School staff can update rosters"
  on public.student_rosters
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "Announcements are visible to school members" on public.announcements;
create policy "Announcements are visible to school members"
  on public.announcements
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and (
      status = 'active'
      or public.current_user_can_manage_school(school_id)
    )
  );

drop policy if exists "School staff can create announcements" on public.announcements;
create policy "School staff can create announcements"
  on public.announcements
  for insert
  to authenticated
  with check (
    public.current_user_can_manage_school(school_id)
    and status in ('active', 'archived')
  );

drop policy if exists "School staff can update announcements" on public.announcements;
create policy "School staff can update announcements"
  on public.announcements
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (
    public.current_user_can_manage_school(school_id)
    and status in ('active', 'archived')
  );

drop policy if exists "Invite codes are visible to school staff only" on public.invite_codes;
create policy "Invite codes are visible to school staff only"
  on public.invite_codes
  for select
  to authenticated
  using (public.current_user_can_manage_school(school_id));

drop policy if exists "School staff can create invite codes" on public.invite_codes;
create policy "School staff can create invite codes"
  on public.invite_codes
  for insert
  to authenticated
  with check (
    public.current_user_can_manage_school(school_id)
    and max_uses = 1
    and use_count = 0
    and status = 'active'
  );

drop policy if exists "School staff can update invite codes" on public.invite_codes;
create policy "School staff can update invite codes"
  on public.invite_codes
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (
    public.current_user_can_manage_school(school_id)
    and max_uses = 1
    and use_count between 0 and max_uses
  );

drop policy if exists "Clubs are visible to school members" on public.clubs;
create policy "Clubs are visible to school members"
  on public.clubs
  for select
  to authenticated
  using (school_id = public.current_profile_school_id());

drop policy if exists "School staff can create clubs" on public.clubs;
create policy "School staff can create clubs"
  on public.clubs
  for insert
  to authenticated
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "School staff can update clubs" on public.clubs;
create policy "School staff can update clubs"
  on public.clubs
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "Club memberships are visible to relevant school members" on public.club_memberships;
create policy "Club memberships are visible to relevant school members"
  on public.club_memberships
  for select
  to authenticated
  using (
    public.current_user_can_manage_school(school_id)
    or student_roster_id = public.current_student_roster_id()
    or public.current_user_is_club_leader(club_id)
  );

drop policy if exists "School staff can create club memberships" on public.club_memberships;
create policy "School staff can create club memberships"
  on public.club_memberships
  for insert
  to authenticated
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "School staff can update club memberships" on public.club_memberships;
create policy "School staff can update club memberships"
  on public.club_memberships
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "Club requests are visible to school members" on public.club_requests;
create policy "Club requests are visible to school members"
  on public.club_requests
  for select
  to authenticated
  using (school_id = public.current_profile_school_id());

drop policy if exists "Students can create club requests" on public.club_requests;
create policy "Students can create club requests"
  on public.club_requests
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'student'
    and created_by_profile_id = auth.uid()
    and status = 'pending'
    and reviewed_by_profile_id is null
    and converted_club_id is null
    and reviewed_at is null
    and rejection_reason is null
  );

drop policy if exists "School staff can review club requests" on public.club_requests;
create policy "School staff can review club requests"
  on public.club_requests
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (
    public.current_user_can_manage_school(school_id)
    and status in ('pending', 'approved', 'rejected', 'archived')
  );

drop policy if exists "Club request supports are visible to school members" on public.club_request_supports;
create policy "Club request supports are visible to school members"
  on public.club_request_supports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.club_requests cr
      where cr.id = club_request_id
        and cr.school_id = public.current_profile_school_id()
    )
  );

drop policy if exists "Students can support school club requests" on public.club_request_supports;
create policy "Students can support school club requests"
  on public.club_request_supports
  for insert
  to authenticated
  with check (
    public.current_profile_role() = 'student'
    and profile_id = auth.uid()
    and exists (
      select 1
      from public.club_requests cr
      where cr.id = club_request_id
        and cr.school_id = public.current_profile_school_id()
        and cr.status = 'pending'
    )
  );

drop policy if exists "Students can remove their club request support" on public.club_request_supports;
create policy "Students can remove their club request support"
  on public.club_request_supports
  for delete
  to authenticated
  using (
    public.current_profile_role() = 'student'
    and profile_id = auth.uid()
    and exists (
      select 1
      from public.club_requests cr
      where cr.id = club_request_id
        and cr.school_id = public.current_profile_school_id()
        and cr.status = 'pending'
    )
  );

drop policy if exists "Events are visible by role and approval state" on public.events;
create policy "Events are visible by role and approval state"
  on public.events
  for select
  to authenticated
  using (
    public.current_user_can_manage_school(school_id)
    or (
      school_id = public.current_profile_school_id()
      and status in ('approved', 'completed')
    )
    or (
      status = 'approved'
      and exists (
        select 1
        from public.event_school_shares ess
        where ess.event_id = events.id
          and ess.school_id = public.current_profile_school_id()
      )
      and public.schools_have_approved_connection(
        school_id,
        public.current_profile_school_id()
      )
    )
    or public.current_user_is_club_leader(club_id)
  );

drop policy if exists "Staff and club leaders can create events" on public.events;
create policy "Staff and club leaders can create events"
  on public.events
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and (
      public.current_user_can_manage_school(school_id)
      or public.current_user_is_club_leader(club_id)
    )
    and (
      public.current_profile_is_staff()
      or status in ('draft', 'pending_approval')
    )
  );

drop policy if exists "School staff can update events" on public.events;
create policy "School staff can update events"
  on public.events
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "Club leaders can update draft club events" on public.events;
create policy "Club leaders can update draft club events"
  on public.events
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_user_is_club_leader(club_id)
    and status in ('draft', 'rejected')
  )
  with check (
    school_id = public.current_profile_school_id()
    and public.current_user_is_club_leader(club_id)
    and status in ('draft', 'pending_approval')
  );

drop policy if exists "Event shares are visible to owner and target schools" on public.event_school_shares;
create policy "Event shares are visible to owner and target schools"
  on public.event_school_shares
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    or public.current_user_can_manage_event_owner_school(event_id)
  );

drop policy if exists "Event owner staff can create connected school shares" on public.event_school_shares;
create policy "Event owner staff can create connected school shares"
  on public.event_school_shares
  for insert
  to authenticated
  with check (
    public.current_user_can_share_event_with_school(event_id, school_id)
  );

drop policy if exists "Event owner staff can remove connected school shares" on public.event_school_shares;
create policy "Event owner staff can remove connected school shares"
  on public.event_school_shares
  for delete
  to authenticated
  using (
    public.current_user_can_manage_event_owner_school(event_id)
  );

drop policy if exists "Event attendees are visible to managers and self" on public.event_attendees;
create policy "Event attendees are visible to managers and self"
  on public.event_attendees
  for select
  to authenticated
  using (
    public.current_user_can_manage_event(event_id)
    or student_roster_id = public.current_student_roster_id()
    or attendee_profile_id = auth.uid()
  );

drop policy if exists "School event managers can create attendees" on public.event_attendees;
create policy "School event managers can create attendees"
  on public.event_attendees
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and public.current_user_can_manage_school(school_id)
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.school_id = event_attendees.school_id
    )
  );

drop policy if exists "Students can register themselves for approved events" on public.event_attendees;
create policy "Students can register themselves for approved events"
  on public.event_attendees
  for insert
  to authenticated
  with check (
    public.current_profile_role() = 'student'
    and public.current_student_roster_id() is not null
    and attendee_school_id = public.current_profile_school_id()
    and attendee_profile_id = auth.uid()
    and status = 'registered'
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.school_id = event_attendees.school_id
        and (
          (
            e.permission_required
            and permission_status = 'pending'
          )
          or (
            not e.permission_required
            and permission_status = 'not_required'
          )
        )
    )
    and (
      (
        school_id = public.current_profile_school_id()
        and student_roster_id = public.current_student_roster_id()
      )
      or (
        school_id <> public.current_profile_school_id()
        and student_roster_id is null
      )
    )
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.school_id = event_attendees.school_id
        and e.status = 'approved'
        and (
          e.school_id = public.current_profile_school_id()
          or (
            e.allow_connected_school_registration
            and exists (
              select 1
              from public.event_school_shares ess
              where ess.event_id = e.id
                and ess.school_id = public.current_profile_school_id()
            )
            and public.schools_have_approved_connection(
              e.school_id,
              public.current_profile_school_id()
            )
          )
        )
    )
  );

drop policy if exists "School event managers can update attendees" on public.event_attendees;
create policy "School event managers can update attendees"
  on public.event_attendees
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_user_can_manage_school(school_id)
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.school_id = event_attendees.school_id
    )
  )
  with check (
    school_id = public.current_profile_school_id()
    and public.current_user_can_manage_school(school_id)
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.school_id = event_attendees.school_id
    )
  );

drop policy if exists "Checkins are visible to managers and self" on public.attendance_checkins;
create policy "Checkins are visible to managers and self"
  on public.attendance_checkins
  for select
  to authenticated
  using (
    (
      public.current_user_can_manage_school(school_id)
      and exists (
        select 1
        from public.events e
        where e.id = event_id
          and e.school_id = attendance_checkins.school_id
      )
    )
    or student_roster_id = public.current_student_roster_id()
    or attendee_profile_id = auth.uid()
  );

drop policy if exists "Event managers can create checkins" on public.attendance_checkins;
create policy "Event managers can create checkins"
  on public.attendance_checkins
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and public.current_user_can_manage_school(school_id)
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.school_id = attendance_checkins.school_id
    )
  );


-- Phase 3A: confidential safeguarding and data-rights foundations.
-- This migration is intentionally local until safeguarding/privacy governance is approved.

create table if not exists public.safeguarding_staff_designations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid not null,
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active',
  assigned_at timestamptz not null default now(),
  status_changed_by_profile_id uuid references public.profiles(id) on delete set null,
  status_changed_at timestamptz not null default now(),
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safeguarding_staff_designations_profile_school_fk
    foreign key (profile_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict,
  constraint safeguarding_staff_designations_profile_school_unique
    unique (profile_id, school_id),
  constraint safeguarding_staff_designations_status_check
    check (status in ('active', 'inactive')),
  constraint safeguarding_staff_designations_deactivated_at_check
    check (
      (status = 'active' and deactivated_at is null)
      or (status = 'inactive' and deactivated_at is not null)
    )
);

create index if not exists safeguarding_designations_school_status_idx
  on public.safeguarding_staff_designations (school_id, status, assigned_at desc);

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  reporter_profile_id uuid not null,
  related_event_id uuid,
  related_club_id uuid,
  concern_category text not null,
  description text not null,
  immediate_contact_requested boolean not null default false,
  status text not null default 'submitted',
  acknowledged_by_profile_id uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  external_referral_at timestamptz,
  closed_by_profile_id uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_reports_reporter_school_fk
    foreign key (reporter_profile_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict,
  constraint safety_reports_event_school_fk
    foreign key (related_event_id, school_id)
    references public.events(id, school_id)
    on delete restrict,
  constraint safety_reports_club_school_fk
    foreign key (related_club_id, school_id)
    references public.clubs(id, school_id)
    on delete restrict,
  constraint safety_reports_single_context_check
    check (num_nonnulls(related_event_id, related_club_id) <= 1),
  constraint safety_reports_category_check
    check (
      concern_category in (
        'personal_safety',
        'bullying_or_harassment',
        'activity_or_event',
        'online_or_platform',
        'other'
      )
    ),
  constraint safety_reports_description_check
    check (
      length(btrim(description)) between 1 and 2000
    ),
  constraint safety_reports_status_check
    check (
      status in (
        'submitted',
        'acknowledged',
        'in_review',
        'external_referral',
        'closed'
      )
    ),
  constraint safety_reports_acknowledgment_check
    check (
      (acknowledged_at is null and acknowledged_by_profile_id is null)
      or (acknowledged_at is not null and acknowledged_by_profile_id is not null)
    ),
  constraint safety_reports_closure_check
    check (
      (status = 'closed' and closed_at is not null and closed_by_profile_id is not null)
      or (status <> 'closed' and closed_at is null and closed_by_profile_id is null)
    )
);

create index if not exists safety_reports_school_status_created_at_idx
  on public.safety_reports (school_id, status, created_at desc);

create index if not exists safety_reports_reporter_created_at_idx
  on public.safety_reports (reporter_profile_id, created_at desc);

create table if not exists public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  requester_profile_id uuid not null,
  request_type text not null,
  details text,
  status text not null default 'submitted',
  response_summary text,
  handled_by_profile_id uuid references public.profiles(id) on delete set null,
  status_changed_by_profile_id uuid references public.profiles(id) on delete set null,
  status_changed_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_rights_requests_requester_school_fk
    foreign key (requester_profile_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict,
  constraint data_rights_requests_type_check
    check (
      request_type in (
        'access',
        'correction',
        'export',
        'deletion_or_deactivation',
        'research_withdrawal'
      )
    ),
  constraint data_rights_requests_details_check
    check (details is null or length(btrim(details)) between 1 and 2000),
  constraint data_rights_requests_status_check
    check (
      status in (
        'submitted',
        'acknowledged',
        'under_review',
        'action_required',
        'completed',
        'denied_with_reason',
        'withdrawn'
      )
    ),
  constraint data_rights_requests_response_check
    check (
      response_summary is null
      or length(btrim(response_summary)) between 1 and 1000
    ),
  constraint data_rights_requests_denial_reason_check
    check (
      status <> 'denied_with_reason'
      or response_summary is not null
    ),
  constraint data_rights_requests_resolution_check
    check (
      (
        status in ('completed', 'denied_with_reason', 'withdrawn')
        and resolved_at is not null
      )
      or (
        status not in ('completed', 'denied_with_reason', 'withdrawn')
        and resolved_at is null
      )
    )
);

create index if not exists data_rights_requests_school_status_created_at_idx
  on public.data_rights_requests (school_id, status, created_at desc);

create index if not exists data_rights_requests_requester_created_at_idx
  on public.data_rights_requests (requester_profile_id, created_at desc);

create table if not exists public.restricted_workflow_audit_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  safeguarding_designation_id uuid references public.safeguarding_staff_designations(id) on delete set null,
  safety_report_id uuid references public.safety_reports(id) on delete set null,
  data_rights_request_id uuid references public.data_rights_requests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint restricted_workflow_audit_target_check
    check (
      (
        target_type = 'safeguarding_designation'
        and safeguarding_designation_id is not null
        and safety_report_id is null
        and data_rights_request_id is null
      )
      or (
        target_type = 'safety_report'
        and safeguarding_designation_id is null
        and safety_report_id is not null
        and data_rights_request_id is null
      )
      or (
        target_type = 'data_rights_request'
        and safeguarding_designation_id is null
        and safety_report_id is null
        and data_rights_request_id is not null
      )
    )
);

create index if not exists restricted_workflow_audit_school_created_at_idx
  on public.restricted_workflow_audit_events (school_id, created_at desc);

create index if not exists restricted_workflow_audit_report_created_at_idx
  on public.restricted_workflow_audit_events (safety_report_id, created_at desc)
  where safety_report_id is not null;

comment on table public.safeguarding_staff_designations is
  'School-scoped safeguarding access designations. Not a profile role.';
comment on table public.safety_reports is
  'Highly confidential student/staff safety reports. Narratives must not enter ordinary analytics or logs.';
comment on column public.safety_reports.description is
  'Sensitive free text. Accessible only to actively designated same-school safeguarding staff.';
comment on table public.data_rights_requests is
  'Authenticated operational data access, correction, export, deletion/deactivation and research-withdrawal requests.';
comment on table public.restricted_workflow_audit_events is
  'Restricted status-only audit stream. Never store report narratives, exports, or sensitive case notes.';

create or replace function public.current_user_is_designated_safeguarding_staff(
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_school_id = public.current_profile_school_id()
    and public.current_profile_role() in ('school_admin', 'teacher')
    and exists (
      select 1
      from public.safeguarding_staff_designations ssd
      where ssd.school_id = target_school_id
        and ssd.profile_id = auth.uid()
        and ssd.status = 'active'
    )
$$;

revoke all on function public.current_user_is_designated_safeguarding_staff(uuid) from public;
grant execute on function public.current_user_is_designated_safeguarding_staff(uuid) to authenticated;

create or replace function public.get_my_safety_report_receipts()
returns table (
  id uuid,
  concern_category text,
  status text,
  immediate_contact_requested boolean,
  created_at timestamptz,
  acknowledged_at timestamptz,
  closed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sr.id,
    sr.concern_category,
    sr.status,
    sr.immediate_contact_requested,
    sr.created_at,
    sr.acknowledged_at,
    sr.closed_at
  from public.safety_reports sr
  join public.profiles p
    on p.id = sr.reporter_profile_id
   and p.school_id = sr.school_id
  where sr.reporter_profile_id = auth.uid()
    and p.status = 'active'
  order by sr.created_at desc
$$;

revoke all on function public.get_my_safety_report_receipts() from public;
grant execute on function public.get_my_safety_report_receipts() to authenticated;

create or replace function public.prepare_safeguarding_designation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.assigned_by_profile_id := auth.uid();
    new.assigned_at := now();
    new.status := 'active';
    new.status_changed_by_profile_id := auth.uid();
    new.status_changed_at := now();
    new.deactivated_at := null;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.id <> old.id
    or new.school_id <> old.school_id
    or new.profile_id <> old.profile_id
    or new.assigned_by_profile_id is distinct from old.assigned_by_profile_id
    or new.assigned_at <> old.assigned_at
    or new.created_at <> old.created_at then
    raise exception 'Safeguarding designation identity cannot be changed.';
  end if;

  if new.status = old.status then
    raise exception 'Safeguarding designation status did not change.';
  end if;

  new.status_changed_by_profile_id := auth.uid();
  new.status_changed_at := now();
  new.deactivated_at := case when new.status = 'inactive' then now() else null end;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_safeguarding_designation() from public;

create or replace function public.prepare_safety_report_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'submitted';
  new.acknowledged_by_profile_id := null;
  new.acknowledged_at := null;
  new.external_referral_at := null;
  new.closed_by_profile_id := null;
  new.closed_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_safety_report_submission() from public;

create or replace function public.protect_safety_report_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.school_id <> old.school_id
    or new.reporter_profile_id <> old.reporter_profile_id
    or new.related_event_id is distinct from old.related_event_id
    or new.related_club_id is distinct from old.related_club_id
    or new.concern_category <> old.concern_category
    or new.description <> old.description
    or new.immediate_contact_requested <> old.immediate_contact_requested
    or new.created_at <> old.created_at then
    raise exception 'Safety report content and identity cannot be changed.';
  end if;

  if new.status = old.status then
    raise exception 'Safety report workflow status did not change.';
  end if;

  if not (
    (old.status = 'submitted' and new.status = 'acknowledged')
    or (old.status = 'acknowledged' and new.status in ('in_review', 'external_referral', 'closed'))
    or (old.status = 'in_review' and new.status in ('external_referral', 'closed'))
    or (old.status = 'external_referral' and new.status = 'closed')
  ) then
    raise exception 'Invalid safety report workflow transition.';
  end if;

  new.acknowledged_by_profile_id := old.acknowledged_by_profile_id;
  new.acknowledged_at := old.acknowledged_at;
  new.external_referral_at := old.external_referral_at;
  new.closed_by_profile_id := old.closed_by_profile_id;
  new.closed_at := old.closed_at;

  if old.status = 'submitted' and new.status = 'acknowledged' then
    new.acknowledged_by_profile_id := auth.uid();
    new.acknowledged_at := now();
  end if;

  if new.status = 'external_referral' and old.status <> 'external_referral' then
    new.external_referral_at := now();
  end if;

  if new.status = 'closed' then
    new.closed_by_profile_id := auth.uid();
    new.closed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.protect_safety_report_workflow() from public;

create or replace function public.prepare_data_rights_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'submitted';
  new.response_summary := null;
  new.handled_by_profile_id := null;
  new.status_changed_by_profile_id := auth.uid();
  new.status_changed_at := now();
  new.acknowledged_at := null;
  new.resolved_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_data_rights_request() from public;

create or replace function public.protect_data_rights_request_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_school_admin boolean;
begin
  if new.id <> old.id
    or new.school_id <> old.school_id
    or new.requester_profile_id <> old.requester_profile_id
    or new.request_type <> old.request_type
    or new.details is distinct from old.details
    or new.created_at <> old.created_at then
    raise exception 'Data-rights request identity and submitted details cannot be changed.';
  end if;

  actor_is_school_admin := (
    public.current_profile_school_id() = old.school_id
    and public.current_profile_role() = 'school_admin'
  );

  if auth.uid() = old.requester_profile_id and new.status = 'withdrawn' then
    if new.status <> 'withdrawn'
      or old.status in ('completed', 'denied_with_reason', 'withdrawn')
      or new.response_summary is distinct from old.response_summary
      or new.handled_by_profile_id is distinct from old.handled_by_profile_id then
      raise exception 'A requester may only withdraw an unresolved request.';
    end if;
  elsif actor_is_school_admin then
    if not (
      (old.status = 'submitted' and new.status in ('acknowledged', 'under_review', 'action_required', 'completed', 'denied_with_reason'))
      or (old.status = 'acknowledged' and new.status in ('under_review', 'action_required', 'completed', 'denied_with_reason'))
      or (old.status = 'under_review' and new.status in ('action_required', 'completed', 'denied_with_reason'))
      or (old.status = 'action_required' and new.status in ('under_review', 'completed', 'denied_with_reason'))
    ) then
      raise exception 'Invalid data-rights request workflow transition.';
    end if;
  else
    raise exception 'Not authorized to update this data-rights request.';
  end if;

  new.status_changed_by_profile_id := auth.uid();
  new.status_changed_at := now();
  new.acknowledged_at := old.acknowledged_at;
  new.resolved_at := old.resolved_at;

  if actor_is_school_admin then
    new.handled_by_profile_id := auth.uid();
  end if;

  if new.status = 'acknowledged' and old.acknowledged_at is null then
    new.acknowledged_at := now();
  end if;

  if new.status in ('completed', 'denied_with_reason', 'withdrawn') then
    new.resolved_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.protect_data_rights_request_workflow() from public;

create or replace function public.log_restricted_workflow_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_action text;
  event_metadata jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'safeguarding_staff_designations' then
    event_action := case
      when tg_op = 'INSERT' then 'safeguarding.designation.added'
      when new.status = 'active' then 'safeguarding.designation.reactivated'
      else 'safeguarding.designation.deactivated'
    end;
    event_metadata := jsonb_build_object('new_status', new.status);

    insert into public.restricted_workflow_audit_events (
      school_id,
      actor_profile_id,
      action,
      target_type,
      safeguarding_designation_id,
      metadata
    ) values (
      new.school_id,
      auth.uid(),
      event_action,
      'safeguarding_designation',
      new.id,
      event_metadata
    );
  elsif tg_table_name = 'safety_reports' then
    event_action := case
      when tg_op = 'INSERT' then 'safety_report.submitted'
      when new.status = 'acknowledged' then 'safety_report.acknowledged'
      when new.status = 'external_referral' then 'safety_report.external_referral'
      when new.status = 'closed' then 'safety_report.closed'
      else 'safety_report.status_changed'
    end;
    event_metadata := case
      when tg_op = 'INSERT' then jsonb_build_object('new_status', new.status)
      else jsonb_build_object('previous_status', old.status, 'new_status', new.status)
    end;

    insert into public.restricted_workflow_audit_events (
      school_id,
      actor_profile_id,
      action,
      target_type,
      safety_report_id,
      metadata
    ) values (
      new.school_id,
      auth.uid(),
      event_action,
      'safety_report',
      new.id,
      event_metadata
    );
  elsif tg_table_name = 'data_rights_requests' then
    event_action := case
      when tg_op = 'INSERT' then 'data_rights.request.submitted'
      when new.status = 'withdrawn' then 'data_rights.request.withdrawn'
      else 'data_rights.request.status_changed'
    end;
    event_metadata := case
      when tg_op = 'INSERT' then jsonb_build_object('new_status', new.status)
      else jsonb_build_object('previous_status', old.status, 'new_status', new.status)
    end;

    insert into public.restricted_workflow_audit_events (
      school_id,
      actor_profile_id,
      action,
      target_type,
      data_rights_request_id,
      metadata
    ) values (
      new.school_id,
      auth.uid(),
      event_action,
      'data_rights_request',
      new.id,
      event_metadata
    );
  end if;

  return new;
end;
$$;

revoke all on function public.log_restricted_workflow_event() from public;

drop trigger if exists prepare_safeguarding_designation on public.safeguarding_staff_designations;
create trigger prepare_safeguarding_designation
  before insert or update on public.safeguarding_staff_designations
  for each row execute function public.prepare_safeguarding_designation();

drop trigger if exists protect_safety_report_workflow on public.safety_reports;
drop trigger if exists prepare_safety_report_submission on public.safety_reports;
create trigger prepare_safety_report_submission
  before insert on public.safety_reports
  for each row execute function public.prepare_safety_report_submission();

create trigger protect_safety_report_workflow
  before update on public.safety_reports
  for each row execute function public.protect_safety_report_workflow();

drop trigger if exists prepare_data_rights_request on public.data_rights_requests;
create trigger prepare_data_rights_request
  before insert on public.data_rights_requests
  for each row execute function public.prepare_data_rights_request();

drop trigger if exists protect_data_rights_request_workflow on public.data_rights_requests;
create trigger protect_data_rights_request_workflow
  before update on public.data_rights_requests
  for each row execute function public.protect_data_rights_request_workflow();

drop trigger if exists audit_safeguarding_designation on public.safeguarding_staff_designations;
create trigger audit_safeguarding_designation
  after insert or update on public.safeguarding_staff_designations
  for each row execute function public.log_restricted_workflow_event();

drop trigger if exists audit_safety_report on public.safety_reports;
create trigger audit_safety_report
  after insert or update on public.safety_reports
  for each row execute function public.log_restricted_workflow_event();

drop trigger if exists audit_data_rights_request on public.data_rights_requests;
create trigger audit_data_rights_request
  after insert or update on public.data_rights_requests
  for each row execute function public.log_restricted_workflow_event();

alter table public.safeguarding_staff_designations enable row level security;
alter table public.safety_reports enable row level security;
alter table public.data_rights_requests enable row level security;
alter table public.restricted_workflow_audit_events enable row level security;

revoke all on table public.safeguarding_staff_designations from public, anon, authenticated;
revoke all on table public.safety_reports from public, anon, authenticated;
revoke all on table public.data_rights_requests from public, anon, authenticated;
revoke all on table public.restricted_workflow_audit_events from public, anon, authenticated;

grant select, insert, update on table public.safeguarding_staff_designations to authenticated;
grant select, insert, update on table public.safety_reports to authenticated;
grant select, insert, update on table public.data_rights_requests to authenticated;
grant select on table public.restricted_workflow_audit_events to authenticated;

drop policy if exists "School admins can view safeguarding designations" on public.safeguarding_staff_designations;
create policy "School admins can view safeguarding designations"
  on public.safeguarding_staff_designations
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  );

drop policy if exists "Designated staff can view their own designation" on public.safeguarding_staff_designations;
create policy "Designated staff can view their own designation"
  on public.safeguarding_staff_designations
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
  );

drop policy if exists "School admins can assign safeguarding staff" on public.safeguarding_staff_designations;
create policy "School admins can assign safeguarding staff"
  on public.safeguarding_staff_designations
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and assigned_by_profile_id = auth.uid()
    and status_changed_by_profile_id = auth.uid()
    and status = 'active'
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and p.school_id = safeguarding_staff_designations.school_id
        and p.status = 'active'
        and p.role in ('school_admin', 'teacher')
    )
  );

drop policy if exists "School admins can update safeguarding designations" on public.safeguarding_staff_designations;
create policy "School admins can update safeguarding designations"
  on public.safeguarding_staff_designations
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  )
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and status_changed_by_profile_id = auth.uid()
    and status in ('active', 'inactive')
    and (
      status = 'inactive'
      or exists (
        select 1
        from public.profiles p
        where p.id = profile_id
          and p.school_id = safeguarding_staff_designations.school_id
          and p.status = 'active'
          and p.role in ('school_admin', 'teacher')
      )
    )
  );

drop policy if exists "Active users can submit their own safety reports" on public.safety_reports;
create policy "Active users can submit their own safety reports"
  on public.safety_reports
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and reporter_profile_id = auth.uid()
    and status = 'submitted'
    and acknowledged_by_profile_id is null
    and acknowledged_at is null
    and external_referral_at is null
    and closed_by_profile_id is null
    and closed_at is null
  );

drop policy if exists "Designated safeguarding staff can read same-school reports" on public.safety_reports;
create policy "Designated safeguarding staff can read same-school reports"
  on public.safety_reports
  for select
  to authenticated
  using (public.current_user_is_designated_safeguarding_staff(school_id));

drop policy if exists "Designated safeguarding staff can update same-school reports" on public.safety_reports;
create policy "Designated safeguarding staff can update same-school reports"
  on public.safety_reports
  for update
  to authenticated
  using (public.current_user_is_designated_safeguarding_staff(school_id))
  with check (public.current_user_is_designated_safeguarding_staff(school_id));

drop policy if exists "Users can view their own data-rights requests" on public.data_rights_requests;
create policy "Users can view their own data-rights requests"
  on public.data_rights_requests
  for select
  to authenticated
  using (
    requester_profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
  );

drop policy if exists "School admins can view same-school data-rights requests" on public.data_rights_requests;
create policy "School admins can view same-school data-rights requests"
  on public.data_rights_requests
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  );

drop policy if exists "Users can submit their own data-rights requests" on public.data_rights_requests;
create policy "Users can submit their own data-rights requests"
  on public.data_rights_requests
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and requester_profile_id = auth.uid()
    and status = 'submitted'
    and handled_by_profile_id is null
    and acknowledged_at is null
    and resolved_at is null
  );

drop policy if exists "Users can withdraw their own unresolved data-rights requests" on public.data_rights_requests;
create policy "Users can withdraw their own unresolved data-rights requests"
  on public.data_rights_requests
  for update
  to authenticated
  using (
    requester_profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
    and status not in ('completed', 'denied_with_reason', 'withdrawn')
  )
  with check (
    requester_profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
    and status = 'withdrawn'
  );

drop policy if exists "School admins can process same-school data-rights requests" on public.data_rights_requests;
create policy "School admins can process same-school data-rights requests"
  on public.data_rights_requests
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and status not in ('completed', 'denied_with_reason', 'withdrawn')
  )
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and handled_by_profile_id = auth.uid()
  );

drop policy if exists "Safeguarding staff can view report audit events" on public.restricted_workflow_audit_events;
create policy "Safeguarding staff can view report audit events"
  on public.restricted_workflow_audit_events
  for select
  to authenticated
  using (
    target_type = 'safety_report'
    and public.current_user_is_designated_safeguarding_staff(school_id)
  );

drop policy if exists "School admins can view designation and rights audit events" on public.restricted_workflow_audit_events;
create policy "School admins can view designation and rights audit events"
  on public.restricted_workflow_audit_events
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and target_type in ('safeguarding_designation', 'data_rights_request')
  );



-- Fake seed data only. These rows are for local/demo development and should be
-- removed or replaced before production. No auth.users are created here because
-- Supabase Auth should own login identities.

insert into public.schools (id, name, slug, province, timezone, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'Demo Valley School',
  'demo-valley-school',
  'British Columbia',
  'America/Vancouver',
  'active'
)
on conflict (id) do nothing;

insert into public.student_rosters (
  id,
  school_id,
  student_number,
  first_name,
  last_name,
  preferred_name,
  grade_level,
  homeroom,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000001',
    'DV-1001',
    'Maya',
    'Chen',
    'Maya',
    '10',
    '10A',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000001',
    'DV-1002',
    'Noah',
    'Patel',
    'Noah',
    '11',
    '11B',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000001',
    'DV-1003',
    'Sofia',
    'Rivera',
    'Sofia',
    '9',
    '9C',
    'active'
  )
on conflict (id) do nothing;

insert into public.invite_codes (
  id,
  school_id,
  student_roster_id,
  code_hash,
  code_hint,
  status,
  expires_at
)
values
  (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    encode(digest('DEMO-MAYA-ONE-TIME-CODE', 'sha256'), 'hex'),
    'DEMO-MAYA-...',
    'active',
    now() + interval '14 days'
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000102',
    encode(digest('DEMO-NOAH-ONE-TIME-CODE', 'sha256'), 'hex'),
    'DEMO-NOAH-...',
    'active',
    now() + interval '14 days'
  )
on conflict (id) do nothing;

insert into public.clubs (
  id,
  school_id,
  name,
  slug,
  description,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000001',
    'Robotics Club',
    'robotics-club',
    'Students design, build, and test small robotics projects.',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000001',
    'Art Studio',
    'art-studio',
    'Open studio time for drawing, painting, and exhibition planning.',
    'active'
  )
on conflict (id) do nothing;

insert into public.club_memberships (
  id,
  school_id,
  club_id,
  student_roster_id,
  role,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    'leader',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000102',
    'member',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000503',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000103',
    'leader',
    'active'
  )
on conflict (id) do nothing;

insert into public.events (
  id,
  school_id,
  club_id,
  title,
  description,
  location,
  starts_at,
  ends_at,
  capacity,
  status,
  submitted_at,
  approved_at
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    'Robotics Build Night',
    'Build and test drivetrain prototypes.',
    'Lab 2',
    now() - interval '1 day',
    now() - interval '23 hours',
    30,
    'completed',
    now() - interval '8 days',
    now() - interval '7 days'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000202',
    'Spring Art Showcase Planning',
    'Plan display labels, layout, and student roles.',
    'Art Room',
    now() + interval '10 days',
    now() + interval '10 days 2 hours',
    25,
    'pending_approval',
    now() - interval '1 day',
    null
  )
on conflict (id) do nothing;

insert into public.event_attendees (
  id,
  school_id,
  event_id,
  student_roster_id,
  attendee_school_id,
  status,
  registered_at,
  checked_in_at
)
values
  (
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000001',
    'attended',
    now() - interval '9 days',
    now() - interval '1 day'
  ),
  (
    '00000000-0000-4000-8000-000000000602',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000001',
    'registered',
    now() - interval '9 days',
    null
  )
on conflict (id) do nothing;

insert into public.attendance_checkins (
  id,
  school_id,
  event_id,
  student_roster_id,
  event_attendee_id,
  attendee_school_id,
  method,
  result,
  qr_token_hash,
  checked_in_at,
  notes,
  metadata
)
values (
  '00000000-0000-4000-8000-000000000701',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000001',
  'qr',
  'success',
  encode(digest('DEMO-QR-CHECKIN-TOKEN', 'sha256'), 'hex'),
  now() - interval '1 day',
  'Fake QR check-in seed row.',
  '{"seed": true}'::jsonb
)
on conflict (id) do nothing;
