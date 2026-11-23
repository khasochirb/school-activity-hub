-- Leaving a club (meeting notes 23 Nov 2026, §3b "Leaving a club").
--
-- A student who wants to quit says why (a reason from a short list plus
-- their own words) and can leave feedback for the club. The club leader, the
-- supervising teacher or a school admin reads it and approves the request;
-- only then does the membership end. Nobody decides their own request.
--
-- Access model: as for join requests. Writes go through server actions using
-- the service role after they check who is acting. Clients may only read:
-- the student their own requests, school staff their school's.

create table if not exists public.club_leave_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_roster_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason_kind text not null,
  reason text not null,
  feedback text,
  status text not null default 'pending',
  decided_by_profile_id uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_leave_requests_club_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id) on delete cascade,
  constraint club_leave_requests_student_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id) on delete cascade,
  constraint club_leave_requests_status_check check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  constraint club_leave_requests_reason_kind_check check (reason_kind in ('busy', 'schedule', 'interest', 'expectations', 'people', 'other')),
  constraint club_leave_requests_reason_length check (length(btrim(reason)) between 1 and 1000),
  constraint club_leave_requests_feedback_length check (feedback is null or length(feedback) <= 2000),
  constraint club_leave_requests_note_length check (decision_note is null or length(decision_note) <= 1000)
);

-- One open request per student per club.
create unique index if not exists club_leave_requests_one_pending
  on public.club_leave_requests (club_id, student_roster_id)
  where status = 'pending';

create index if not exists club_leave_requests_club_status_idx
  on public.club_leave_requests (club_id, status, created_at);

alter table public.club_leave_requests enable row level security;
revoke all on public.club_leave_requests from anon, authenticated;
grant select on public.club_leave_requests to authenticated;

drop policy if exists "Students read their own leave requests; staff read their school" on public.club_leave_requests;
create policy "Students read their own leave requests; staff read their school"
  on public.club_leave_requests
  for select
  to authenticated
  using (profile_id = auth.uid() or public.current_user_can_manage_school(school_id));

notify pgrst, 'reload schema';
