-- Read-only preflight for 202607180005_add_event_supervision_schedule_updates.sql.
with required_columns(column_name, present) as (
  select expected.column_name,
    exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'events'
        and c.column_name = expected.column_name
    )
  from unnest(array[
    'responsible_staff_id', 'eligibility_notes', 'experience_level',
    'accessibility_notes', 'cost_type', 'cost_amount', 'cost_currency',
    'cost_notes', 'required_materials', 'expected_commitment'
  ]) expected(column_name)
), expected_policies(policy_name) as (
  values
    ('Events are visible by role and approval state'),
    ('Staff and club leaders can create events'),
    ('School staff can update events'),
    ('Club leaders can update draft club events'),
    ('Platform admins can view all events'),
    ('Platform admins can create events'),
    ('Platform admins can update all events')
), phase_columns as (
  select count(*)::integer as column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'events'
    and column_name in ('supervision_information', 'schedule_change_notice')
), phase_constraints as (
  select count(*)::integer as constraint_count
  from pg_constraint
  where conrelid = to_regclass('public.events')
    and conname in (
      'events_supervision_information_valid',
      'events_schedule_change_notice_valid'
    )
), phase_guard as (
  select
    (to_regprocedure('public.enforce_event_staff_authored_information()') is not null)::integer
      + (exists (
          select 1 from pg_trigger
          where tgrelid = to_regclass('public.events')
            and tgname = 'enforce_event_staff_authored_information'
            and not tgisinternal
        ))::integer as guard_count
), checks as (
  select 'events table' as check_name,
    case when to_regclass('public.events') is not null then 'PASS' else 'FAIL' end as result,
    coalesce(to_regclass('public.events')::text, 'missing') as detail
  union all
  select 'required Phase 4A/4B1 column: ' || column_name,
    case when present then 'PASS' else 'FAIL' end,
    case when present then 'present' else 'missing' end
  from required_columns
  union all
  select 'platform event school helper',
    case when to_regprocedure('public.current_platform_admin_can_use_event_school(uuid)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.current_platform_admin_can_use_event_school(uuid)')::text, 'missing')
  union all
  select 'event RLS',
    case when c.relrowsecurity then 'PASS' else 'FAIL' end,
    'public.events'
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'events'
  union all
  select 'event policy: ' || expected_policies.policy_name,
    case when pg_policies.policyname is not null then 'PASS' else 'FAIL' end,
    'public.events'
  from expected_policies
  left join pg_policies
    on pg_policies.schemaname = 'public'
   and pg_policies.tablename = 'events'
   and pg_policies.policyname = expected_policies.policy_name
  union all
  select 'Phase 4B2A columns',
    case when column_count = 0 then 'PASS' when column_count = 2 then 'ALREADY PRESENT' else 'FAIL' end,
    column_count::text || ' of 2 columns found'
  from phase_columns
  union all
  select 'Phase 4B2A constraints',
    case when constraint_count = 0 then 'PASS' when constraint_count = 2 then 'ALREADY PRESENT' else 'FAIL' end,
    constraint_count::text || ' of 2 constraints found'
  from phase_constraints
  union all
  select 'Phase 4B2A staff-authoring guard',
    case when guard_count = 0 then 'PASS' when guard_count = 2 then 'ALREADY PRESENT' else 'FAIL' end,
    guard_count::text || ' of 2 guard objects found'
  from phase_guard
)
select check_name, result, detail from checks
union all
select 'Phase 4B2A preflight decision',
  case
    when exists (
      select 1 from checks
      where result = 'FAIL'
        and check_name not in ('Phase 4B2A columns', 'Phase 4B2A constraints')
    ) then 'FAIL'
    when (select column_count from phase_columns) = 0
      and (select constraint_count from phase_constraints) = 0
      and (select guard_count from phase_guard) = 0 then 'PASS'
    when (select column_count from phase_columns) = 2
      and (select constraint_count from phase_constraints) = 2
      and (select guard_count from phase_guard) = 2 then 'ALREADY PRESENT'
    else 'FAIL'
  end,
  'PASS means prerequisites exist and Phase 4B2A objects are absent; partial presence is FAIL.'
order by check_name;
