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
  ('aaaaaaaa-0000-4000-8000-000000001010', 'teacher-a3@example.invalid'),
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
  ('aaaaaaaa-0000-4000-8000-000000001010', 'aaaaaaaa-0000-4000-8000-000000000001', 'teacher', 'active', 'Teacher A3'),
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
  to_regclass('public.data_rights_requests') is null
    and to_regprocedure('public.prepare_data_rights_request()') is null
    and to_regprocedure('public.protect_data_rights_request_workflow()') is null,
  'removed digital data-rights workflow is absent'
);

select phase3c_test.assert_true(
  has_table_privilege('authenticated', 'public.safeguarding_staff_designations', 'SELECT,INSERT,UPDATE')
    and has_table_privilege('authenticated', 'public.safety_reports', 'SELECT,INSERT,UPDATE')
    and has_table_privilege('authenticated', 'public.restricted_workflow_audit_events', 'SELECT')
    and not has_table_privilege('authenticated', 'public.safety_reports', 'DELETE')
    and not has_table_privilege('authenticated', 'public.restricted_workflow_audit_events', 'INSERT,UPDATE,DELETE'),
  'authenticated grants expose only RLS-governed safety operations'
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
  'same-school admin adds active teacher to response team'
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
  'cross-school response-team designation is rejected'
);
select phase3c_test.assert_throws(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007098', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001004')$$,
  'student cannot be added to response team'
);
reset role;

update public.profiles set status = 'inactive'
where id = 'aaaaaaaa-0000-4000-8000-000000001006';
update public.profiles set role = 'student'
where id = 'aaaaaaaa-0000-4000-8000-000000001007';

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001001', false);
select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007004', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001003')$$,
  'stale profile rows do not count toward active response-team cap'
);
select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007005', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001009')$$,
  'third eligible same-school responder can be added'
);
select phase3c_test.assert_throws(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007006', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001010')$$,
  'fourth eligible responder is rejected by database cap'
);
select phase3c_test.assert_lives(
  $$update public.safeguarding_staff_designations set status = 'inactive'
    where id = 'aaaaaaaa-0000-4000-8000-000000007004'$$,
  'school admin can deactivate a response-team member'
);
select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('aaaaaaaa-0000-4000-8000-000000007006', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000001010')$$,
  'inactive designation does not count toward response-team cap'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000002001', false);
select phase3c_test.assert_lives(
  $$insert into public.safeguarding_staff_designations (id, school_id, profile_id)
    values ('bbbbbbbb-0000-4000-8000-000000007001', 'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000002002')$$,
  'School B admin adds School B teacher to response team'
);
reset role;

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
      'personal_safety', 'Synthetic confidential narrative A', true, 'closed'
    )$$,
  'active user submits an own-school safety report'
);
select phase3c_test.assert_throws(
  $$insert into public.safety_reports (
      id, school_id, reporter_profile_id, related_event_id, concern_category, description
    ) values (
      'aaaaaaaa-0000-4000-8000-000000008099',
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'bbbbbbbb-0000-4000-8000-000000006001',
      'activity_or_event', 'Synthetic cross-school event attempt'
    )$$,
  'cross-school related event is rejected'
);
select phase3c_test.assert_throws(
  $$insert into public.safety_reports (
      id, school_id, reporter_profile_id, concern_category, description
    ) values (
      'aaaaaaaa-0000-4000-8000-000000008098',
      'bbbbbbbb-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'other', 'Synthetic forged-school attempt'
    )$$,
  'reporter cannot submit into another school'
);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'reporter cannot select report narratives directly'
);
select phase3c_test.assert_query_count(
  $$select id from public.get_my_safety_report_receipts()
    where status = 'submitted' and immediate_contact_requested$$,
  1,
  'reporter receives a safe receipt and forged status is reset to submitted'
);
select phase3c_test.assert_command_rows(
  $$update public.safety_reports set status = 'in_review'
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  0,
  'reporter cannot update report workflow'
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
  'another same-school student cannot see reporter receipt'
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
      'other', 'Synthetic confidential narrative B'
    )$$,
  'School B user submits an own-school report'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001002', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  1,
  'designated responder sees only same-school safety reports'
);
select phase3c_test.assert_command_rows(
  $$update public.safety_reports set status = 'in_review'
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  1,
  'designated responder starts review'
);
select phase3c_test.assert_command_rows(
  $$update public.safety_reports set status = 'closed'
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  1,
  'designated responder closes reviewed report'
);
select phase3c_test.assert_query_count(
  $$select id from public.restricted_workflow_audit_events
    where target_type = 'safety_report'$$,
  3,
  'designated responder sees same-school submit, review, and close audit events'
);
select phase3c_test.assert_throws(
  $$update public.safety_reports set status = 'in_review'
    where id = 'aaaaaaaa-0000-4000-8000-000000008001'$$,
  'closed report cannot be reopened'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000002002', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  1,
  'School B responder sees only School B reports'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001003', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'inactive designation does not grant report access'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001006', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'inactive profile cannot use a stale active designation'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001007', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'role-changed profile cannot use a stale designation'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001008', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'platform-admin status alone grants no safety-report access'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000001001', false);
select phase3c_test.assert_query_count(
  $$select id from public.safety_reports$$,
  0,
  'non-designated school admin cannot browse report narratives'
);
select phase3c_test.assert_throws(
  $$insert into public.restricted_workflow_audit_events (
      school_id, actor_profile_id, action, target_type, safety_report_id
    ) values (
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001001',
      'forged', 'safety_report', 'aaaaaaaa-0000-4000-8000-000000008001'
    )$$,
  'school admin cannot forge restricted audit events'
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
  'anonymous user cannot execute receipt RPC'
);
select phase3c_test.assert_throws(
  $$insert into public.safety_reports (
      school_id, reporter_profile_id, concern_category, description
    ) values (
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000001004',
      'other', 'Anonymous attempt'
    )$$,
  'anonymous user cannot submit a safety report'
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
  'safe-receipt RPC exposes exactly seven non-narrative fields'
);

select phase3c_test.assert_true(
  (
    select count(*) = 6
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'current_user_is_designated_safeguarding_staff',
        'get_my_safety_report_receipts',
        'prepare_safeguarding_designation',
        'prepare_safety_report_submission',
        'protect_safety_report_workflow',
        'log_restricted_workflow_event'
      )
      and p.prosecdef
      and p.proconfig @> array['search_path=public']::text[]
  ),
  'all six retained SECURITY DEFINER functions pin search_path to public'
);

select phase3c_test.assert_true(
  has_function_privilege('authenticated', 'public.current_user_is_designated_safeguarding_staff(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_my_safety_report_receipts()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.current_user_is_designated_safeguarding_staff(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_my_safety_report_receipts()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.prepare_safeguarding_designation()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.prepare_safety_report_submission()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.protect_safety_report_workflow()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.log_restricted_workflow_event()', 'EXECUTE'),
  'function execution grants are exact'
);

select phase3c_test.assert_true(
  pg_get_functiondef(to_regprocedure('public.prepare_safeguarding_designation()'))
    like '%pg_advisory_xact_lock%'
    and pg_get_functiondef(to_regprocedure('public.prepare_safeguarding_designation()'))
      like '%active_responder_count >= 3%',
  'response-team cap is serialized per school for concurrent safety'
);

select phase3c_test.assert_true(
  pg_get_constraintdef(
    (
      select oid
      from pg_constraint
      where conrelid = 'public.safety_reports'::regclass
        and conname = 'safety_reports_status_check'
    )
  ) like '%acknowledged%'
    and pg_get_constraintdef(
      (
        select oid
        from pg_constraint
        where conrelid = 'public.safety_reports'::regclass
          and conname = 'safety_reports_status_check'
      )
    ) like '%external_referral%',
  'legacy report statuses remain database-compatible'
);

select phase3c_test.assert_true(
  not exists (
    select 1
    from public.restricted_workflow_audit_events
    where metadata::text ilike '%Synthetic confidential narrative%'
      or metadata ?| array['description', 'details', 'password', 'invite_code', 'export']
  ),
  'restricted audit metadata contains only safe status metadata'
);

select 'PHASE3C_DATABASE_TESTS_PASSED';
