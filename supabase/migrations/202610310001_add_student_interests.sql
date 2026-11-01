-- Students choose the activity categories they are interested in, so the clubs
-- page can show matching clubs first. Rows hold only a category from the fixed
-- platform list: no free text. Students manage their own rows; school staff can
-- read them for their own school.

create table if not exists public.student_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  constraint student_interests_pkey primary key (profile_id, category),
  constraint student_interests_category_check check (
    category in (
      'Mental Health',
      'Sports',
      'Arts',
      'Volunteering',
      'Academic',
      'Career',
      'Outdoor',
      'Culture',
      'Leadership',
      'Social',
      'Other'
    )
  )
);

create index if not exists student_interests_school_category_idx
  on public.student_interests (school_id, category);

alter table public.student_interests enable row level security;

drop policy if exists "Students and their school staff can view interests"
  on public.student_interests;
create policy "Students and their school staff can view interests"
  on public.student_interests
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_can_manage_school(school_id)
  );

drop policy if exists "Students can add their own interests"
  on public.student_interests;
create policy "Students can add their own interests"
  on public.student_interests
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'student'
  );

drop policy if exists "Students can remove their own interests"
  on public.student_interests;
create policy "Students can remove their own interests"
  on public.student_interests
  for delete
  to authenticated
  using (profile_id = auth.uid());

revoke all on table public.student_interests from public, anon;
grant select, insert, delete on table public.student_interests to authenticated;
