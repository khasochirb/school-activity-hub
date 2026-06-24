alter table public.events
  add column if not exists shared_with_connected_schools boolean not null default false;

alter table public.events
  add column if not exists allow_connected_school_registration boolean not null default false;

do $$
begin
  alter table public.events
    add constraint events_connected_registration_requires_shared check (
      not allow_connected_school_registration
      or shared_with_connected_schools
    );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.event_school_shares (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, school_id)
);

alter table public.event_school_shares enable row level security;

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

create index if not exists event_attendees_attendee_profile_idx
  on public.event_attendees (attendee_school_id, attendee_profile_id);

create unique index if not exists event_attendees_event_profile_unique
  on public.event_attendees (event_id, attendee_profile_id)
  where attendee_profile_id is not null;

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

create index if not exists attendance_checkins_attendee_profile_idx
  on public.attendance_checkins (attendee_school_id, attendee_profile_id, checked_in_at desc);

create unique index if not exists attendance_checkins_one_success_per_event_profile
  on public.attendance_checkins (event_id, attendee_profile_id)
  where result = 'success' and attendee_profile_id is not null;

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

drop policy if exists "Event shares are visible to owner and target schools" on public.event_school_shares;
create policy "Event shares are visible to owner and target schools"
  on public.event_school_shares
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.current_user_can_manage_school(e.school_id)
    )
  );

drop policy if exists "Event owner staff can create connected school shares" on public.event_school_shares;
create policy "Event owner staff can create connected school shares"
  on public.event_school_shares
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.status = 'approved'
        and public.current_user_can_manage_school(e.school_id)
        and public.schools_have_approved_connection(e.school_id, school_id)
    )
  );

drop policy if exists "Event owner staff can remove connected school shares" on public.event_school_shares;
create policy "Event owner staff can remove connected school shares"
  on public.event_school_shares
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.current_user_can_manage_school(e.school_id)
    )
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

notify pgrst, 'reload schema';
