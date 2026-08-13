-- Authenticated club pages expose optional, school-governed presentation details.
-- Core club fields and membership rows remain outside this editing surface.

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
  )
);

create index if not exists club_profiles_school_idx
  on public.club_profiles (school_id, updated_at desc);

drop trigger if exists set_club_profiles_updated_at on public.club_profiles;
create trigger set_club_profiles_updated_at
  before update on public.club_profiles
  for each row execute function public.set_updated_at();

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

alter function public.current_user_can_view_club_profile(uuid) owner to postgres;
revoke all on function public.current_user_can_view_club_profile(uuid)
  from public, anon;
grant execute on function public.current_user_can_view_club_profile(uuid)
  to authenticated;

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

alter function public.current_user_can_edit_club_profile(uuid) owner to postgres;
revoke all on function public.current_user_can_edit_club_profile(uuid)
  from public, anon;
grant execute on function public.current_user_can_edit_club_profile(uuid)
  to authenticated;

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
    club_id,
    school_id,
    tagline,
    about,
    meeting_schedule,
    meeting_location,
    eligibility_notes,
    commitment_notes,
    accessibility_notes,
    cost_notes,
    materials_notes,
    theme_key,
    updated_by_profile_id
  ) values (
    target_club_id,
    club_school_id,
    normalized_tagline,
    normalized_about,
    normalized_meeting_schedule,
    normalized_meeting_location,
    normalized_eligibility_notes,
    normalized_commitment_notes,
    normalized_accessibility_notes,
    normalized_cost_notes,
    normalized_materials_notes,
    normalized_theme_key,
    actor_id
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

alter function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text
) owner to postgres;
revoke all on function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;

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

alter function public.get_club_member_count(uuid) owner to postgres;
revoke all on function public.get_club_member_count(uuid) from public, anon;
grant execute on function public.get_club_member_count(uuid) to authenticated;

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

alter function public.get_my_club_membership(uuid) owner to postgres;
revoke all on function public.get_my_club_membership(uuid) from public, anon;
grant execute on function public.get_my_club_membership(uuid) to authenticated;

alter table public.club_profiles enable row level security;

drop policy if exists "Authorized school members can view club profiles"
  on public.club_profiles;
create policy "Authorized school members can view club profiles"
  on public.club_profiles
  for select
  to authenticated
  using (public.current_user_can_view_club_profile(club_id));

grant select on table public.club_profiles to authenticated;

notify pgrst, 'reload schema';
