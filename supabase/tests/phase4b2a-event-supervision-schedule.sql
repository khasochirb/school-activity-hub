\set ON_ERROR_STOP on
\set QUIET on

select phase3c_test.assert_true(
  (
    select cancellation_notice is null
    from public.events
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'
  ),
  'legacy events remain valid with unspecified Phase 4B2A fields'
);

select phase3c_test.assert_lives(
  $$update public.events
    set cancellation_notice = 'This event has been canceled'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'a bounded cancellation notice is accepted'
);

select phase3c_test.assert_lives(
  $$update public.events
    set cancellation_notice = null
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'blank-normalized null values remain valid'
);

select phase3c_test.assert_throws(
  $$update public.events set cancellation_notice = repeat('x', 1001)
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'cancellation notice longer than 1000 characters is rejected'
);

select phase3c_test.assert_throws(
  $$update public.events set cancellation_notice = '  Not trimmed  '
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'untrimmed cancellation notice is rejected at the database boundary'
);

insert into public.student_rosters (
  id, school_id, profile_id, first_name, last_name, status
) values (
  'aaaaaaaa-0000-4000-8000-000000009001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000001004',
  'Student', 'Leader', 'active'
);

insert into public.club_memberships (
  id, school_id, club_id, student_roster_id, role, status
) values (
  'aaaaaaaa-0000-4000-8000-000000009002',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000005001',
  'aaaaaaaa-0000-4000-8000-000000009001',
  'leader', 'active'
);

insert into public.events (
  id, school_id, club_id, created_by_profile_id, title, location,
  starts_at, ends_at, status
) values (
  'aaaaaaaa-0000-4000-8000-000000009003',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000005001',
  'aaaaaaaa-0000-4000-8000-000000001004',
  'Leader Draft', 'Room A', now() + interval '6 days',
  now() + interval '6 days 1 hour', 'draft'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001004', false);
select phase3c_test.assert_command_rows(
  $$update public.events set title = 'Leader Draft Updated'
    where id = 'aaaaaaaa-0000-4000-8000-000000009003'$$,
  1,
  'club leader retains existing draft-event edit authority'
);
select phase3c_test.assert_throws(
  $$update public.events set cancellation_notice = 'Forged leader notice'
    where id = 'aaaaaaaa-0000-4000-8000-000000009003'$$,
  'club leader cannot modify a staff-authored cancellation notice'
);
reset role;

select phase3c_test.assert_true(
  enum_range(null::public.event_status)::text[] = array[
    'draft', 'pending_approval', 'approved', 'rejected', 'canceled', 'completed'
  ]::text[],
  'existing approval and cancellation status semantics are unchanged'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001003', false);
select phase3c_test.assert_command_rows(
  $$update public.events set cancellation_notice = 'Teacher same-school edit'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  1,
  'teacher can edit a cancellation notice for a same-school event'
);
select phase3c_test.assert_command_rows(
  $$update public.events set cancellation_notice = 'Forbidden cross-school edit'
    where id = 'bbbbbbbb-0000-4000-8000-000000006001'$$,
  0,
  'teacher cannot edit another school event'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001001', false);
select phase3c_test.assert_command_rows(
  $$update public.events set cancellation_notice = 'School admin update'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  1,
  'school admin can edit a same-school cancellation notice'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000003001', false);
select phase3c_test.assert_command_rows(
  $$update public.events set cancellation_notice = 'Platform oversight update'
    where id = 'bbbbbbbb-0000-4000-8000-000000006001'$$,
  1,
  'platform admin can edit another school event through global event authority'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001004', false);
select phase3c_test.assert_command_rows(
  $$update public.events set cancellation_notice = 'Forbidden student edit'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  0,
  'student cannot edit cancellation information'
);
reset role;

select phase3c_test.assert_true(
  exists (
    select 1 from public.event_attendees
    where id = 'cccccccc-0000-4000-8000-000000005001'
      and status = 'registered'
  ),
  'cancellation notices leave registration unchanged'
);

select phase3c_test.assert_true(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_checkins'
  ),
  'attendance policies remain unchanged'
);

select 'PHASE4B2A_EVENT_CANCELLATION_NOTICE_TESTS_PASSED';
