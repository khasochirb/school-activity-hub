\set ON_ERROR_STOP on
\set QUIET on

begin;

create schema if not exists announcement_test authorization postgres;

create or replace function announcement_test.assert_true(
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

create or replace function announcement_test.assert_query_count(
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
  execute 'select count(*) from (' || command || ') announcement_rows'
    into actual_count;
  if actual_count <> expected_count then
    raise exception 'not ok - % (expected %, got %)', label, expected_count, actual_count;
  end if;
  raise notice 'ok - %', label;
end;
$$;

create or replace function announcement_test.assert_lives(
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

create or replace function announcement_test.assert_throws(
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

grant usage on schema announcement_test to anon, authenticated;
grant execute on all functions in schema announcement_test to anon, authenticated;

insert into auth.users (id, email)
values
  ('dddddddd-0000-4000-8000-000000001001', 'announcement-admin@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001002', 'announcement-teacher@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001003', 'announcement-student@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001004', 'announcement-inactive@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001005', 'announcement-platform@example.invalid'),
  ('eeeeeeee-0000-4000-8000-000000002001', 'announcement-teacher-b@example.invalid');

insert into public.schools (id, name, slug, status)
values
  (
    'dddddddd-0000-4000-8000-000000000001',
    'Announcement Test School A', 'announcement-test-school-a', 'active'
  ),
  (
    'eeeeeeee-0000-4000-8000-000000000001',
    'Announcement Test School B', 'announcement-test-school-b', 'active'
  );

insert into public.profiles (id, school_id, role, status, full_name)
values
  (
    'dddddddd-0000-4000-8000-000000001001',
    'dddddddd-0000-4000-8000-000000000001',
    'school_admin', 'active', 'Announcement Admin'
  ),
  (
    'dddddddd-0000-4000-8000-000000001002',
    'dddddddd-0000-4000-8000-000000000001',
    'teacher', 'active', 'Announcement Teacher'
  ),
  (
    'dddddddd-0000-4000-8000-000000001003',
    'dddddddd-0000-4000-8000-000000000001',
    'student', 'active', 'Announcement Student'
  ),
  (
    'dddddddd-0000-4000-8000-000000001004',
    'dddddddd-0000-4000-8000-000000000001',
    'teacher', 'inactive', 'Inactive Announcement Teacher'
  ),
  (
    'dddddddd-0000-4000-8000-000000001005',
    'dddddddd-0000-4000-8000-000000000001',
    'student', 'active', 'Announcement Platform Admin'
  ),
  (
    'eeeeeeee-0000-4000-8000-000000002001',
    'eeeeeeee-0000-4000-8000-000000000001',
    'teacher', 'active', 'Announcement Teacher B'
  );

insert into public.platform_admins (profile_id, status)
values ('dddddddd-0000-4000-8000-000000001005', 'active');

select announcement_test.assert_true(
  has_table_privilege('authenticated', 'public.announcements', 'SELECT,INSERT,UPDATE'),
  'authenticated has the RLS-governed announcement privileges'
);

select announcement_test.assert_true(
  (
    select count(*) = 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'announcements'
      and cmd = 'INSERT'
      and policyname = 'School staff can create announcements'
  ),
  'announcements has one named INSERT policy'
);

insert into public.announcements (
  id, school_id, created_by_profile_id, title, body, status
) values
  (
    'dddddddd-0000-4000-8000-000000008001',
    'dddddddd-0000-4000-8000-000000000001',
    'dddddddd-0000-4000-8000-000000001001',
    'Active announcement A', 'Synthetic body', 'active'
  ),
  (
    'dddddddd-0000-4000-8000-000000008002',
    'dddddddd-0000-4000-8000-000000000001',
    'dddddddd-0000-4000-8000-000000001001',
    'Archived announcement A', 'Synthetic body', 'archived'
  ),
  (
    'eeeeeeee-0000-4000-8000-000000008001',
    'eeeeeeee-0000-4000-8000-000000000001',
    'eeeeeeee-0000-4000-8000-000000002001',
    'Active announcement B', 'Synthetic body', 'active'
  );

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select announcement_test.assert_lives(
  $$insert into public.announcements (
      id, school_id, created_by_profile_id, title, body, status
    ) values (
      'dddddddd-0000-4000-8000-000000008003',
      'dddddddd-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001002',
      'Teacher announcement', 'Synthetic body', 'active'
    )$$,
  'active teacher creates an announcement for their own school'
);

select announcement_test.assert_throws(
  $$insert into public.announcements (
      school_id, created_by_profile_id, title, body, status
    ) values (
      'eeeeeeee-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001002',
      'Cross-school announcement', 'Synthetic body', 'active'
    )$$,
  'teacher cannot create an announcement for another school'
);

select announcement_test.assert_throws(
  $$insert into public.announcements (
      school_id, created_by_profile_id, title, body, status
    ) values (
      'dddddddd-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001001',
      'Mismatched creator announcement', 'Synthetic body', 'active'
    )$$,
  'created_by_profile_id must match the authenticated profile'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001001', false);
select announcement_test.assert_lives(
  $$insert into public.announcements (
      id, school_id, created_by_profile_id, title, body, status
    ) values (
      'dddddddd-0000-4000-8000-000000008004',
      'dddddddd-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001001',
      'Admin announcement', 'Synthetic body', 'archived'
    )$$,
  'active school admin creates an announcement for their own school'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001003', false);
select announcement_test.assert_throws(
  $$insert into public.announcements (
      school_id, created_by_profile_id, title, body, status
    ) values (
      'dddddddd-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001003',
      'Student announcement', 'Synthetic body', 'active'
    )$$,
  'student cannot create an announcement'
);
select announcement_test.assert_query_count(
  $$select id from public.announcements where id in (
      'dddddddd-0000-4000-8000-000000008001',
      'dddddddd-0000-4000-8000-000000008002',
      'eeeeeeee-0000-4000-8000-000000008001'
    )$$,
  1,
  'student SELECT behavior remains active-only and same-school'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001004', false);
select announcement_test.assert_throws(
  $$insert into public.announcements (
      school_id, created_by_profile_id, title, body, status
    ) values (
      'dddddddd-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001004',
      'Inactive teacher announcement', 'Synthetic body', 'active'
    )$$,
  'inactive teacher cannot create an announcement'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001005', false);
select announcement_test.assert_throws(
  $$insert into public.announcements (
      school_id, created_by_profile_id, title, body, status
    ) values (
      'dddddddd-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001005',
      'Platform-only announcement', 'Synthetic body', 'active'
    )$$,
  'platform-admin membership alone does not grant announcement creation'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001002', false);
select announcement_test.assert_query_count(
  $$select id from public.announcements where id in (
      'dddddddd-0000-4000-8000-000000008001',
      'dddddddd-0000-4000-8000-000000008002',
      'eeeeeeee-0000-4000-8000-000000008001'
    )$$,
  2,
  'staff SELECT behavior remains same-school with archived visibility'
);
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
select announcement_test.assert_throws(
  $$insert into public.announcements (
      school_id, created_by_profile_id, title, body, status
    ) values (
      'dddddddd-0000-4000-8000-000000000001',
      'dddddddd-0000-4000-8000-000000001002',
      'Anonymous announcement', 'Synthetic body', 'active'
    )$$,
  'unauthenticated announcement creation is rejected'
);
reset role;

select 'ANNOUNCEMENT_CREATION_RLS_TESTS_PASSED';

rollback;
