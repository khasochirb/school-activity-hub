\set ON_ERROR_STOP on
\set QUIET on

begin;

create schema if not exists club_profile_test authorization postgres;

create or replace function club_profile_test.assert_true(
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

create or replace function club_profile_test.assert_query_count(
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
  execute 'select count(*) from (' || command || ') club_profile_rows'
    into actual_count;
  if actual_count <> expected_count then
    raise exception 'not ok - % (expected %, got %)', label, expected_count, actual_count;
  end if;
  raise notice 'ok - %', label;
end;
$$;

create or replace function club_profile_test.assert_lives(
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

create or replace function club_profile_test.assert_throws(
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

grant usage on schema club_profile_test to anon, authenticated;
grant execute on all functions in schema club_profile_test to anon, authenticated;

insert into auth.users (id, email)
values
  ('cccccccc-0000-4000-8000-000000001001', 'club-admin@example.invalid'),
  ('cccccccc-0000-4000-8000-000000001002', 'club-teacher@example.invalid'),
  ('cccccccc-0000-4000-8000-000000001003', 'club-leader@example.invalid'),
  ('cccccccc-0000-4000-8000-000000001004', 'club-member@example.invalid'),
  ('cccccccc-0000-4000-8000-000000001005', 'other-club-leader@example.invalid'),
  ('cccccccc-0000-4000-8000-000000001006', 'inactive-club-leader@example.invalid'),
  ('cccccccc-0000-4000-8000-000000001007', 'club-platform@example.invalid'),
  ('abababab-0000-4000-8000-000000002001', 'club-teacher-b@example.invalid'),
  ('abababab-0000-4000-8000-000000002002', 'club-leader-b@example.invalid');

insert into public.schools (id, name, slug, status)
values
  (
    'cccccccc-0000-4000-8000-000000000001',
    'Club Profile Test School A', 'club-profile-test-school-a', 'active'
  ),
  (
    'abababab-0000-4000-8000-000000000001',
    'Club Profile Test School B', 'club-profile-test-school-b', 'active'
  );

insert into public.profiles (id, school_id, role, status, full_name)
values
  ('cccccccc-0000-4000-8000-000000001001', 'cccccccc-0000-4000-8000-000000000001', 'school_admin', 'active', 'Club Admin'),
  ('cccccccc-0000-4000-8000-000000001002', 'cccccccc-0000-4000-8000-000000000001', 'teacher', 'active', 'Club Teacher'),
  ('cccccccc-0000-4000-8000-000000001003', 'cccccccc-0000-4000-8000-000000000001', 'student', 'active', 'Club Leader'),
  ('cccccccc-0000-4000-8000-000000001004', 'cccccccc-0000-4000-8000-000000000001', 'student', 'active', 'Club Member'),
  ('cccccccc-0000-4000-8000-000000001005', 'cccccccc-0000-4000-8000-000000000001', 'student', 'active', 'Other Club Leader'),
  ('cccccccc-0000-4000-8000-000000001006', 'cccccccc-0000-4000-8000-000000000001', 'student', 'inactive', 'Inactive Club Leader'),
  ('cccccccc-0000-4000-8000-000000001007', 'cccccccc-0000-4000-8000-000000000001', 'student', 'active', 'Club Platform Admin'),
  ('abababab-0000-4000-8000-000000002001', 'abababab-0000-4000-8000-000000000001', 'teacher', 'active', 'Club Teacher B'),
  ('abababab-0000-4000-8000-000000002002', 'abababab-0000-4000-8000-000000000001', 'student', 'active', 'Club Leader B');

insert into public.platform_admins (profile_id, status)
values ('cccccccc-0000-4000-8000-000000001007', 'active');

insert into public.student_rosters (
  id, school_id, profile_id, first_name, last_name, status
)
values
  ('cccccccc-0000-4000-8000-000000003003', 'cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000001003', 'Club', 'Leader', 'active'),
  ('cccccccc-0000-4000-8000-000000003004', 'cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000001004', 'Club', 'Member', 'active'),
  ('cccccccc-0000-4000-8000-000000003005', 'cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000001005', 'Other', 'Leader', 'active'),
  ('cccccccc-0000-4000-8000-000000003006', 'cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000001006', 'Inactive', 'Leader', 'active'),
  ('abababab-0000-4000-8000-000000003002', 'abababab-0000-4000-8000-000000000001', 'abababab-0000-4000-8000-000000002002', 'Club', 'Leader B', 'active');

insert into public.clubs (id, school_id, name, slug, status, category)
values
  ('cccccccc-0000-4000-8000-000000004001', 'cccccccc-0000-4000-8000-000000000001', 'Active Club A', 'active-club-a', 'active', 'arts'),
  ('cccccccc-0000-4000-8000-000000004002', 'cccccccc-0000-4000-8000-000000000001', 'Archived Club A', 'archived-club-a', 'archived', 'academic'),
  ('cccccccc-0000-4000-8000-000000004003', 'cccccccc-0000-4000-8000-000000000001', 'Other Club A', 'other-club-a', 'active', 'sports'),
  ('abababab-0000-4000-8000-000000004001', 'abababab-0000-4000-8000-000000000001', 'Active Club B', 'active-club-b', 'active', 'arts');

insert into public.club_memberships (
  school_id, club_id, student_roster_id, role, status
)
values
  ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000004001', 'cccccccc-0000-4000-8000-000000003003', 'leader', 'active'),
  ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000004001', 'cccccccc-0000-4000-8000-000000003004', 'member', 'active'),
  ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000004003', 'cccccccc-0000-4000-8000-000000003005', 'leader', 'active'),
  ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000004001', 'cccccccc-0000-4000-8000-000000003006', 'leader', 'active'),
  ('abababab-0000-4000-8000-000000000001', 'abababab-0000-4000-8000-000000004001', 'abababab-0000-4000-8000-000000003002', 'leader', 'active');

insert into public.club_profiles (club_id, school_id, tagline, theme_key)
values
  ('cccccccc-0000-4000-8000-000000004001', 'cccccccc-0000-4000-8000-000000000001', 'Active profile', 'warm'),
  ('cccccccc-0000-4000-8000-000000004002', 'cccccccc-0000-4000-8000-000000000001', 'Archived profile', 'sky'),
  ('abababab-0000-4000-8000-000000004001', 'abababab-0000-4000-8000-000000000001', 'Other school profile', 'forest');

select club_profile_test.assert_true(
  has_table_privilege('authenticated', 'public.club_profiles', 'SELECT')
    and not has_table_privilege('authenticated', 'public.club_profiles', 'INSERT,UPDATE,DELETE'),
  'club profile table is read-only to authenticated clients'
);

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000001004', false);
select club_profile_test.assert_query_count(
  $$select club_id from public.club_profiles$$,
  1,
  'ordinary student sees only active same-school club profiles'
);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_tagline => 'Member edit')$$,
  'ordinary member cannot edit a club profile'
);
select club_profile_test.assert_lives(
  $$select public.get_club_member_count('cccccccc-0000-4000-8000-000000004001')$$,
  'same-school student can retrieve the safe member count aggregate'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000001003', false);
select club_profile_test.assert_lives(
  $$select public.upsert_club_profile(
      'cccccccc-0000-4000-8000-000000004001',
      profile_tagline => 'Leader updated profile',
      profile_about => 'Plain text club information',
      profile_theme_key => 'plum'
    )$$,
  'assigned active leader updates approved profile fields'
);
select club_profile_test.assert_throws(
  $$update public.club_profiles set tagline = 'Direct update' where club_id = 'cccccccc-0000-4000-8000-000000004001'$$,
  'leader cannot directly update the club profile table'
);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_theme_key => 'arbitrary-css')$$,
  'invalid club theme is rejected'
);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_tagline => repeat('x', 161))$$,
  'oversized club profile content is rejected'
);
reset role;

select club_profile_test.assert_true(
  (
    select name = 'Active Club A' and status = 'active' and category = 'arts'
    from public.clubs
    where id = 'cccccccc-0000-4000-8000-000000004001'
  ),
  'profile RPC does not change protected core club fields'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000001005', false);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_tagline => 'Other leader edit')$$,
  'leader of another club cannot edit this profile'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'abababab-0000-4000-8000-000000002002', false);
select club_profile_test.assert_query_count(
  $$select club_id from public.club_profiles where club_id = 'cccccccc-0000-4000-8000-000000004001'$$,
  0,
  'cross-school leader cannot read another school club profile'
);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_tagline => 'Cross-school edit')$$,
  'cross-school leader cannot edit another school club profile'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000001006', false);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_tagline => 'Inactive edit')$$,
  'inactive leader cannot edit a club profile'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000001002', false);
select club_profile_test.assert_lives(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_meeting_schedule => 'Wednesdays after school')$$,
  'active same-school teacher can edit a club profile'
);
select club_profile_test.assert_query_count(
  $$select club_id from public.club_profiles where club_id = 'cccccccc-0000-4000-8000-000000004002'$$,
  1,
  'same-school staff can view an archived club profile for oversight'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000001001', false);
select club_profile_test.assert_lives(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_meeting_location => 'Library')$$,
  'active same-school school admin can edit a club profile'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'abababab-0000-4000-8000-000000002001', false);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_tagline => 'Cross-school staff edit')$$,
  'cross-school staff cannot edit another school club profile'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000001007', false);
select club_profile_test.assert_lives(
  $$select public.upsert_club_profile('abababab-0000-4000-8000-000000004001', profile_tagline => 'Platform oversight edit')$$,
  'active platform administrator can edit the selected active-school club profile'
);
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
select club_profile_test.assert_throws(
  $$select public.upsert_club_profile('cccccccc-0000-4000-8000-000000004001', profile_tagline => 'Anonymous edit')$$,
  'unauthenticated club profile editing is rejected'
);
select club_profile_test.assert_throws(
  $$select club_id from public.club_profiles$$,
  'club profiles are not publicly readable'
);
reset role;

select 'CLUB_PROFILE_RLS_RPC_TESTS_PASSED';

rollback;
