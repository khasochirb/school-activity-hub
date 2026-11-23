-- Joining a club by application (meeting notes 23 Nov 2026, §3b "Joining a club").
--
-- * Each club chooses how students join: 'open' (join straight away, as
--   before) or 'apply' (send a request with the club's application form).
--   Existing clubs stay 'open' so nothing changes for clubs that have no one
--   to review requests; clubs started from an approved proposal begin as
--   'apply' (the app sets that when it creates them).
-- * club_join_questions: the application form the club leader (or the
--   supervising teacher) builds. Short answer, paragraph, one choice or
--   several choices, each optional or required.
-- * club_join_requests: a student's request with their answers. The answers
--   are stored with the question text as it was, so editing the form later
--   never changes what a student already sent.
--
-- Access model: all writes go through server actions using the service role
-- after they check who is acting (the student themselves; the club leader,
-- the supervising teacher or a school admin for decisions). Clients get
-- read access only: questions to anyone in the school, requests to the
-- student who sent them and to school staff.

alter table public.clubs
  add column if not exists join_mode text not null default 'open';

alter table public.clubs
  drop constraint if exists clubs_join_mode_check;
alter table public.clubs
  add constraint clubs_join_mode_check check (join_mode in ('open', 'apply'));

create table if not exists public.club_join_questions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  position integer not null default 0,
  prompt text not null,
  kind text not null default 'short',
  options jsonb not null default '[]'::jsonb,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint club_join_questions_club_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id) on delete cascade,
  constraint club_join_questions_kind_check check (kind in ('short', 'long', 'choice', 'checkbox')),
  constraint club_join_questions_prompt_length check (length(btrim(prompt)) between 1 and 300),
  constraint club_join_questions_options_array check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 12)
);

create index if not exists club_join_questions_club_idx
  on public.club_join_questions (club_id, position);

create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_roster_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  answers jsonb not null default '[]'::jsonb,
  decided_by_profile_id uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_join_requests_club_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id) on delete cascade,
  constraint club_join_requests_student_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id) on delete cascade,
  constraint club_join_requests_status_check check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  constraint club_join_requests_answers_array check (jsonb_typeof(answers) = 'array'),
  constraint club_join_requests_note_length check (decision_note is null or length(decision_note) <= 1000)
);

-- One open request per student per club.
create unique index if not exists club_join_requests_one_pending
  on public.club_join_requests (club_id, student_roster_id)
  where status = 'pending';

create index if not exists club_join_requests_club_status_idx
  on public.club_join_requests (club_id, status, created_at);

create index if not exists club_join_requests_profile_idx
  on public.club_join_requests (profile_id, created_at desc);

alter table public.club_join_questions enable row level security;
revoke all on public.club_join_questions from anon, authenticated;
grant select on public.club_join_questions to authenticated;

drop policy if exists "School members read club application questions" on public.club_join_questions;
create policy "School members read club application questions"
  on public.club_join_questions
  for select
  to authenticated
  using (school_id = public.current_profile_school_id());

alter table public.club_join_requests enable row level security;
revoke all on public.club_join_requests from anon, authenticated;
grant select on public.club_join_requests to authenticated;

drop policy if exists "Students read their own join requests; staff read their school" on public.club_join_requests;
create policy "Students read their own join requests; staff read their school"
  on public.club_join_requests
  for select
  to authenticated
  using (profile_id = auth.uid() or public.current_user_can_manage_school(school_id));

notify pgrst, 'reload schema';
