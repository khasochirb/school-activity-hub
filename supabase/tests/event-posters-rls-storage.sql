\set ON_ERROR_STOP on
\set QUIET on

begin;

create schema if not exists event_poster_test authorization postgres;

create or replace function event_poster_test.assert_true(
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

create or replace function event_poster_test.assert_throws(
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

grant usage on schema event_poster_test to anon, authenticated;
grant execute on all functions in schema event_poster_test to anon, authenticated;

insert into auth.users (id, email)
values
  ('dddddddd-0000-4000-8000-000000001001', 'poster-admin@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001002', 'poster-teacher@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001003', 'poster-leader@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001004', 'poster-member@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001005', 'poster-other-leader@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001006', 'poster-inactive@example.invalid'),
  ('dddddddd-0000-4000-8000-000000001007', 'poster-platform@example.invalid'),
  ('eeeeeeee-0000-4000-8000-000000002001', 'poster-teacher-b@example.invalid'),
  ('eeeeeeee-0000-4000-8000-000000002002', 'poster-leader-b@example.invalid');

insert into public.schools (id, name, slug, status)
values
  (
    'dddddddd-0000-4000-8000-000000000001',
    'Event Poster Test School A', 'event-poster-test-school-a', 'active'
  ),
  (
    'eeeeeeee-0000-4000-8000-000000000001',
    'Event Poster Test School B', 'event-poster-test-school-b', 'active'
  );

insert into public.profiles (id, school_id, role, status, full_name)
values
  ('dddddddd-0000-4000-8000-000000001001', 'dddddddd-0000-4000-8000-000000000001', 'school_admin', 'active', 'Poster Admin'),
  ('dddddddd-0000-4000-8000-000000001002', 'dddddddd-0000-4000-8000-000000000001', 'teacher', 'active', 'Poster Teacher'),
  ('dddddddd-0000-4000-8000-000000001003', 'dddddddd-0000-4000-8000-000000000001', 'student', 'active', 'Poster Leader'),
  ('dddddddd-0000-4000-8000-000000001004', 'dddddddd-0000-4000-8000-000000000001', 'student', 'active', 'Poster Member'),
  ('dddddddd-0000-4000-8000-000000001005', 'dddddddd-0000-4000-8000-000000000001', 'student', 'active', 'Poster Other Leader'),
  ('dddddddd-0000-4000-8000-000000001006', 'dddddddd-0000-4000-8000-000000000001', 'student', 'inactive', 'Poster Inactive Leader'),
  ('dddddddd-0000-4000-8000-000000001007', 'dddddddd-0000-4000-8000-000000000001', 'student', 'active', 'Poster Platform Admin'),
  ('eeeeeeee-0000-4000-8000-000000002001', 'eeeeeeee-0000-4000-8000-000000000001', 'teacher', 'active', 'Poster Teacher B'),
  ('eeeeeeee-0000-4000-8000-000000002002', 'eeeeeeee-0000-4000-8000-000000000001', 'student', 'active', 'Poster Leader B');

insert into public.platform_admins (profile_id, status)
values ('dddddddd-0000-4000-8000-000000001007', 'active');

insert into public.student_rosters (
  id, school_id, profile_id, first_name, last_name, status
)
values
  ('dddddddd-0000-4000-8000-000000003003', 'dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000001003', 'Poster', 'Leader', 'active'),
  ('dddddddd-0000-4000-8000-000000003004', 'dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000001004', 'Poster', 'Member', 'active'),
  ('dddddddd-0000-4000-8000-000000003005', 'dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000001005', 'Other', 'Leader', 'active'),
  ('dddddddd-0000-4000-8000-000000003006', 'dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000001006', 'Inactive', 'Leader', 'active'),
  ('eeeeeeee-0000-4000-8000-000000003002', 'eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000002002', 'Poster', 'Leader B', 'active');

insert into public.clubs (id, school_id, name, slug, status, category)
values
  ('dddddddd-0000-4000-8000-000000004001', 'dddddddd-0000-4000-8000-000000000001', 'Poster Club A', 'poster-club-a', 'active', 'arts'),
  ('dddddddd-0000-4000-8000-000000004002', 'dddddddd-0000-4000-8000-000000000001', 'Other Poster Club A', 'other-poster-club-a', 'active', 'sports'),
  ('eeeeeeee-0000-4000-8000-000000004001', 'eeeeeeee-0000-4000-8000-000000000001', 'Poster Club B', 'poster-club-b', 'active', 'arts');

insert into public.club_memberships (
  school_id, club_id, student_roster_id, role, status
)
values
  ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000004001', 'dddddddd-0000-4000-8000-000000003003', 'leader', 'active'),
  ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000004001', 'dddddddd-0000-4000-8000-000000003004', 'member', 'active'),
  ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000004002', 'dddddddd-0000-4000-8000-000000003005', 'leader', 'active'),
  ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000004001', 'dddddddd-0000-4000-8000-000000003006', 'leader', 'active'),
  ('eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000004001', 'eeeeeeee-0000-4000-8000-000000003002', 'leader', 'active');

insert into public.events (
  id, school_id, club_id, created_by_profile_id, title,
  starts_at, ends_at, status
)
values
  ('dddddddd-0000-4000-8000-000000005001', 'dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000004001', 'dddddddd-0000-4000-8000-000000001003', 'Draft poster event', now() + interval '1 day', now() + interval '2 days', 'draft'),
  ('dddddddd-0000-4000-8000-000000005002', 'dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000004001', 'dddddddd-0000-4000-8000-000000001002', 'Approved poster event', now() + interval '3 days', now() + interval '4 days', 'approved'),
  ('dddddddd-0000-4000-8000-000000005003', 'dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000004001', 'dddddddd-0000-4000-8000-000000001003', 'Pending poster event', now() + interval '5 days', now() + interval '6 days', 'pending_approval'),
  ('eeeeeeee-0000-4000-8000-000000005001', 'eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000004001', 'eeeeeeee-0000-4000-8000-000000002001', 'Cross-school poster event', now() + interval '7 days', now() + interval '8 days', 'approved');

select event_poster_test.assert_true(
  exists (
    select 1
    from storage.buckets b
    where b.id = 'event-media'
      and b.public is false
      and b.file_size_limit = 5242880
      and b.allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  'event media bucket is private and restricts size and MIME types'
);

select event_poster_test.assert_true(
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname = 'Authorized users can read referenced event posters'
      and p.cmd = 'SELECT'
      and p.roles = array['authenticated']::name[]
      and p.qual like '%storage.object.get_authenticated%'
      and p.qual like '%storage.object.upload%'
      and p.qual not like '%storage.object.list%'
  )
  and exists (
    select 1
    from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname = 'Authorized event editors can upload event posters'
      and p.cmd = 'INSERT'
      and p.roles = array['authenticated']::name[]
  )
  and not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname like '%event poster%'
      and p.cmd in ('UPDATE', 'DELETE')
  ),
  'event poster policies permit exact upload return without listing or broad mutation'
);

select event_poster_test.assert_true(
  has_function_privilege(
    'authenticated', 'public.current_user_can_upload_event_poster(text)', 'EXECUTE'
  )
    and has_function_privilege(
      'authenticated', 'public.current_user_can_read_event_poster(text)', 'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated', 'public.set_event_poster(uuid,text,uuid)', 'EXECUTE'
    )
    and has_function_privilege(
      'service_role', 'public.set_event_poster(uuid,text,uuid)', 'EXECUTE'
    )
    and not has_function_privilege(
      'anon', 'public.current_user_can_upload_event_poster(text)', 'EXECUTE'
    ),
  'poster authorization is authenticated-only and reference changes are service-only'
);

select event_poster_test.assert_true(
  public.event_poster_upload_metadata_is_valid(
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005001/poster/dddddddd-0000-4000-8000-000000006001.png',
    '{"size":"1048576","mimetype":"image/png"}'::jsonb
  )
    and not public.event_poster_upload_metadata_is_valid(
      'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005001/poster/dddddddd-0000-4000-8000-000000006001.png',
      '{"size":"1048576","mimetype":"image/jpeg"}'::jsonb
    )
    and not public.event_poster_upload_metadata_is_valid(
      'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005001/poster/dddddddd-0000-4000-8000-000000006001.png',
      '{"size":"5242881","mimetype":"image/png"}'::jsonb
    ),
  'poster upload metadata rejects disguised and oversized objects'
);

insert into storage.objects (bucket_id, name, metadata)
values
  (
    'event-media',
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005002/poster/dddddddd-0000-4000-8000-000000006002.png',
    '{"size":"1048576","mimetype":"image/png"}'::jsonb
  ),
  (
    'event-media',
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005003/poster/dddddddd-0000-4000-8000-000000006003.webp',
    '{"size":"1048576","mimetype":"image/webp"}'::jsonb
  );

select event_poster_test.assert_true(
  public.set_event_poster(
    'dddddddd-0000-4000-8000-000000005002',
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005002/poster/dddddddd-0000-4000-8000-000000006002.png',
    'dddddddd-0000-4000-8000-000000001002'
  ) is null,
  'active same-school teacher can attach a controlled approved-event poster'
);

select event_poster_test.assert_throws(
  $$select public.set_event_poster(
      'dddddddd-0000-4000-8000-000000005002', null,
      'dddddddd-0000-4000-8000-000000001004'
    )$$,
  'ordinary student cannot change an event poster reference'
);

select event_poster_test.assert_throws(
  $$select public.set_event_poster(
      'dddddddd-0000-4000-8000-000000005002', null,
      'dddddddd-0000-4000-8000-000000001005'
    )$$,
  'another club leader cannot change an approved event poster'
);

select event_poster_test.assert_throws(
  $$select public.set_event_poster(
      'dddddddd-0000-4000-8000-000000005002',
      'eeeeeeee-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005002/poster/dddddddd-0000-4000-8000-000000006002.png',
      'dddddddd-0000-4000-8000-000000001002'
    )$$,
  'poster setter rejects cross-school controlled paths'
);

select event_poster_test.assert_true(
  (
    select poster_path is not null
    from public.events
    where id = 'dddddddd-0000-4000-8000-000000005002'
  ),
  'failed attachment attempts preserve the previous poster'
);

select event_poster_test.assert_true(
  public.set_event_poster(
    'dddddddd-0000-4000-8000-000000005003',
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005003/poster/dddddddd-0000-4000-8000-000000006003.webp',
    'dddddddd-0000-4000-8000-000000001003'
  ) is null,
  'club leader can attach the staged poster after a proposal is created'
);

select event_poster_test.assert_throws(
  $$select public.set_event_poster(
      'dddddddd-0000-4000-8000-000000005003', null,
      'dddddddd-0000-4000-8000-000000001003'
    )$$,
  'club leader cannot mutate an attached pending-review poster'
);

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001004', false);
select event_poster_test.assert_true(
  public.current_user_can_read_event_poster(
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005002/poster/dddddddd-0000-4000-8000-000000006002.png'
  )
    and not public.current_user_can_upload_event_poster(
      'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005001/poster/dddddddd-0000-4000-8000-000000006001.png'
    ),
  'ordinary same-school student reads approved poster but cannot upload'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001003', false);
select event_poster_test.assert_true(
  public.current_user_can_upload_event_poster(
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005001/poster/dddddddd-0000-4000-8000-000000006001.png'
  )
    and not public.current_user_can_upload_event_poster(
      'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005002/poster/dddddddd-0000-4000-8000-000000006004.png'
    ),
  'assigned leader uploads only within the editable event workflow'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001006', false);
select event_poster_test.assert_true(
  not public.current_user_can_upload_event_poster(
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005001/poster/dddddddd-0000-4000-8000-000000006001.png'
  ),
  'inactive leader cannot upload an event poster'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-4000-8000-000000002002', false);
select event_poster_test.assert_true(
  not public.current_user_can_upload_event_poster(
    'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005001/poster/dddddddd-0000-4000-8000-000000006001.png'
  )
    and not public.current_user_can_read_event_poster(
      'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005002/poster/dddddddd-0000-4000-8000-000000006002.png'
    ),
  'cross-school leader cannot upload or read another school poster'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000001007', false);
select event_poster_test.assert_true(
  public.current_user_can_upload_event_poster(
    'eeeeeeee-0000-4000-8000-000000000001/eeeeeeee-0000-4000-8000-000000005001/poster/eeeeeeee-0000-4000-8000-000000006001.jpg'
  ),
  'active platform administrator retains established active-school event authority'
);
reset role;

set role anon;
select set_config('request.jwt.claim.role', 'anon', false);
select set_config('request.jwt.claim.sub', '', false);
select event_poster_test.assert_throws(
  $$select public.current_user_can_read_event_poster(
      'dddddddd-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000005002/poster/dddddddd-0000-4000-8000-000000006002.png'
    )$$,
  'anonymous users cannot execute poster read authorization'
);
reset role;

select 'EVENT_POSTER_RLS_STORAGE_TESTS_PASSED';

rollback;
