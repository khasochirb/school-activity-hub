-- Read-only preflight for 202607180004_add_global_platform_admin_event_access.sql.
with required_relations(name, present) as (
  values
    ('public.platform_admins', to_regclass('public.platform_admins') is not null),
    ('public.platform_audit_logs', to_regclass('public.platform_audit_logs') is not null),
    ('public.schools', to_regclass('public.schools') is not null),
    ('public.profiles', to_regclass('public.profiles') is not null),
    ('public.clubs', to_regclass('public.clubs') is not null),
    ('public.events', to_regclass('public.events') is not null),
    ('public.event_school_shares', to_regclass('public.event_school_shares') is not null),
    ('public.event_attendees', to_regclass('public.event_attendees') is not null),
    ('public.attendance_checkins', to_regclass('public.attendance_checkins') is not null)
), expected_policies(table_name, policy_name) as (
  values
    ('events', 'Platform admins can view all events'),
    ('events', 'Platform admins can create events'),
    ('events', 'Platform admins can update all events'),
    ('clubs', 'Platform admins can view event clubs'),
    ('event_school_shares', 'Platform admins can view event shares'),
    ('event_school_shares', 'Platform admins can create event shares'),
    ('event_school_shares', 'Platform admins can remove event shares'),
    ('event_attendees', 'Platform admins can view event attendees'),
    ('event_attendees', 'Platform admins can create event attendees'),
    ('event_attendees', 'Platform admins can update event attendees'),
    ('attendance_checkins', 'Platform admins can view attendance checkins'),
    ('attendance_checkins', 'Platform admins can create attendance checkins')
), phase_objects as (
  select count(pg_policies.policyname)::integer as policy_count
  from expected_policies
  left join pg_policies
    on pg_policies.schemaname = 'public'
   and pg_policies.tablename = expected_policies.table_name
   and pg_policies.policyname = expected_policies.policy_name
), phase_helpers as (
  select count(*)::integer as helper_count
  from unnest(array[
    to_regprocedure('public.current_platform_admin_can_use_event_school(uuid)'),
    to_regprocedure('public.get_platform_event_school_options()'),
    to_regprocedure('public.get_platform_event_staff_options(uuid)')
  ]) helper
  where helper is not null
), checks as (
  select 'required relation: ' || name as check_name,
    case when present then 'PASS' else 'FAIL' end as result,
    case when present then 'present' else 'missing' end as detail
  from required_relations
  union all
  select 'platform-admin helper',
    case when to_regprocedure('public.current_user_is_platform_admin()') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.current_user_is_platform_admin()')::text, 'missing')
  union all
  select 'Phase Events policies',
    case when policy_count = 0 then 'PASS' when policy_count = 12 then 'ALREADY PRESENT' else 'FAIL' end,
    policy_count::text || ' of 12 expected policies found'
  from phase_objects
  union all
  select 'Phase Events helper functions',
    case when helper_count = 0 then 'PASS' when helper_count = 3 then 'ALREADY PRESENT' else 'FAIL' end,
    helper_count::text || ' of 3 expected helpers found'
  from phase_helpers
)
select check_name, result, detail from checks
union all
select 'Platform-admin Events preflight decision',
  case
    when exists (
      select 1 from checks
      where result = 'FAIL'
        and check_name not in ('Phase Events policies', 'Phase Events helper functions')
    ) then 'FAIL'
    when (select policy_count from phase_objects) = 0
      and (select helper_count from phase_helpers) = 0 then 'PASS'
    when (select policy_count from phase_objects) = 12
      and (select helper_count from phase_helpers) = 3 then 'ALREADY PRESENT'
    else 'FAIL'
  end,
  'PASS means prerequisites exist and all Phase Events objects are absent; partial presence is FAIL.'
order by check_name;
