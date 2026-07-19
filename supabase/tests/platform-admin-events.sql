\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users (id, email)
values ('cccccccc-0000-4000-8000-000000003001', 'platform-no-profile@example.invalid');

insert into public.platform_admins (profile_id, status)
values ('cccccccc-0000-4000-8000-000000003001', 'active');

insert into public.school_connections (
  id, requester_school_id, receiver_school_id, status
) values (
  'cccccccc-0000-4000-8000-000000004001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  'approved'
);

insert into public.event_attendees (
  id, school_id, event_id, attendee_school_id, status, permission_status
) values (
  'cccccccc-0000-4000-8000-000000005001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000006001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'registered', 'not_required'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000003001', false);

select phase3c_test.assert_query_count(
  $$select id from public.events
    where id in (
      'aaaaaaaa-0000-4000-8000-000000006001',
      'bbbbbbbb-0000-4000-8000-000000006001'
    )$$,
  2,
  'profileless platform admin lists events across schools'
);

select phase3c_test.assert_query_count(
  $$select id from public.events
    where school_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  1,
  'platform admin can filter events to School A'
);

select phase3c_test.assert_lives(
  $$insert into public.events (
      id, school_id, title, location, starts_at, ends_at, status,
      responsible_staff_id, risk_level, permission_required,
      cost_type, required_materials, expected_commitment
    ) values (
      'cccccccc-0000-4000-8000-000000006001',
      'aaaaaaaa-0000-4000-8000-000000000001',
      'Platform Event A', 'Room A', now() + interval '3 days',
      now() + interval '3 days 1 hour', 'approved',
      'aaaaaaaa-0000-4000-8000-000000001003', 'low', false,
      'free', 'Notebook', 'One hour'
    )$$,
  'profileless platform admin creates School A event with eligible staff'
);

select phase3c_test.assert_lives(
  $$insert into public.events (
      id, school_id, title, location, starts_at, ends_at, status,
      responsible_staff_id
    ) values (
      'cccccccc-0000-4000-8000-000000006002',
      'bbbbbbbb-0000-4000-8000-000000000001',
      'Platform Event B', 'Room B', now() + interval '4 days',
      now() + interval '4 days 1 hour', 'pending_approval',
      'bbbbbbbb-0000-4000-8000-000000002002'
    )$$,
  'profileless platform admin creates School B event with eligible staff'
);

select phase3c_test.assert_throws(
  $$update public.events
    set responsible_staff_id = 'bbbbbbbb-0000-4000-8000-000000002002'
    where id = 'cccccccc-0000-4000-8000-000000006001'$$,
  'platform admin cannot assign cross-school responsible staff'
);

select phase3c_test.assert_throws(
  $$update public.events
    set responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001006'
    where id = 'cccccccc-0000-4000-8000-000000006001'$$,
  'platform admin cannot assign inactive responsible staff'
);

select phase3c_test.assert_throws(
  $$update public.events
    set responsible_staff_id = 'aaaaaaaa-0000-4000-8000-000000001004'
    where id = 'cccccccc-0000-4000-8000-000000006001'$$,
  'platform admin cannot assign a student as responsible staff'
);

select phase3c_test.assert_command_rows(
  $$update public.events set eligibility_notes = 'Global edit'
    where id = 'bbbbbbbb-0000-4000-8000-000000006001'$$,
  1,
  'platform admin edits an event in another school'
);

select phase3c_test.assert_command_rows(
  $$update public.events
    set status = 'approved', approved_at = now()
    where id = 'cccccccc-0000-4000-8000-000000006002'
      and status = 'pending_approval'$$,
  1,
  'platform admin uses the existing event approval transition'
);

select phase3c_test.assert_command_rows(
  $$update public.event_attendees set permission_status = 'received'
    where id = 'cccccccc-0000-4000-8000-000000005001'$$,
  1,
  'platform admin manages existing attendance permission state'
);

select phase3c_test.assert_lives(
  $$insert into public.event_school_shares (event_id, school_id)
    values (
      'cccccccc-0000-4000-8000-000000006001',
      'bbbbbbbb-0000-4000-8000-000000000001'
    )$$,
  'platform admin uses existing approved-connection event sharing'
);

select phase3c_test.assert_query_count(
  $$select id from public.get_platform_event_staff_options(
      'aaaaaaaa-0000-4000-8000-000000000001'
    ) where id in (
      'aaaaaaaa-0000-4000-8000-000000001003',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'aaaaaaaa-0000-4000-8000-000000001006',
      'bbbbbbbb-0000-4000-8000-000000002002'
    )$$,
  1,
  'staff option RPC returns only active same-school staff'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001003', false);
select phase3c_test.assert_command_rows(
  $$update public.events set eligibility_notes = 'Teacher same-school edit'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  1,
  'ordinary teacher keeps existing same-school event authority'
);
select phase3c_test.assert_command_rows(
  $$update public.events set title = 'Forbidden teacher cross-school edit'
    where id = 'bbbbbbbb-0000-4000-8000-000000006001'$$,
  0,
  'ordinary teacher remains cross-school restricted'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001001', false);
select phase3c_test.assert_command_rows(
  $$update public.events set title = 'Forbidden cross-school edit'
    where id = 'bbbbbbbb-0000-4000-8000-000000006001'$$,
  0,
  'ordinary school admin remains same-school only'
);
reset role;

insert into auth.users (id, email)
values ('cccccccc-0000-4000-8000-000000003002', 'not-platform@example.invalid');

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000003002', false);
select phase3c_test.assert_query_count(
  $$select id from public.events$$,
  0,
  'an authenticated user cannot spoof platform event authority'
);
select phase3c_test.assert_throws(
  $$insert into public.events (
      school_id, title, location, starts_at, ends_at, status
    ) values (
      'aaaaaaaa-0000-4000-8000-000000000001',
      'Spoofed Platform Event', 'Nowhere', now() + interval '5 days',
      now() + interval '5 days 1 hour', 'approved'
    )$$,
  'an unlisted authenticated user cannot create a platform event'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001004', false);
select phase3c_test.assert_command_rows(
  $$update public.events set title = 'Forbidden student edit'
    where id = 'aaaaaaaa-0000-4000-8000-000000006001'$$,
  0,
  'student event mutation permissions remain unchanged'
);
reset role;

select phase3c_test.assert_true(
  not exists (
    select 1 from public.profiles
    where id = 'cccccccc-0000-4000-8000-000000003001'
  ),
  'platform event authority does not require a profiles row'
);

select phase3c_test.assert_true(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('events', 'event_attendees', 'attendance_checkins', 'event_school_shares')
      and not c.relrowsecurity
  ),
  'RLS remains enabled across platform-admin Events tables'
);

select 'PLATFORM_ADMIN_EVENTS_TESTS_PASSED';
