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
  create type public.event_experience_level as enum (
    'beginner_friendly',
    'prior_experience_recommended'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_cost_type as enum (
    'free',
    'paid',
    'variable'
  );
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
  profile_id uuid primary key references auth.users(id) on delete cascade,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references auth.users(id) on delete set null,
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

create or replace function public.club_profile_text_is_valid(
  value text,
  maximum_length integer
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select length(value) between 1 and maximum_length
    and value = btrim(value)
    and translate(value, chr(10) || chr(13) || chr(9), '') !~ '[[:cntrl:]]'
$$;

alter function public.club_profile_text_is_valid(text, integer) owner to postgres;
revoke all on function public.club_profile_text_is_valid(text, integer)
  from public, anon, authenticated;

create or replace function public.club_media_path_is_valid(
  value text,
  target_school_id uuid,
  target_club_id uuid,
  media_kind text default null
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select value is not null
    and target_school_id is not null
    and target_club_id is not null
    and split_part(value, '/', 1) = target_school_id::text
    and split_part(value, '/', 2) = target_club_id::text
    and split_part(value, '/', 3) in ('logo', 'banner')
    and (media_kind is null or split_part(value, '/', 3) = media_kind)
    and split_part(value, '/', 4) ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and split_part(value, '/', 5) = ''
$$;

create table if not exists public.club_profiles (
  club_id uuid primary key,
  school_id uuid not null,
  tagline text,
  about text,
  meeting_schedule text,
  meeting_location text,
  eligibility_notes text,
  commitment_notes text,
  accessibility_notes text,
  cost_notes text,
  materials_notes text,
  theme_key text,
  logo_path text,
  banner_path text,
  updated_by_profile_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint club_profiles_club_school_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id)
    on delete cascade,
  constraint club_profiles_tagline_valid check (
    tagline is null or public.club_profile_text_is_valid(tagline, 160)
  ),
  constraint club_profiles_about_valid check (
    about is null or public.club_profile_text_is_valid(about, 2000)
  ),
  constraint club_profiles_meeting_schedule_valid check (
    meeting_schedule is null
    or public.club_profile_text_is_valid(meeting_schedule, 300)
  ),
  constraint club_profiles_meeting_location_valid check (
    meeting_location is null
    or public.club_profile_text_is_valid(meeting_location, 300)
  ),
  constraint club_profiles_eligibility_notes_valid check (
    eligibility_notes is null
    or public.club_profile_text_is_valid(eligibility_notes, 1000)
  ),
  constraint club_profiles_commitment_notes_valid check (
    commitment_notes is null
    or public.club_profile_text_is_valid(commitment_notes, 1000)
  ),
  constraint club_profiles_accessibility_notes_valid check (
    accessibility_notes is null
    or public.club_profile_text_is_valid(accessibility_notes, 1000)
  ),
  constraint club_profiles_cost_notes_valid check (
    cost_notes is null or public.club_profile_text_is_valid(cost_notes, 1000)
  ),
  constraint club_profiles_materials_notes_valid check (
    materials_notes is null
    or public.club_profile_text_is_valid(materials_notes, 1000)
  ),
  constraint club_profiles_theme_key_check check (
    theme_key is null or theme_key in ('warm', 'sky', 'forest', 'plum')
  ),
  constraint club_profiles_logo_path_valid check (
    logo_path is null
    or public.club_media_path_is_valid(
      logo_path,
      school_id,
      club_id,
      'logo'
    )
  ),
  constraint club_profiles_banner_path_valid check (
    banner_path is null
    or public.club_media_path_is_valid(
      banner_path,
      school_id,
      club_id,
      'banner'
    )
  )
);

create index if not exists club_profiles_school_idx
  on public.club_profiles (school_id, updated_at desc);

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
  responsible_staff_id uuid,
  eligibility_notes text,
  experience_level public.event_experience_level,
  accessibility_notes text,
  cost_type public.event_cost_type,
  cost_amount numeric(12, 2),
  cost_currency text,
  cost_notes text,
  required_materials text,
  expected_commitment text,
  cancellation_notice text,
  constraint events_id_school_unique unique (id, school_id),
  constraint events_title_not_blank check (length(btrim(title)) > 0),
  constraint events_time_order check (ends_at > starts_at),
  constraint events_capacity_positive check (capacity is null or capacity > 0),
  constraint events_eligibility_notes_length check (
    eligibility_notes is null or length(eligibility_notes) <= 500
  ),
  constraint events_accessibility_notes_length check (
    accessibility_notes is null or length(accessibility_notes) <= 2000
  ),
  constraint events_cost_details_valid check (
    (
      cost_type is null
      and cost_amount is null
      and cost_currency is null
      and cost_notes is null
    )
    or (
      cost_type = 'free'
      and cost_amount is null
      and cost_currency is null
    )
    or (
      cost_type = 'paid'
      and cost_amount > 0
      and cost_currency = 'MNT'
    )
    or (
      cost_type = 'variable'
      and cost_amount is null
      and cost_currency is null
      and cost_notes is not null
    )
  ),
  constraint events_cost_notes_valid check (
    cost_notes is null
    or (
      length(cost_notes) between 1 and 500
      and cost_notes = btrim(cost_notes)
    )
  ),
  constraint events_required_materials_valid check (
    required_materials is null
    or (
      length(required_materials) between 1 and 1000
      and required_materials = btrim(required_materials)
    )
  ),
  constraint events_expected_commitment_valid check (
    expected_commitment is null
    or (
      length(expected_commitment) between 1 and 500
      and expected_commitment = btrim(expected_commitment)
    )
  ),
  constraint events_cancellation_notice_valid check (
    cancellation_notice is null
    or (
      length(cancellation_notice) between 1 and 1000
      and cancellation_notice = btrim(cancellation_notice)
    )
  ),
  constraint events_club_school_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id)
    on delete restrict,
  constraint events_responsible_staff_school_fk
    foreign key (responsible_staff_id, school_id)
    references public.profiles(id, school_id)
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
  add column if not exists responsible_staff_id uuid;

alter table public.events
  add column if not exists eligibility_notes text;

alter table public.events
  add column if not exists experience_level public.event_experience_level;

alter table public.events
  add column if not exists accessibility_notes text;

alter table public.events
  add column if not exists cost_type public.event_cost_type;

alter table public.events
  add column if not exists cost_amount numeric(12, 2);

alter table public.events
  add column if not exists cost_currency text;

alter table public.events
  add column if not exists cost_notes text;

alter table public.events
  add column if not exists required_materials text;

alter table public.events
  add column if not exists expected_commitment text;

alter table public.events
  add column if not exists cancellation_notice text;

do $$
begin
  alter table public.events
    add constraint events_responsible_staff_school_fk
    foreign key (responsible_staff_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_cost_details_valid check (
      (
        cost_type is null
        and cost_amount is null
        and cost_currency is null
        and cost_notes is null
      )
      or (
        cost_type = 'free'
        and cost_amount is null
        and cost_currency is null
      )
      or (
        cost_type = 'paid'
        and cost_amount > 0
        and cost_currency = 'MNT'
      )
      or (
        cost_type = 'variable'
        and cost_amount is null
        and cost_currency is null
        and cost_notes is not null
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_cost_notes_valid check (
      cost_notes is null
      or (
        length(cost_notes) between 1 and 500
        and cost_notes = btrim(cost_notes)
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_required_materials_valid check (
      required_materials is null
      or (
        length(required_materials) between 1 and 1000
        and required_materials = btrim(required_materials)
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_expected_commitment_valid check (
      expected_commitment is null
      or (
        length(expected_commitment) between 1 and 500
        and expected_commitment = btrim(expected_commitment)
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_cancellation_notice_valid check (
      cancellation_notice is null
      or (
        length(cancellation_notice) between 1 and 1000
        and cancellation_notice = btrim(cancellation_notice)
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_eligibility_notes_length
    check (eligibility_notes is null or length(eligibility_notes) <= 500);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_accessibility_notes_length
    check (accessibility_notes is null or length(accessibility_notes) <= 2000);
exception
  when duplicate_object then null;
end $$;

create or replace function public.validate_event_responsible_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.profile_role;
begin
  if actor_id is not null then
    select p.role into actor_role
    from public.profiles p
    where p.id = actor_id;

    if actor_role = 'student' and (
      (tg_op = 'INSERT' and new.responsible_staff_id is not null)
      or (tg_op = 'UPDATE' and new.responsible_staff_id is distinct from old.responsible_staff_id)
    ) then
      raise exception 'students cannot assign event responsible staff'
        using errcode = '42501';
    end if;

    if actor_role = 'teacher'
      and (
        (tg_op = 'INSERT' and new.responsible_staff_id is not null)
        or (tg_op = 'UPDATE' and new.responsible_staff_id is distinct from old.responsible_staff_id)
      )
      and new.responsible_staff_id is distinct from actor_id
    then
      raise exception 'teachers can assign only themselves as event responsible staff'
        using errcode = '42501';
    end if;
  end if;

  if new.responsible_staff_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.responsible_staff_id
      and p.school_id = new.school_id
      and p.status = 'active'
      and p.role in ('school_admin', 'teacher')
  ) then
    raise exception 'responsible staff must be active school staff from the event school'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_event_responsible_staff() from public;
revoke all on function public.validate_event_responsible_staff() from anon;
revoke all on function public.validate_event_responsible_staff() from authenticated;

drop trigger if exists validate_event_responsible_staff on public.events;
create trigger validate_event_responsible_staff
  before insert or update of responsible_staff_id, school_id on public.events
  for each row execute function public.validate_event_responsible_staff();

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

drop trigger if exists set_club_profiles_updated_at on public.club_profiles;
create trigger set_club_profiles_updated_at
  before update on public.club_profiles
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
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.profile_id = auth.uid()
      and pa.status = 'active'
  )
$$;

create or replace function public.current_platform_admin_can_use_event_school(
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_platform_admin()
    and exists (
      select 1
      from public.schools s
      where s.id = target_school_id
        and s.status = 'active'
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

create or replace function public.enforce_event_staff_cancellation_notice()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  cancellation_notice_changed boolean;
begin
  cancellation_notice_changed := case
    when tg_op = 'INSERT' then new.cancellation_notice is not null
    else new.cancellation_notice is distinct from old.cancellation_notice
  end;

  if current_user = 'authenticated'
    and cancellation_notice_changed
    and not (
      public.current_user_is_platform_admin()
      or public.current_user_can_manage_school(new.school_id)
    )
  then
    raise exception using
      errcode = '42501',
      message = 'event cancellation notices require staff authority';
  end if;

  return new;
end;
$$;

alter function public.enforce_event_staff_cancellation_notice() owner to postgres;
revoke all on function public.enforce_event_staff_cancellation_notice()
  from public, anon, authenticated;

drop trigger if exists enforce_event_staff_cancellation_notice on public.events;
create trigger enforce_event_staff_cancellation_notice
  before insert or update on public.events
  for each row execute function public.enforce_event_staff_cancellation_notice();

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

create or replace function public.current_user_can_view_club_profile(
  target_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clubs c
    join public.schools s on s.id = c.school_id
    where c.id = target_club_id
      and s.status = 'active'
      and (
        public.current_user_is_platform_admin()
        or (
          c.school_id = public.current_profile_school_id()
          and (
            c.status = 'active'
            or public.current_user_can_manage_school(c.school_id)
            or public.current_user_is_club_leader(c.id)
          )
        )
      )
  )
$$;

create or replace function public.current_user_can_edit_club_profile(
  target_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clubs c
    join public.schools s on s.id = c.school_id
    where c.id = target_club_id
      and s.status = 'active'
      and (
        public.current_user_is_platform_admin()
        or (
          c.school_id = public.current_profile_school_id()
          and (
            public.current_user_can_manage_school(c.school_id)
            or public.current_user_is_club_leader(c.id)
          )
        )
      )
  )
$$;

create or replace function public.club_media_upload_metadata_is_valid(
  object_name text,
  object_metadata jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  object_kind text := split_part(object_name, '/', 3);
  object_extension text := lower(regexp_replace(object_name, '^.*\.', ''));
  object_mime text := lower(coalesce(object_metadata ->> 'mimetype', ''));
  object_size bigint;
begin
  if coalesce(object_metadata ->> 'size', '') !~ '^[0-9]+$' then
    return false;
  end if;

  object_size := (object_metadata ->> 'size')::bigint;

  if object_size < 1 then
    return false;
  end if;

  if not (
    (object_extension = 'jpg' and object_mime = 'image/jpeg')
    or (object_extension = 'png' and object_mime = 'image/png')
    or (object_extension = 'webp' and object_mime = 'image/webp')
  ) then
    return false;
  end if;

  return case object_kind
    when 'logo' then object_size <= 2097152
    when 'banner' then object_size <= 5242880
    else false
  end;
end;
$$;

create or replace function public.current_user_can_upload_club_media(
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  target_school_id uuid;
  target_club_id uuid;
begin
  if object_name !~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}/(logo|banner)/[0-9a-f-]{36}\.(jpg|png|webp)$'
  then
    return false;
  end if;

  begin
    target_school_id := split_part(object_name, '/', 1)::uuid;
    target_club_id := split_part(object_name, '/', 2)::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.club_media_path_is_valid(
      object_name,
      target_school_id,
      target_club_id,
      null
    )
    and exists (
      select 1
      from public.clubs c
      where c.id = target_club_id
        and c.school_id = target_school_id
        and public.current_user_can_edit_club_profile(c.id)
    );
end;
$$;

create or replace function public.current_user_can_read_club_media(
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  target_school_id uuid;
  target_club_id uuid;
begin
  if object_name !~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}/(logo|banner)/[0-9a-f-]{36}\.(jpg|png|webp)$'
  then
    return false;
  end if;

  begin
    target_school_id := split_part(object_name, '/', 1)::uuid;
    target_club_id := split_part(object_name, '/', 2)::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.club_media_path_is_valid(
      object_name,
      target_school_id,
      target_club_id,
      null
    )
    and public.current_user_can_view_club_profile(target_club_id)
    and exists (
      select 1
      from public.club_profiles cp
      where cp.club_id = target_club_id
        and cp.school_id = target_school_id
        and object_name in (cp.logo_path, cp.banner_path)
    );
end;
$$;

create or replace function public.club_profile_actor_can_edit_media(
  actor_profile_id uuid,
  target_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clubs c
    join public.schools s on s.id = c.school_id
    where c.id = target_club_id
      and s.status = 'active'
      and (
        exists (
          select 1
          from public.platform_admins pa
          where pa.profile_id = actor_profile_id
            and pa.status = 'active'
        )
        or exists (
          select 1
          from public.profiles p
          where p.id = actor_profile_id
            and p.school_id = c.school_id
            and p.status = 'active'
            and p.role in ('school_admin', 'teacher')
        )
        or exists (
          select 1
          from public.profiles p
          join public.student_rosters sr
            on sr.profile_id = p.id
           and sr.school_id = p.school_id
           and sr.status = 'active'
          join public.club_memberships cm
            on cm.student_roster_id = sr.id
           and cm.school_id = sr.school_id
           and cm.club_id = c.id
           and cm.role = 'leader'
           and cm.status = 'active'
          where p.id = actor_profile_id
            and p.school_id = c.school_id
            and p.status = 'active'
            and p.role = 'student'
        )
      )
  )
$$;

create or replace function public.set_club_profile_media(
  target_club_id uuid,
  media_kind text,
  media_path text,
  actor_profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  target_school_id uuid;
  previous_path text;
begin
  if media_kind not in ('logo', 'banner') then
    raise exception using errcode = '22023', message = 'invalid club media kind';
  end if;

  if not public.club_profile_actor_can_edit_media(
    actor_profile_id,
    target_club_id
  ) then
    raise exception using errcode = '42501', message = 'club media edit denied';
  end if;

  select c.school_id
    into target_school_id
  from public.clubs c
  where c.id = target_club_id;

  if target_school_id is null then
    raise exception using errcode = '22023', message = 'club not found';
  end if;

  if media_path is not null then
    if not public.club_media_path_is_valid(
      media_path,
      target_school_id,
      target_club_id,
      media_kind
    ) then
      raise exception using errcode = '22023', message = 'invalid club media path';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'club-media'
        and o.name = media_path
    ) then
      raise exception using errcode = '22023', message = 'club media object not found';
    end if;
  end if;

  select case media_kind
      when 'logo' then cp.logo_path
      else cp.banner_path
    end
    into previous_path
  from public.club_profiles cp
  where cp.club_id = target_club_id
  for update;

  insert into public.club_profiles (
    club_id,
    school_id,
    logo_path,
    banner_path,
    updated_by_profile_id
  ) values (
    target_club_id,
    target_school_id,
    case when media_kind = 'logo' then media_path else null end,
    case when media_kind = 'banner' then media_path else null end,
    actor_profile_id
  )
  on conflict (club_id) do update set
    logo_path = case
      when media_kind = 'logo' then excluded.logo_path
      else club_profiles.logo_path
    end,
    banner_path = case
      when media_kind = 'banner' then excluded.banner_path
      else club_profiles.banner_path
    end,
    updated_by_profile_id = excluded.updated_by_profile_id;

  return previous_path;
end;
$$;

create or replace function public.upsert_club_profile(
  target_club_id uuid,
  profile_tagline text default null,
  profile_about text default null,
  profile_meeting_schedule text default null,
  profile_meeting_location text default null,
  profile_eligibility_notes text default null,
  profile_commitment_notes text default null,
  profile_accessibility_notes text default null,
  profile_cost_notes text default null,
  profile_materials_notes text default null,
  profile_theme_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  club_school_id uuid;
  normalized_tagline text := nullif(btrim(profile_tagline), '');
  normalized_about text := nullif(btrim(profile_about), '');
  normalized_meeting_schedule text := nullif(btrim(profile_meeting_schedule), '');
  normalized_meeting_location text := nullif(btrim(profile_meeting_location), '');
  normalized_eligibility_notes text := nullif(btrim(profile_eligibility_notes), '');
  normalized_commitment_notes text := nullif(btrim(profile_commitment_notes), '');
  normalized_accessibility_notes text := nullif(btrim(profile_accessibility_notes), '');
  normalized_cost_notes text := nullif(btrim(profile_cost_notes), '');
  normalized_materials_notes text := nullif(btrim(profile_materials_notes), '');
  normalized_theme_key text := nullif(btrim(profile_theme_key), '');
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select c.school_id
    into club_school_id
  from public.clubs c
  where c.id = target_club_id;

  if club_school_id is null then
    raise exception using errcode = '22023', message = 'club not found';
  end if;

  if not public.current_user_can_edit_club_profile(target_club_id) then
    raise exception using errcode = '42501', message = 'club profile edit denied';
  end if;

  insert into public.club_profiles (
    club_id, school_id, tagline, about, meeting_schedule, meeting_location,
    eligibility_notes, commitment_notes, accessibility_notes, cost_notes,
    materials_notes, theme_key, updated_by_profile_id
  ) values (
    target_club_id, club_school_id, normalized_tagline, normalized_about,
    normalized_meeting_schedule, normalized_meeting_location,
    normalized_eligibility_notes, normalized_commitment_notes,
    normalized_accessibility_notes, normalized_cost_notes,
    normalized_materials_notes, normalized_theme_key, actor_id
  )
  on conflict (club_id) do update set
    tagline = excluded.tagline,
    about = excluded.about,
    meeting_schedule = excluded.meeting_schedule,
    meeting_location = excluded.meeting_location,
    eligibility_notes = excluded.eligibility_notes,
    commitment_notes = excluded.commitment_notes,
    accessibility_notes = excluded.accessibility_notes,
    cost_notes = excluded.cost_notes,
    materials_notes = excluded.materials_notes,
    theme_key = excluded.theme_key,
    updated_by_profile_id = excluded.updated_by_profile_id;

  return target_club_id;
end;
$$;

create or replace function public.get_club_member_count(target_club_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.current_user_can_view_club_profile(target_club_id) then
    raise exception using errcode = '42501', message = 'club profile view denied';
  end if;

  return (
    select count(*)
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.status = 'active'
  );
end;
$$;

create or replace function public.get_my_club_membership(target_club_id uuid)
returns table (role public.club_member_role, status public.club_member_status)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select cm.role, cm.status
  from public.club_memberships cm
  where cm.club_id = target_club_id
    and cm.school_id = public.current_profile_school_id()
    and cm.student_roster_id = public.current_student_roster_id()
  limit 1
$$;

create or replace function public.current_user_can_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_platform_admin()
    or exists (
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
set search_path = pg_catalog, public
as $$
  select public.current_user_is_platform_admin()
    or exists (
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
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.status = 'approved'
      and (
        public.current_user_is_platform_admin()
        or public.current_user_can_manage_school(e.school_id)
      )
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

grant select, insert, update on table public.announcements to authenticated;
alter table public.invite_codes enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.club_profiles enable row level security;
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
    and created_by_profile_id = auth.uid()
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

drop policy if exists "Authorized school members can view club profiles"
  on public.club_profiles;
create policy "Authorized school members can view club profiles"
  on public.club_profiles
  for select
  to authenticated
  using (public.current_user_can_view_club_profile(club_id));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'club-media',
  'club-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized users can read referenced club media"
  on storage.objects;
create policy "Authorized users can read referenced club media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'club-media'
    and storage.allow_only_operation('storage.object.get_authenticated')
    and public.current_user_can_read_club_media(name)
  );

drop policy if exists "Authorized club editors can upload club media"
  on storage.objects;
create policy "Authorized club editors can upload club media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'club-media'
    and public.current_user_can_upload_club_media(name)
    and public.club_media_upload_metadata_is_valid(name, metadata)
  );

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

drop policy if exists "Platform admins can view all events" on public.events;
create policy "Platform admins can view all events"
  on public.events for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create events" on public.events;
create policy "Platform admins can create events"
  on public.events for insert to authenticated
  with check (public.current_platform_admin_can_use_event_school(school_id));

drop policy if exists "Platform admins can update all events" on public.events;
create policy "Platform admins can update all events"
  on public.events for update to authenticated
  using (public.current_user_is_platform_admin())
  with check (public.current_platform_admin_can_use_event_school(school_id));

drop policy if exists "Platform admins can view event clubs" on public.clubs;
create policy "Platform admins can view event clubs"
  on public.clubs for select to authenticated
  using (public.current_user_is_platform_admin());

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

drop policy if exists "Platform admins can view event shares" on public.event_school_shares;
create policy "Platform admins can view event shares"
  on public.event_school_shares for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create event shares" on public.event_school_shares;
create policy "Platform admins can create event shares"
  on public.event_school_shares for insert to authenticated
  with check (public.current_user_can_share_event_with_school(event_id, school_id));

drop policy if exists "Platform admins can remove event shares" on public.event_school_shares;
create policy "Platform admins can remove event shares"
  on public.event_school_shares for delete to authenticated
  using (public.current_user_is_platform_admin());

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

drop policy if exists "Platform admins can view event attendees" on public.event_attendees;
create policy "Platform admins can view event attendees"
  on public.event_attendees for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create event attendees" on public.event_attendees;
create policy "Platform admins can create event attendees"
  on public.event_attendees for insert to authenticated
  with check (
    public.current_user_is_platform_admin()
    and exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and e.school_id = event_attendees.school_id
    )
  );

drop policy if exists "Platform admins can update event attendees" on public.event_attendees;
create policy "Platform admins can update event attendees"
  on public.event_attendees for update to authenticated
  using (public.current_user_is_platform_admin())
  with check (public.current_user_is_platform_admin());

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

drop policy if exists "Platform admins can view attendance checkins" on public.attendance_checkins;
create policy "Platform admins can view attendance checkins"
  on public.attendance_checkins for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create attendance checkins" on public.attendance_checkins;
create policy "Platform admins can create attendance checkins"
  on public.attendance_checkins for insert to authenticated
  with check (
    public.current_user_is_platform_admin()
    and exists (
      select 1 from public.events e
      where e.id = attendance_checkins.event_id
        and e.school_id = attendance_checkins.school_id
    )
  );

grant select, insert, update on table public.events to authenticated;
grant select on table public.clubs to authenticated;
revoke all privileges on table public.club_profiles from anon;
revoke insert, update, delete, truncate, trigger, references
  on table public.club_profiles
  from authenticated;
grant select on table public.club_profiles to authenticated;
grant select, insert, delete on table public.event_school_shares to authenticated;
grant select, insert, update on table public.event_attendees to authenticated;
grant select, insert on table public.attendance_checkins to authenticated;


-- Phase 3: simplified confidential safety-report workflow.
-- Digital privacy requests are handled manually through the participating school.

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

create table if not exists public.restricted_workflow_audit_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  safeguarding_designation_id uuid references public.safeguarding_staff_designations(id) on delete set null,
  safety_report_id uuid references public.safety_reports(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint restricted_workflow_audit_target_check
    check (
      (
        target_type = 'safeguarding_designation'
        and safeguarding_designation_id is not null
        and safety_report_id is null
      )
      or (
        target_type = 'safety_report'
        and safeguarding_designation_id is null
        and safety_report_id is not null
      )
    )
);

create index if not exists restricted_workflow_audit_school_created_at_idx
  on public.restricted_workflow_audit_events (school_id, created_at desc);

create index if not exists restricted_workflow_audit_report_created_at_idx
  on public.restricted_workflow_audit_events (safety_report_id, created_at desc)
  where safety_report_id is not null;

comment on table public.safeguarding_staff_designations is
  'School-scoped safety response team designations. Maximum three active eligible responders per school. Not a profile role.';
comment on table public.safety_reports is
  'Highly confidential student/staff safety reports. Narratives must not enter ordinary analytics or logs.';
comment on column public.safety_reports.description is
  'Sensitive free text. Accessible only to actively designated same-school safeguarding staff.';
comment on table public.restricted_workflow_audit_events is
  'Restricted safety status-only audit stream. Never store report narratives, exports, or sensitive case notes.';

create or replace function public.current_user_is_designated_safeguarding_staff(
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
    from public.profiles p
    join public.safeguarding_staff_designations ssd
      on ssd.profile_id = p.id
     and ssd.school_id = p.school_id
    where p.id = auth.uid()
      and p.school_id = target_school_id
      and p.status = 'active'
      and p.role in ('school_admin', 'teacher')
      and ssd.status = 'active'
  )
$$;

revoke all on function public.current_user_is_designated_safeguarding_staff(uuid) from public;
grant execute on function public.current_user_is_designated_safeguarding_staff(uuid) to authenticated;

revoke all on function public.current_user_can_manage_event(uuid) from public, anon;
revoke all on function public.current_user_can_manage_event_owner_school(uuid) from public, anon;
revoke all on function public.current_user_can_share_event_with_school(uuid, uuid) from public, anon;
grant execute on function public.current_user_can_manage_event(uuid) to authenticated;
grant execute on function public.current_user_can_manage_event_owner_school(uuid) to authenticated;
grant execute on function public.current_user_can_share_event_with_school(uuid, uuid) to authenticated;

alter function public.current_user_can_view_club_profile(uuid) owner to postgres;
revoke all on function public.current_user_can_view_club_profile(uuid)
  from public, anon;
grant execute on function public.current_user_can_view_club_profile(uuid)
  to authenticated;

alter function public.current_user_can_edit_club_profile(uuid) owner to postgres;
revoke all on function public.current_user_can_edit_club_profile(uuid)
  from public, anon;
grant execute on function public.current_user_can_edit_club_profile(uuid)
  to authenticated;

alter function public.club_media_path_is_valid(text, uuid, uuid, text)
  owner to postgres;
revoke all on function public.club_media_path_is_valid(text, uuid, uuid, text)
  from public, anon, authenticated;

alter function public.club_media_upload_metadata_is_valid(text, jsonb)
  owner to postgres;
revoke all on function public.club_media_upload_metadata_is_valid(text, jsonb)
  from public, anon;
grant execute on function public.club_media_upload_metadata_is_valid(text, jsonb)
  to authenticated;

alter function public.current_user_can_upload_club_media(text)
  owner to postgres;
revoke all on function public.current_user_can_upload_club_media(text)
  from public, anon;
grant execute on function public.current_user_can_upload_club_media(text)
  to authenticated;

alter function public.current_user_can_read_club_media(text)
  owner to postgres;
revoke all on function public.current_user_can_read_club_media(text)
  from public, anon;
grant execute on function public.current_user_can_read_club_media(text)
  to authenticated;

alter function public.club_profile_actor_can_edit_media(uuid, uuid)
  owner to postgres;
revoke all on function public.club_profile_actor_can_edit_media(uuid, uuid)
  from public, anon, authenticated;

alter function public.set_club_profile_media(uuid, text, text, uuid)
  owner to postgres;
revoke all on function public.set_club_profile_media(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.set_club_profile_media(uuid, text, text, uuid)
  to service_role;

alter function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text
) owner to postgres;
revoke all on function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;

alter function public.get_club_member_count(uuid) owner to postgres;
revoke all on function public.get_club_member_count(uuid) from public, anon;
grant execute on function public.get_club_member_count(uuid) to authenticated;

alter function public.get_my_club_membership(uuid) owner to postgres;
revoke all on function public.get_my_club_membership(uuid) from public, anon;
grant execute on function public.get_my_club_membership(uuid) to authenticated;

alter function public.current_user_is_platform_admin() owner to postgres;
revoke all on function public.current_user_is_platform_admin() from public, anon;
grant execute on function public.current_user_is_platform_admin() to authenticated;

create or replace function public.get_platform_event_school_options()
returns table (id uuid, name text, slug text, status public.school_status)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select s.id, s.name, s.slug, s.status
  from public.schools s
  where public.current_user_is_platform_admin()
    and s.status = 'active'
  order by s.name, s.id
$$;

alter function public.get_platform_event_school_options() owner to postgres;
revoke all on function public.get_platform_event_school_options() from public, anon;
grant execute on function public.get_platform_event_school_options() to authenticated;

alter function public.current_platform_admin_can_use_event_school(uuid) owner to postgres;
revoke all on function public.current_platform_admin_can_use_event_school(uuid) from public, anon;
grant execute on function public.current_platform_admin_can_use_event_school(uuid) to authenticated;

create or replace function public.get_platform_event_staff_options(target_school_id uuid)
returns table (id uuid, full_name text, role public.profile_role)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id, p.full_name, p.role
  from public.profiles p
  join public.schools s on s.id = p.school_id
  where public.current_user_is_platform_admin()
    and s.id = target_school_id
    and s.status = 'active'
    and p.status = 'active'
    and p.role in ('school_admin', 'teacher')
  order by p.full_name, p.id
$$;

alter function public.get_platform_event_staff_options(uuid) owner to postgres;
revoke all on function public.get_platform_event_staff_options(uuid) from public, anon;
grant execute on function public.get_platform_event_staff_options(uuid) to authenticated;

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
declare
  active_responder_count integer;
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
  else
    if new.id <> old.id
      or new.school_id <> old.school_id
      or new.profile_id <> old.profile_id
      or new.assigned_by_profile_id is distinct from old.assigned_by_profile_id
      or new.assigned_at <> old.assigned_at
      or new.created_at <> old.created_at then
      raise exception 'Safety response team designation identity cannot be changed.';
    end if;

    if new.status = old.status then
      raise exception 'Safety response team designation status did not change.';
    end if;

    new.status_changed_by_profile_id := auth.uid();
    new.status_changed_at := now();
    new.deactivated_at := case when new.status = 'inactive' then now() else null end;
    new.updated_at := now();
  end if;

  if new.status = 'active' then
    if not exists (
      select 1
      from public.profiles p
      where p.id = new.profile_id
        and p.school_id = new.school_id
        and p.status = 'active'
        and p.role in ('school_admin', 'teacher')
    ) then
      raise exception using
        errcode = '23514',
        message = 'SAFETY_RESPONSE_TEAM_PROFILE_INELIGIBLE';
    end if;

    -- Serialize activations for this school so concurrent attempts cannot both
    -- observe fewer than three active eligible responders.
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.school_id::text, 0)
    );

    select count(*) into active_responder_count
    from public.safeguarding_staff_designations ssd
    join public.profiles p
      on p.id = ssd.profile_id
     and p.school_id = ssd.school_id
    where ssd.school_id = new.school_id
      and ssd.status = 'active'
      and ssd.id <> new.id
      and p.status = 'active'
      and p.role in ('school_admin', 'teacher');

    if active_responder_count >= 3 then
      raise exception using
        errcode = 'P0001',
        message = 'SAFETY_RESPONSE_TEAM_LIMIT_REACHED';
    end if;
  end if;

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
    (old.status = 'submitted' and new.status = 'in_review')
    or (old.status = 'acknowledged' and new.status in ('in_review', 'closed'))
    or (old.status = 'in_review' and new.status = 'closed')
    or (old.status = 'external_referral' and new.status = 'closed')
  ) then
    raise exception 'Invalid safety report workflow transition.';
  end if;

  new.acknowledged_by_profile_id := old.acknowledged_by_profile_id;
  new.acknowledged_at := old.acknowledged_at;
  new.external_referral_at := old.external_referral_at;
  new.closed_by_profile_id := old.closed_by_profile_id;
  new.closed_at := old.closed_at;

  if old.acknowledged_at is null and new.status in ('in_review', 'closed') then
    new.acknowledged_by_profile_id := auth.uid();
    new.acknowledged_at := now();
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
      when new.status = 'in_review' then 'safety_report.review_started'
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

drop trigger if exists audit_safeguarding_designation on public.safeguarding_staff_designations;
create trigger audit_safeguarding_designation
  after insert or update on public.safeguarding_staff_designations
  for each row execute function public.log_restricted_workflow_event();

drop trigger if exists audit_safety_report on public.safety_reports;
create trigger audit_safety_report
  after insert or update on public.safety_reports
  for each row execute function public.log_restricted_workflow_event();

alter table public.safeguarding_staff_designations enable row level security;
alter table public.safety_reports enable row level security;
alter table public.restricted_workflow_audit_events enable row level security;

revoke all on table public.safeguarding_staff_designations from public, anon, authenticated;
revoke all on table public.safety_reports from public, anon, authenticated;
revoke all on table public.restricted_workflow_audit_events from public, anon, authenticated;

grant select, insert, update on table public.safeguarding_staff_designations to authenticated;
grant select, insert, update on table public.safety_reports to authenticated;
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

drop policy if exists "Safeguarding staff can view report audit events" on public.restricted_workflow_audit_events;
create policy "Safeguarding staff can view report audit events"
  on public.restricted_workflow_audit_events
  for select
  to authenticated
  using (
    target_type = 'safety_report'
    and public.current_user_is_designated_safeguarding_staff(school_id)
  );

drop policy if exists "School admins can view designation audit events" on public.restricted_workflow_audit_events;
create policy "School admins can view designation audit events"
  on public.restricted_workflow_audit_events
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and target_type = 'safeguarding_designation'
  );

revoke all on function public.current_user_is_designated_safeguarding_staff(uuid)
  from public, anon, authenticated;
revoke all on function public.get_my_safety_report_receipts()
  from public, anon, authenticated;
revoke all on function public.log_restricted_workflow_event()
  from public, anon, authenticated;
revoke all on function public.prepare_safeguarding_designation()
  from public, anon, authenticated;
revoke all on function public.prepare_safety_report_submission()
  from public, anon, authenticated;
revoke all on function public.protect_safety_report_workflow()
  from public, anon, authenticated;

grant execute on function public.current_user_is_designated_safeguarding_staff(uuid)
  to authenticated;
grant execute on function public.get_my_safety_report_receipts()
  to authenticated;



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
