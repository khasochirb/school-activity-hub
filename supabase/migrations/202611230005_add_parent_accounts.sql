-- Parent accounts (meeting notes 23 Nov 2026, §2: "Generate two codes per
-- student: one for the student, one for their parent").
--
-- * profile_role gains 'parent'.
-- * invite_codes.audience says who a code is for. Every existing code is a
--   student code; a parent code is redeemed at /join/parent.
-- * parent_links ties a parent account to each child it may see. A parent
--   with two children redeems two codes into one account.
--
-- Access model: a parent sees only their own children, and only through
-- server code that checks parent_links first. In the database a parent can
-- read their own profile and their own links and nothing school-wide:
-- current_profile_school_id() returns null for parents, so the "anyone at this
-- school" read policies (school, clubs, club proposals, join questions) do not
-- apply to them. Parents are adults outside the school; students are minors.

alter type public.profile_role add value if not exists 'parent';

alter table public.invite_codes
  add column if not exists audience text not null default 'student';

alter table public.invite_codes
  drop constraint if exists invite_codes_audience_check;
alter table public.invite_codes
  add constraint invite_codes_audience_check check (audience in ('student', 'parent'));

create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  parent_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_roster_id uuid not null,
  invite_code_id uuid references public.invite_codes(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint parent_links_unique unique (parent_profile_id, student_roster_id),
  constraint parent_links_student_school_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id) on delete cascade
);

create index if not exists parent_links_student_idx
  on public.parent_links (student_roster_id);

alter table public.parent_links enable row level security;
revoke all on public.parent_links from anon, authenticated;
grant select on public.parent_links to authenticated;

drop policy if exists "Parents read their own links; staff read their school" on public.parent_links;
create policy "Parents read their own links; staff read their school"
  on public.parent_links
  for select
  to authenticated
  using (parent_profile_id = auth.uid() or public.current_user_can_manage_school(school_id));

-- Parents get no school-wide reads. (The text cast keeps this valid in the
-- same transaction that adds the enum value.)
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
    and p.role::text <> 'parent'
  limit 1
$$;

notify pgrst, 'reload schema';
