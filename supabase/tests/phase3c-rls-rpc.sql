\set ON_ERROR_STOP on
\set QUIET on

create schema if not exists phase3c_test authorization postgres;

create or replace function phase3c_test.assert_true(
  condition boolean,
  label text
)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'not ok - %', label;
  end if;
  raise notice 'ok - %', label;
end;
$$;

create or replace function phase3c_test.assert_query_count(
  command text,
  expected_count bigint,
  label text
)
returns void
language plpgsql
as $$
declare
  actual_count bigint;
begin
  execute 'select count(*) from (' || command || ') phase3c_rows'
    into actual_count;
  if actual_count <> expected_count then
    raise exception 'not ok - % (expected %, got %)', label, expected_count, actual_count;
  end if;
  raise notice 'ok - %', label;
end;
$$;

create or replace function phase3c_test.assert_command_rows(
  command text,
  expected_count bigint,
  label text
)
returns void
language plpgsql
as $$
declare
  actual_count bigint;
begin
  execute command;
  get diagnostics actual_count = row_count;
  if actual_count <> expected_count then
    raise exception 'not ok - % (expected %, got %)', label, expected_count, actual_count;
  end if;
  raise notice 'ok - %', label;
end;
$$;

create or replace function phase3c_test.assert_lives(
  command text,
  label text
)
returns void
language plpgsql
as $$
begin
  execute command;
  raise notice 'ok - %', label;
exception
  when others then
    raise exception 'not ok - %: %', label, sqlerrm;
end;
$$;

create or replace function phase3c_test.assert_throws(
  command text,
  label text
)
returns void
language plpgsql
as $$
begin
  execute command;
  raise exception 'not ok - % (statement unexpectedly succeeded)', label;
exception
  when others then
    if sqlerrm like 'not ok - %' then
      raise;
    end if;
    raise notice 'ok - %', label;
end;
$$;

grant usage on schema phase3c_test to anon, authenticated;
grant execute on all functions in schema phase3c_test to anon, authenticated;

-- Synthetic identities. These UUIDs and records exist only in the disposable local database.
insert into auth.users (id, email)
values
  ('aaaaaaaa-0000-4000-8000-000000001001', 'admin-a@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001002', 'designated-a@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001003', 'teacher-a@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001004', 'student-a@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001005', 'student-a2@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001006', 'inactive-a@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001007', 'rolechanged-a@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001008', 'platform-a@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000001009', 'admin-a2@example.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000002001', 'admin-b@example.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000002002', 'designated-b@example.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000002003', 'student-b@example.invalid');

insert into public.schools (id, name, slug, status)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Synthetic School A', 'synthetic-school-a', 'active'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Synthetic School B', 'synthetic-school-b', 'active');

insert into public.profiles (id, school_id, role, status, full_name)
values
  ('aaaaaaaa-0000-4000-8000-000000001001', 'aaaaaaaa-0000-4000-8000-000000000001', 'school_admin', 'active', 'Admin A'),
  ('aaaaaaaa-0000-4000-8000-000000001002', 'aaaaaaaa-0000-4000-8000-000000000001', 'teacher', 'active', 'Designated A'),
  ('aaaaaaaa-0000-4000-8000-000000001003', 'aaaaaaaa-0000-4000-8000-000000000001', 'teacher', 'active', 'Teacher A'),
  ('aaaaaaaa-0000-4000-8000-000000001004', 'aaaaaaaa-0000-4000-8000-000000000001', 'student', 'active', 'Student A'),
  ('aaaaaaaa-0000-4000-8000-000000001005', 'aaaaaaaa-0000-4000-8000-000000000001', 'student', 'active', 'Student A2'),
  ('aaaaaaaa-0000-4000-8000-000000001006', 'aaaaaaaa-0000-4000-8000-000000000001', 'teacher', 'active', 'Inactive A'),
  ('aaaaaaaa-0000-4000-8000-000000001007', 'aaaaaaaa-0000-4000-8000-000000000001', 'teacher', 'active', 'Role Changed A'),
  ('aaaaaaaa-0000-4000-8000-000000001008', 'aaaaaaaa-0000-4000-8000-000000000001', 'student', 'active', 'Platform A'),
  ('aaaaaaaa-0000-4000-8000-000000001009', 'aaaaaaaa-0000-4000-8000-000000000001', 'school_admin', 'active', 'Admin A2'),
  ('bbbbbbbb-0000-4000-8000-000000002001', 'bbbbbbbb-0000-4000-8000-000000000001', 'school_admin', 'active', 'Admin B'),
  ('bbbbbbbb-0000-4000-8000-000000002002', 'bbbbbbbb-0000-4000-8000-000000000001', 'teacher', 'active', 'Designated B'),
  ('bbbbbbbb-0000-4000-8000-000000002003', 'bbbbbbbb-0000-4000-8000-000000000001', 'student', 'active', 'Student B');

insert into public.platform_admins (profile_id, status)
values ('aaaaaaaa-0000-4000-8000-000000001008', 'active');

insert into public.clubs (id, school_id, created_by_profile_id, name, slug, status)
values
  ('aaaaaaaa-0000-4000-8000-000000005001', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001001', 'Synthetic Club A', 'synthetic-club-a', 'active'),
  ('bbbbbbbb-0000-4000-8000-000000005001', 'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000002001', 'Synthetic Club B', 'synthetic-club-b', 'active');

insert into public.events (
  id, school_id, created_by_profile_id, title, location, starts_at, ends_at, status
)
values
  ('aaaaaaaa-0000-4000-8000-000000006001', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001001', 'Synthetic Event A', 'Room A', now() + interval '1 day', now() + interval '2 days', 'approved'),
  ('bbbbbbbb-0000-4000-8000-000000006001', 'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000002001', 'Synthetic Event B', 'Room B', now() + interval '1 day', now() + interval '2 days', 'approved');

select phase3c_test.assert_true(
  has_table_privilege('authenticated', 'public.safeguarding_staff_designations', 'SELECT,INSERT,UPDATE'),
  'authenticated has only the RLS-governed designation operations required by the app'
);
select phase3c_test.assert_true(
  has_table_privilege('authenticated', 'public.safety_reports', 'SELECT,INSERT,UPDATE'),
  'authenticated has only the RLS-governed safety-report operations required by the app'
);
select phase3c_test.assert_true(
  has_table_privilege('authenticated', 'public.data_rights_requests', 'SELECT,INSERT,UPDATE'),
  'authenticated has only the RLS-governed data-rights operations required by the app'
);
select phase3c_test.assert_true(
  has_table_privilege('authenticated', 'public.restricted_workflow_audit_events', 'SELECT'),
  'authenticated can read only RLS-authorized restricted audit rows'
);
select phase3c_test.assert_true(
  not has_table_privilege('authenticated', 'public.safety_reports', 'DELETE')
  and not has_table_privilege('authenticated', 'public.data_rights_requests', 'DELETE')
  and not has_table_privilege('authenticated', 'public.restricted_workflow_audit_events', 'INSERT,UPDATE,DELETE'),
  'destructive and direct restricted-audit privileges are absent'
);
select phase3c_test.assert_true(
  not has_schema_privilege('authenticated', 'public', 'CREATE'),
  'authenticated users cannot shadow SECURITY DEFINER dependencies in public'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007001', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001002')$$,
  'same-school admin designates active teacher'
);
select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007002', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001006')$$,
  'same-school admin creates designation used for inactive-profile regression'
);
select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007003', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001007')$$,
  'same-school admin creates designation used for role-change regression'
);
select phase3c_test.assert_throws(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007099', 'aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000002002')$$,
  'cross-school safeguarding designation is rejected'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000002001', false);
select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('bbbbbbbb-0000-4000-8000-000000007001', 'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000002002')$$,
  'School B admin designates School B teacher'
);
reset role;

update public.profiles
set status = 'inactive'
where id = 'aaaaaaaa-0000-4000-8000-000000001006';
update public.profiles
set role = 'student'
where id = 'aaaaaaaa-0000-4000-8000-000000001007';

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001004', false);

select phase3c_test.assert_lives(
  $$insert into public.safety_reports (
      id, school_id, reporter_profile_id, concern_category, description,
      immediate_contact_requested, status
    ) values (
      'aaaaaaaa-0000-4000-8000-000000008001',
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'personal_safety',
      'Synthetic confidential narrative A',
      true,
      'closed'
    )$$,
  'active reporter submits own-school safety report'
);
select phase3c_test.assert_throws(
  $$insert into public.safety_reports (
      id, school_id, reporter_profile_id, related_event_id,
      concern_category, description
    ) values (
      'aaaaaaaa-0000-4000-8000-000000008099',
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'bbbbbbbb-0000-4000-8000-000000006001',
      'activity_or_event',
      'Synthetic cross-school event attempt'
    )$$,
  'cross-school related event is rejected by the composite foreign key'
);
select phase3c_test.assert_throws(
  $$insert into public.safety_reports (
      id, school_id, reporter_profile_id, related_club_id,
      concern_category, description
    ) values (
      'aaaaaaaa-0000-4000-8000-000000008097',
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'bbbbbbbb-0000-4000-8000-000000005001',
      'activity_or_event',
      'Synthetic cross-school club attempt'
    )$$,
  'cross-school related club is rejected by the composite foreign key'
);
select phase3c_test.assert_throws(
  $$insert into public.safety_reports (
      id, school_id, reporter_profile_id, concern_category, description
    ) values (
      'aaaaaaaa-0000-4000-8000-000000008098',
      'bbbbbbbb-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'other',
      'Synthetic forged school attempt'
    )$$,
  'reporter cannot submit into another school'
);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'reporter cannot directly select safety-report narratives'
);
select phase3c_test.assert_query_count(
  $$select id from public.get_my_safety_report_receipts()$$,
  1,
  'reporter receives exactly their own safe receipt'
);
select phase3c_test.assert_query_count(
  $$select id from public.get_my_safety_report_receipts()
    where status = 'submitted' and immediate_contact_requested$$,
  1,
  'submission trigger ignores forged workflow status and preserves the contact flag'
);
select phase3c_test.assert_command_rows(
  $$update public.safety_reports set status = 'acknowledged'
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  0,
  'reporter cannot update safety-report workflow'
);
select phase3c_test.assert_throws(
  $$delete from public.safety_reports
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  'reporter cannot delete safety reports'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001005', false);
select phase3c_test.assert_query_count(
  $$select id from public.get_my_safety_report_receipts()$$,
  0,
  'another same-school student cannot see the reporter receipt'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000002003', false);
select phase3c_test.assert_lives(
  $$insert into public.safety_reports (
      id, school_id, reporter_profile_id, concern_category, description
    ) values (
      'bbbbbbbb-0000-4000-8000-000000008001',
      'bbbbbbbb-0000-4000-8000-000000000001',
      'bbbbbbbb-0000-4000-8000-000000002003',
      'other',
      'Synthetic confidential narrative B'
    )$$,
  'School B reporter submits own-school report'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000002002', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  1,
  'School B designated teacher sees only School B safety reports'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001002', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  1,
  'designated teacher sees only same-school safety reports'
);
select phase3c_test.assert_command_rows(
  $$update public.safety_reports set status = 'acknowledged'
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  1,
  'designated teacher can acknowledge same-school report'
);
select phase3c_test.assert_query_count(
  $$select id from public.restricted_workflow_audit_events
    where target_type = 'safety_report'$$,
  2,
  'designated teacher sees same-school report submission and acknowledgment audit events'
);
select phase3c_test.assert_throws(
  $$delete from public.safety_reports
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  'designated teacher cannot delete safety reports'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001003', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'ordinary teacher cannot browse safety reports'
);
select phase3c_test.assert_command_rows(
  $$update public.safety_reports set status = 'in_review'
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  0,
  'ordinary teacher cannot update safety reports'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001001', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'non-designated school admin cannot browse safety reports'
);
select phase3c_test.assert_query_count(
  $$select id from public.restricted_workflow_audit_events
    where target_type = 'safety_report'$$,
  0,
  'non-designated school admin cannot read safety-report audit events'
);
select phase3c_test.assert_lives(
  $$update public.safeguarding_staff_designations set status = 'inactive'
    where id = 'aaaaaaaa-0000-4000-8000-000000007001'$$,
  'school admin can deactivate a same-school designation'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001002', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'stale inactive designation no longer grants report access'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001006', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'inactive profile cannot use an active designation'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001007', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'role-changed designation does not grant report access'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001008', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'platform-admin status alone does not grant safety-report access'
);
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
select phase3c_test.assert_throws(
  $$select * from public.safety_reports$$,
  'anonymous user cannot select safety reports'
);
select phase3c_test.assert_throws(
  $$select * from public.get_my_safety_report_receipts()$$,
  'anonymous user cannot execute the receipt RPC'
);
select phase3c_test.assert_throws(
  $$insert into public.safety_reports (
      school_id, reporter_profile_id, concern_category, description
    ) values (
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'other',
      'Anonymous attempt'
    )$$,
  'anonymous user cannot submit a safety report'
);
select phase3c_test.assert_throws(
  $$select * from public.data_rights_requests$$,
  'anonymous user cannot select data-rights requests'
);
select phase3c_test.assert_throws(
  $$insert into public.data_rights_requests (
      school_id, requester_profile_id, request_type
    ) values (
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'access'
    )$$,
  'anonymous user cannot submit a data-rights request'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001004', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select phase3c_test.assert_lives(
  $$insert into public.data_rights_requests (
      id, school_id, requester_profile_id, request_type, details, status
    ) values (
      'aaaaaaaa-0000-4000-8000-000000009001',
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'access',
      'Synthetic access request',
      'completed'
    )$$,
  'active user submits own-school data-rights request'
);
select phase3c_test.assert_query_count(
  $$select id from public.data_rights_requests$$,
  1,
  'requester sees only their own data-rights requests'
);
select phase3c_test.assert_query_count(
  $$select id from public.data_rights_requests
    where status = 'submitted' and handled_by_profile_id is null$$,
  1,
  'data-rights submission trigger ignores forged status and handler state'
);
select phase3c_test.assert_throws(
  $$insert into public.data_rights_requests (
      id, school_id, requester_profile_id, request_type
    ) values (
      'aaaaaaaa-0000-4000-8000-000000009099',
      'bbbbbbbb-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'access'
    )$$,
  'requester cannot submit a data-rights request for another school'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000002003', false);
select phase3c_test.assert_lives(
  $$insert into public.data_rights_requests (
      id, school_id, requester_profile_id, request_type, details
    ) values (
      'bbbbbbbb-0000-4000-8000-000000009001',
      'bbbbbbbb-0000-4000-8000-000000000001',
      'bbbbbbbb-0000-4000-8000-000000002003',
      'correction',
      'Synthetic correction request'
    )$$,
  'School B user submits own-school data-rights request'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001001', false);
select phase3c_test.assert_query_count(
  $$select id from public.data_rights_requests$$,
  1,
  'School A admin sees only School A data-rights requests'
);
select phase3c_test.assert_command_rows(
  $$update public.data_rights_requests set status = 'acknowledged'
    where id = 'aaaaaaaa-0000-4000-8000-000000009001'$$,
  1,
  'same-school school admin processes a data-rights request'
);
select phase3c_test.assert_query_count(
  $$select id from public.restricted_workflow_audit_events
    where target_type in ('safeguarding_designation', 'data_rights_request')$$,
  6,
  'school admin sees same-school designation and data-rights audit events'
);
select phase3c_test.assert_throws(
  $$delete from public.data_rights_requests
    where id = 'aaaaaaaa-0000-4000-8000-000000009001'$$,
  'school admin cannot delete data-rights requests'
);
select phase3c_test.assert_throws(
  $$insert into public.restricted_workflow_audit_events (
      school_id, actor_profile_id, action, target_type, data_rights_request_id
    ) values (
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001001',
      'forged',
      'data_rights_request',
      'aaaaaaaa-0000-4000-8000-000000009001'
    )$$,
  'school admin cannot directly insert restricted audit events'
);
select phase3c_test.assert_throws(
  $$update public.restricted_workflow_audit_events
    set action = 'forged'$$,
  'school admin cannot directly update restricted audit events'
);
select phase3c_test.assert_throws(
  $$delete from public.restricted_workflow_audit_events$$,
  'school admin cannot directly delete restricted audit events'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000002001', false);
select phase3c_test.assert_query_count(
  $$select id from public.data_rights_requests
    where id = 'aaaaaaaa-0000-4000-8000-000000009001'$$,
  0,
  'cross-school school admin cannot view School A data-rights request'
);
select phase3c_test.assert_command_rows(
  $$update public.data_rights_requests set status = 'under_review'
    where id = 'aaaaaaaa-0000-4000-8000-000000009001'$$,
  0,
  'cross-school school admin cannot process School A data-rights request'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001008', false);
select phase3c_test.assert_query_count(
  $$select id from public.data_rights_requests$$,
  0,
  'platform-admin status alone does not grant data-rights processing access'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001005', false);
select phase3c_test.assert_lives(
  $$insert into public.data_rights_requests (
      id, school_id, requester_profile_id, request_type
    ) values (
      'aaaaaaaa-0000-4000-8000-000000009002',
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001005',
      'export'
    )$$,
  'second School A requester creates request for processor coverage'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001009', false);
select phase3c_test.assert_command_rows(
  $$update public.data_rights_requests set status = 'under_review'
    where id = 'aaaaaaaa-0000-4000-8000-000000009002'$$,
  1,
  'every active same-school school admin can process data-rights requests'
);
reset role;

select phase3c_test.assert_true(
  (
    select array_agg(parameter_name::text order by ordinal_position)
    from information_schema.parameters
    where specific_schema = 'public'
      and specific_name = (
        select specific_name
        from information_schema.routines
        where routine_schema = 'public'
          and routine_name = 'get_my_safety_report_receipts'
        limit 1
      )
      and parameter_mode = 'OUT'
  ) = array[
    'id', 'concern_category', 'status', 'immediate_contact_requested',
    'created_at', 'acknowledged_at', 'closed_at'
  ]::text[],
  'safe-receipt RPC exposes exactly the approved seven fields'
);

select phase3c_test.assert_true(
  (
    select count(*) = 8
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'current_user_is_designated_safeguarding_staff',
        'get_my_safety_report_receipts',
        'prepare_safeguarding_designation',
        'prepare_safety_report_submission',
        'protect_safety_report_workflow',
        'prepare_data_rights_request',
        'protect_data_rights_request_workflow',
        'log_restricted_workflow_event'
      )
      and p.prosecdef
      and p.proconfig @> array['search_path=public']::text[]
  ),
  'all eight Phase 3A SECURITY DEFINER functions pin search_path to public'
);

select phase3c_test.assert_true(
  has_function_privilege('authenticated', 'public.current_user_is_designated_safeguarding_staff(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.get_my_safety_report_receipts()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.current_user_is_designated_safeguarding_staff(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_my_safety_report_receipts()', 'EXECUTE'),
  'authenticated-only RPC execute grants are exact'
);

select phase3c_test.assert_true(
  not has_function_privilege('authenticated', 'public.prepare_safeguarding_designation()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.prepare_safety_report_submission()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.protect_safety_report_workflow()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.prepare_data_rights_request()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.protect_data_rights_request_workflow()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.log_restricted_workflow_event()', 'EXECUTE'),
  'trigger functions are not directly executable by authenticated users'
);

select phase3c_test.assert_true(
  not exists (
    select 1
    from public.restricted_workflow_audit_events
    where metadata::text ilike '%Synthetic confidential narrative%'
      or metadata ? 'description'
  ),
  'restricted audit metadata contains no safety-report narrative'
);

select 'PHASE3C_DATABASE_TESTS_PASSED';
