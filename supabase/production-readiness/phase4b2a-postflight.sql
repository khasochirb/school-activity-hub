-- Read-only postflight for 202607180005_add_event_supervision_schedule_updates.sql.
with expected_policies(policy_name) as (
  values
    ('Events are visible by role and approval state'),
    ('Staff and club leaders can create events'),
    ('School staff can update events'),
    ('Club leaders can update draft club events'),
    ('Platform admins can view all events'),
    ('Platform admins can create events'),
    ('Platform admins can update all events')
), required_columns(column_name) as (
  select unnest(array[
    'responsible_staff_id', 'eligibility_notes', 'experience_level',
    'accessibility_notes', 'cost_type', 'cost_amount', 'cost_currency',
    'cost_notes', 'required_materials', 'expected_commitment'
  ])
), checks as (
  select 'Phase 4B2A column: ' || expected.column_name as check_name,
    case when c.column_name is not null
      and c.data_type = 'text'
      and c.is_nullable = 'YES' then 'PASS' else 'FAIL' end as result,
    coalesce(c.data_type || ', nullable=' || c.is_nullable, 'missing') as detail
  from (values ('supervision_information'), ('schedule_change_notice')) expected(column_name)
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = 'events'
   and c.column_name = expected.column_name
  union all
  select 'Phase 4B2A constraint: ' || expected.constraint_name,
    case when pg_get_constraintdef(c.oid) ilike '%length%'
      and pg_get_constraintdef(c.oid) ilike '%1000%'
      and pg_get_constraintdef(c.oid) ilike '%btrim%' then 'PASS' else 'FAIL' end,
    coalesce(pg_get_constraintdef(c.oid), 'missing')
  from (values
    ('events_supervision_information_valid'),
    ('events_schedule_change_notice_valid')
  ) expected(constraint_name)
  left join pg_constraint c
    on c.conrelid = to_regclass('public.events')
   and c.conname = expected.constraint_name
  union all
  select 'required Phase 4A/4B1 column: ' || required_columns.column_name,
    case when c.column_name is not null then 'PASS' else 'FAIL' end,
    coalesce(c.data_type, 'missing')
  from required_columns
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = 'events'
   and c.column_name = required_columns.column_name
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
  select 'staff-authored information trigger function',
    case when p.oid is not null
      and not p.prosecdef
      and p.proconfig @> array['search_path=pg_catalog, public']::text[]
      then 'PASS' else 'FAIL' end,
    coalesce(p.proname, 'missing')
  from (select to_regprocedure('public.enforce_event_staff_authored_information()') as oid) expected
  left join pg_proc p on p.oid = expected.oid
  union all
  select 'staff-authored information trigger',
    case when t.oid is not null and not t.tgisinternal then 'PASS' else 'FAIL' end,
    coalesce(t.tgname, 'missing')
  from (select to_regclass('public.events') as oid) events
  left join pg_trigger t
    on t.tgrelid = events.oid
   and t.tgname = 'enforce_event_staff_authored_information'
  union all
  select 'authenticated events grants',
    case when count(*) = 3 then 'PASS' else 'FAIL' end,
    string_agg(privilege_type, ', ' order by privilege_type)
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'events'
    and grantee = 'authenticated'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE')
)
select check_name, result, detail from checks
union all
select 'Phase 4B2A postflight decision',
  case when exists (select 1 from checks where result = 'FAIL') then 'FAIL' else 'PASS' end,
  'PASS means the fields, constraints, grants, RLS, and existing ordinary/platform policies are intact.'
order by check_name;
