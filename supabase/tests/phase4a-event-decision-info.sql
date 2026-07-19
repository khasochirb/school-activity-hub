\set ON_ERROR_STOP on
\set QUIET on

-- Uses the synthetic identities created by phase3c-rls-rpc.sql in the same
-- sentinel-protected disposable local database.

select phase3c_test.assert_true(
  (
    select responsible_staff_id is null
      and eligibility_notes is null
      and experience_level is null
      and accessibility_notes is null
    from public.events
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'
  ),
  'legacy events remain valid with unspecified Phase 4A fields'
);

select phase3c_test.assert_lives(
  $$update public.events
    set responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001003',
        eligibility_notes = 'Grades are described in plain language',
        experience_level = 'beginner_friendly',
        accessibility_notes = 'Step-free room; ask staff about seating options'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'active same-school teacher is accepted as responsible adult'
);

select phase3c_test.assert_throws(
  $$update public.events
    set responsible_staff_id = 'bbbbbbbb-0000-4000-8000-000000002002'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'cross-school staff is rejected as responsible adult'
);

select phase3c_test.assert_throws(
  $$update public.events
    set responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001004'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'student profile is rejected as responsible adult'
);

select phase3c_test.assert_throws(
  $$update public.events
    set responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001006'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'inactive teacher is rejected as responsible adult'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001003', false);
select phase3c_test.assert_throws(
  $$update public.events
    set responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001002'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'teacher cannot assign another staff member as responsible adult'
);
select phase3c_test.assert_lives(
  $$update public.events
    set responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001003'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'teacher can assign themselves as responsible adult'
);
reset role;

select phase3c_test.assert_true(
  (
    select enum_range(null::public.event_experience_level)::text[]
  ) = array['beginner_friendly', 'prior_experience_recommended']::text[],
  'experience level has exactly two explicit values and nullable means unspecified'
);

select phase3c_test.assert_throws(
  $$update public.events
    set eligibility_notes = repeat('x', 501)
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'eligibility text longer than 500 characters is rejected'
);

select phase3c_test.assert_throws(
  $$update public.events
    set accessibility_notes = repeat('x', 2001)
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'accessibility text longer than 2000 characters is rejected'
);

select phase3c_test.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('profiles', 'student_rosters')
      and column_name ilike '%accessib%'
  ),
  'accessibility information is not stored on student profiles or rosters'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001004', false);
select phase3c_test.assert_command_rows(
  $$update public.events
    set eligibility_notes = 'Unauthorized change'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  0,
  'student without event-management authority cannot modify Phase 4A fields'
);
reset role;

select phase3c_test.assert_true(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_attendees'
      and policyname = 'Students can register themselves for approved events'
  )
  and exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_checkins'
  ),
  'registration and attendance RLS policies remain present'
);

select 'PHASE4A_EVENT_INFO_TESTS_PASSED';
