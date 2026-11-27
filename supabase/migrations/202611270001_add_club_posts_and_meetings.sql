-- Club life (owner's request, 27 Nov 2026): the club leader can see their
-- members, post updates to them, and take attendance at weekly meetings.
--
-- * club_posts: short updates from the club leader, the supervising teacher
--   or a school admin ("meeting moved to Thursday"), read by the members.
-- * club_meetings: one regular club meeting on a date.
-- * club_meeting_attendance: who was present, absent or excused at it.
--
-- Access model: nothing here is readable or writable by clients. The app
-- reads and writes with the service role after checking the person is a
-- member of the club (to read posts and their own attendance) or manages it
-- (leader, supervising teacher, school admin), in their own school.

create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint club_posts_club_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id) on delete cascade,
  constraint club_posts_body_length check (length(btrim(body)) between 1 and 2000)
);

create index if not exists club_posts_club_idx on public.club_posts (club_id, created_at desc);

create table if not exists public.club_meetings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  meeting_date date not null,
  note text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_meetings_club_fk foreign key (club_id, school_id)
    references public.clubs(id, school_id) on delete cascade,
  constraint club_meetings_one_per_day unique (club_id, meeting_date),
  constraint club_meetings_note_length check (note is null or length(note) <= 300)
);

create table if not exists public.club_meeting_attendance (
  meeting_id uuid not null references public.club_meetings(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_roster_id uuid not null,
  status text not null,
  marked_by_profile_id uuid references public.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (meeting_id, student_roster_id),
  constraint club_meeting_attendance_student_fk foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id) on delete cascade,
  constraint club_meeting_attendance_status_check check (status in ('present', 'absent', 'excused'))
);

create index if not exists club_meeting_attendance_student_idx
  on public.club_meeting_attendance (student_roster_id);

alter table public.club_posts enable row level security;
alter table public.club_meetings enable row level security;
alter table public.club_meeting_attendance enable row level security;
revoke all on public.club_posts from anon, authenticated;
revoke all on public.club_meetings from anon, authenticated;
revoke all on public.club_meeting_attendance from anon, authenticated;

notify pgrst, 'reload schema';
