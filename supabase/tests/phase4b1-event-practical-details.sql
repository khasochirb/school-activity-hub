\set ON_ERROR_STOP on
\set QUIET on

-- Runs after the Phase 3C and Phase 4A suites in the same sentinel-protected
-- disposable local database.

select phase3c_test.assert_true(
  (
    select cost_type is null
      and cost_amount is null
      and cost_currency is null
      and cost_notes is null
      and required_materials is null
      and expected_commitment is null
    from public.events
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'
  ),
  'legacy events remain valid with unspecified Phase 4B1 fields'
);

select phase3c_test.assert_lives(
  $$update public.events
    set cost_type = 'free',
        cost_amount = null,
        cost_currency = null,
        cost_notes = 'Equipment rental included',
        required_materials = 'Comfortable clothing and a water bottle',
        expected_commitment = 'One 90-minute session'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'free event with practical details is accepted'
);

select phase3c_test.assert_lives(
  $$update public.events
    set cost_type = 'paid',
        cost_amount = 15000.00,
        cost_currency = 'MNT',
        cost_notes = 'Payment due before the activity'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'paid event with exact positive MNT amount is accepted'
);

select phase3c_test.assert_lives(
  $$update public.events
    set cost_type = 'variable',
        cost_amount = null,
        cost_currency = null,
        cost_notes = 'Cost depends on optional equipment rental'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'variable-cost event with an explanation is accepted'
);

select phase3c_test.assert_throws(
  $$update public.events
    set cost_type = 'paid', cost_amount = -1, cost_currency = 'MNT'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'negative paid amount is rejected'
);

select phase3c_test.assert_throws(
  $$update public.events
    set cost_type = 'free', cost_amount = 100, cost_currency = null
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'free event with a price is rejected'
);

select phase3c_test.assert_throws(
  $$update public.events
    set cost_type = 'paid', cost_amount = 100, cost_currency = 'USD'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'unsupported currency is rejected'
);

select phase3c_test.assert_throws(
  $$update public.events
    set cost_type = 'variable', cost_amount = null,
        cost_currency = null, cost_notes = null
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'variable cost without an explanation is rejected'
);

select phase3c_test.assert_throws(
  $$update public.events set cost_notes = repeat('x', 501)
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'cost notes longer than 500 characters are rejected'
);

select phase3c_test.assert_throws(
  $$update public.events set required_materials = repeat('x', 1001)
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'materials longer than 1000 characters are rejected'
);

select phase3c_test.assert_throws(
  $$update public.events set expected_commitment = repeat('x', 501)
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'commitment longer than 500 characters is rejected'
);

select phase3c_test.assert_throws(
  $$update public.events set required_materials = '  Bring a notebook  '
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  'untrimmed materials text is rejected at the database boundary'
);

select phase3c_test.assert_true(
  (
    select responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001003'
    from public.events
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'
  ),
  'Phase 4A responsible-adult assignment remains intact'
);

select phase3c_test.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('profiles', 'student_rosters', 'event_attendees')
      and column_name in (
        'financial_status',
        'affordability_status',
        'owned_materials',
        'equipment_ownership'
      )
  ),
  'no student financial or equipment-ownership fields are introduced'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001004', false);
select phase3c_test.assert_command_rows(
  $$update public.events
    set cost_type = 'free', cost_amount = null,
        cost_currency = null, cost_notes = null
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  0,
  'student without event-management authority cannot modify Phase 4B1 fields'
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
  'registration and attendance RLS policies remain present after Phase 4B1'
);

select 'PHASE4B1_EVENT_PRACTICAL_DETAILS_TESTS_PASSED';
