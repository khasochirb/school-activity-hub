-- Club proposals with founding members, and in-app notifications.
--
-- A student proposes a club (name, description, category and WHY it should
-- exist) and tags at least four other students as founders. Each tagged
-- student is notified and confirms or declines. Only when all founders have
-- confirmed does the proposal reach the school admin, who approves it, picks
-- the supervising teacher, and the club starts with the proposer as leader
-- and the other founders as members.
--
-- Access model
--   * club_requests gains a 'gathering' status (founders still confirming)
--     and a reason column. Students keep reading requests of their school,
--     but the app hides 'gathering' ones from everyone except their founders.
--   * club_request_founders: written only by the server (service role) after
--     it checks who is acting. A student may read their own founder rows;
--     staff may read their school's.
--   * notifications: one row per recipient. A user may read their own and
--     set read_at on them, nothing else. Rows are created by the server.
--   * search_school_students: the only way a student sees other students'
--     names. Same school, signed-up active students who have not hidden their
--     name, never the caller; given name, family-name initial and class only,
--     at most 8 results, and only for a query of 2+ characters.

-- 1. Club requests: the reason, and the founders-gathering status.
alter table public.club_requests
  add column if not exists reason text;

alter table public.club_requests
  drop constraint if exists club_requests_reason_length;
alter table public.club_requests
  add constraint club_requests_reason_length check (reason is null or length(reason) <= 2000);

alter table public.club_requests
  drop constraint if exists club_requests_status_check;
alter table public.club_requests
  add constraint club_requests_status_check
  check (status in ('gathering', 'pending', 'approved', 'rejected', 'archived'));

-- 2. Founders of a proposal.
create table if not exists public.club_request_founders (
  id uuid primary key default gen_random_uuid(),
  club_request_id uuid not null references public.club_requests(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_proposer boolean not null default false,
  status text not null default 'invited',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint club_request_founders_unique unique (club_request_id, profile_id),
  constraint club_request_founders_status_check check (status in ('invited', 'confirmed', 'declined'))
);

create index if not exists club_request_founders_profile_idx
  on public.club_request_founders (profile_id, status);

alter table public.club_request_founders enable row level security;
revoke all on public.club_request_founders from anon, authenticated;
grant select on public.club_request_founders to authenticated;

drop policy if exists "Founders read their own rows; staff read their school" on public.club_request_founders;
create policy "Founders read their own rows; staff read their school"
  on public.club_request_founders
  for select
  to authenticated
  using (profile_id = auth.uid() or public.current_user_can_manage_school(school_id));

-- 3. In-app notifications.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_kind_format check (kind ~ '^[a-z][a-z_]{2,40}$'),
  constraint notifications_link_internal check (link is null or (link ~ '^/[A-Za-z0-9/_?=&#.-]*$' and length(link) <= 300))
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_profile_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
-- RLS gates rows, not columns: only read_at may be changed by its owner.
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications"
  on public.notifications
  for select
  to authenticated
  using (recipient_profile_id = auth.uid());

drop policy if exists "Users mark their own notifications read" on public.notifications;
create policy "Users mark their own notifications read"
  on public.notifications
  for update
  to authenticated
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());

-- 4. Finding classmates to tag as founders.
create or replace function public.search_school_students(search text)
returns table (profile_id uuid, display_name text, homeroom text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with me as (
    select p.id, p.school_id
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role = 'student'
  ), q as (
    select lower(btrim(coalesce(search, ''))) as term
  )
  select
    sr.profile_id,
    btrim(coalesce(nullif(btrim(sr.preferred_name), ''), sr.first_name))
      || ' ' || upper(left(btrim(sr.last_name), 1)) || '.' as display_name,
    nullif(btrim(sr.homeroom), '') as homeroom
  from me
  cross join q
  join public.student_rosters sr
    on sr.school_id = me.school_id
   and sr.status = 'active'
   and sr.profile_id is not null
   and sr.profile_id <> me.id
   and sr.show_name_to_classmates
  join public.profiles student
    on student.id = sr.profile_id
   and student.status = 'active'
   and student.role = 'student'
  where length(q.term) >= 2
    and (
      lower(sr.first_name) like '%' || q.term || '%'
      or lower(sr.last_name) like '%' || q.term || '%'
      or lower(coalesce(sr.preferred_name, '')) like '%' || q.term || '%'
      or lower(coalesce(sr.homeroom, '')) = q.term
    )
  order by sr.first_name, sr.last_name
  limit 8
$$;

alter function public.search_school_students(text) owner to postgres;
revoke all on function public.search_school_students(text) from public, anon;
grant execute on function public.search_school_students(text) to authenticated;

notify pgrst, 'reload schema';
