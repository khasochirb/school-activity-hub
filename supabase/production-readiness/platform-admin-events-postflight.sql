-- Read-only postflight for 202607180004_add_global_platform_admin_event_access.sql.
with expected_policies(table_name, policy_name) as (
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
), checks as (
  select 'policy: ' || expected_policies.policy_name as check_name,
    case when pg_policies.policyname is not null then 'PASS' else 'FAIL' end as result,
    expected_policies.table_name as detail
  from expected_policies
  left join pg_policies
    on pg_policies.schemaname = 'public'
   and pg_policies.tablename = expected_policies.table_name
   and pg_policies.policyname = expected_policies.policy_name
  union all
  select 'platform active event school helper',
    case when to_regprocedure('public.current_platform_admin_can_use_event_school(uuid)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.current_platform_admin_can_use_event_school(uuid)')::text, 'missing')
  union all
  select 'Phase 4A/4B1 event columns',
    case when (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'events'
        and column_name in (
          'responsible_staff_id', 'eligibility_notes', 'experience_level',
          'accessibility_notes', 'cost_type', 'cost_amount', 'cost_currency',
          'cost_notes', 'required_materials', 'expected_commitment'
        )
    ) = 10 then 'PASS' else 'FAIL' end,
    '10 required event columns'
  union all
  select 'responsible-staff relationship',
    case when exists (
      select 1
      from pg_constraint
      where conrelid = 'public.events'::regclass
        and conname = 'events_responsible_staff_school_fk'
    ) then 'PASS' else 'FAIL' end,
    'events_responsible_staff_school_fk'
  union all
  select 'platform event school RPC',
    case when to_regprocedure('public.get_platform_event_school_options()') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.get_platform_event_school_options()')::text, 'missing')
  union all
  select 'platform event staff RPC',
    case when to_regprocedure('public.get_platform_event_staff_options(uuid)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.get_platform_event_staff_options(uuid)')::text, 'missing')
  union all
  select 'RLS enabled: ' || c.relname,
    case when c.relrowsecurity then 'PASS' else 'FAIL' end,
    'public.' || c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('clubs', 'events', 'event_attendees', 'attendance_checkins', 'event_school_shares')
)
select check_name, result, detail from checks
union all
select 'Platform-admin Events postflight decision',
  case when exists (select 1 from checks where result = 'FAIL') then 'FAIL' else 'PASS' end,
  'PASS means the scoped Events policy and helper set is present with RLS enabled.'
order by check_name;
