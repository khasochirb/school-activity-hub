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

alter table public.event_attendees
  add column if not exists permission_status public.event_permission_status not null default 'not_required';

update public.event_attendees ea
set permission_status = case
  when e.permission_required then 'pending'::public.event_permission_status
  else 'not_required'::public.event_permission_status
end
from public.events e
where e.id = ea.event_id
  and e.school_id = ea.school_id
  and ea.permission_status = 'not_required';

drop policy if exists "Students can register themselves for approved events" on public.event_attendees;
create policy "Students can register themselves for approved events"
  on public.event_attendees
  for insert
  to authenticated
  with check (
    attendee_school_id = public.current_profile_school_id()
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

notify pgrst, 'reload schema';
