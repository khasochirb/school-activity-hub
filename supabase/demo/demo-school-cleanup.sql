-- Removes exactly the rows supabase/demo/demo-school-seed.sql added, by their
-- fixed md5('sah-demo-…') ids and the DEMO- student numbers. Nothing else.

do $$
declare
  ids uuid[];
begin
  select array_agg(md5('sah-demo-event-' || i)::uuid) into ids from generate_series(1, 8) as i;
  delete from public.event_attendees where event_id = any(ids);
  delete from public.events where id = any(ids);

  delete from public.event_attendees
  where id in (md5('sah-demo-attendee-student-1')::uuid, md5('sah-demo-attendee-student-2')::uuid);

  delete from public.club_memberships
  where id in (
    select md5('sah-demo-member-' || i || s)::uuid
    from generate_series(1, 12) as i, unnest(array['-a', '-b']) as s
  );

  delete from public.student_rosters
  where id in (select md5('sah-demo-roster-' || i)::uuid from generate_series(1, 12) as i)
    and student_number like 'DEMO-%';

  delete from public.announcements
  where id in (select md5('sah-demo-announcement-' || i)::uuid from generate_series(1, 3) as i);

  raise notice 'Demo data removed.';
end;
$$;
