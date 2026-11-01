-- Two first-visit labels that staff or club leaders set on a club page:
-- beginners are welcome, and the first visit is free. The student survey
-- named both as what would help a first visit.
--
-- upsert_club_profile gains two optional boolean parameters. A null keeps
-- the stored value, so a save from an older form never clears a label.

alter table public.club_profiles
  add column if not exists beginners_welcome boolean not null default false,
  add column if not exists first_visit_free boolean not null default false;

drop function if exists public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text
);

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
  profile_theme_key text default null,
  profile_beginners_welcome boolean default null,
  profile_first_visit_free boolean default null
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
    beginners_welcome,
    first_visit_free,
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
    coalesce(profile_beginners_welcome, false),
    coalesce(profile_first_visit_free, false),
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
    beginners_welcome = coalesce(
      profile_beginners_welcome,
      public.club_profiles.beginners_welcome
    ),
    first_visit_free = coalesce(
      profile_first_visit_free,
      public.club_profiles.first_visit_free
    ),
    updated_by_profile_id = excluded.updated_by_profile_id;

  return target_club_id;
end;
$$;

alter function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean
) owner to postgres;
revoke all on function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean
) from public, anon;
grant execute on function public.upsert_club_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean
) to authenticated;

notify pgrst, 'reload schema';
