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
alter table public.school_connections enable row level security;
alter table public.student_rosters enable row level security;
alter table public.announcements enable row level security;
alter table public.invite_codes enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
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
    and public.current_user_can_manage_event(event_id)
  );

drop policy if exists "Students can register themselves for approved events" on public.event_attendees;
create policy "Students can register themselves for approved events"
  on public.event_attendees
  for insert
  to authenticated
  with check (
    attendee_school_id = public.current_profile_school_id()
    and attendee_profile_id = auth.uid()
    and status = 'registered'
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
    and public.current_user_can_manage_event(event_id)
  )
  with check (
    school_id = public.current_profile_school_id()
    and public.current_user_can_manage_event(event_id)
  );

drop policy if exists "Checkins are visible to managers and self" on public.attendance_checkins;
create policy "Checkins are visible to managers and self"
  on public.attendance_checkins
  for select
  to authenticated
  using (
    public.current_user_can_manage_event(event_id)
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
    and public.current_user_can_manage_event(event_id)
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
