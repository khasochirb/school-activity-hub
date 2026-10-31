-- Read-only postflight for 202610310001_add_student_interests.sql.
with expected_policies(policy_name, command) as (
  values
    ('Students and their school staff can view interests', 'SELECT'),
    ('Students can add their own interests', 'INSERT'),
    ('Students can remove their own interests', 'DELETE')
), checks as (
  select 'table: public.student_interests' as check_name,
    case when to_regclass('public.student_interests') is not null then 'PASS' else 'FAIL' end as result,
    'present' as detail
  union all
  select 'RLS enabled: student_interests',
    case when coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'student_interests'
    ), false) then 'PASS' else 'FAIL' end,
    'public.student_interests'
  union all
  select 'policy: ' || expected_policies.policy_name,
    case when pg_policies.policyname is not null then 'PASS' else 'FAIL' end,
    expected_policies.command
  from expected_policies
  left join pg_policies
    on pg_policies.schemaname = 'public'
   and pg_policies.tablename = 'student_interests'
   and pg_policies.policyname = expected_policies.policy_name
   and pg_policies.cmd = expected_policies.command
  union all
  select 'no update policy',
    case when not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'student_interests'
        and cmd in ('UPDATE', 'ALL')
    ) then 'PASS' else 'FAIL' end,
    'interests are added or removed, never edited'
  union all
  select 'category check constraint',
    case when exists (
      select 1 from pg_constraint
      where conrelid = to_regclass('public.student_interests')
        and conname = 'student_interests_category_check'
    ) then 'PASS' else 'FAIL' end,
    'student_interests_category_check'
  union all
  select 'anon has no table access',
    case when to_regclass('public.student_interests') is not null
      and not has_table_privilege('anon', 'public.student_interests', 'SELECT, INSERT, UPDATE, DELETE')
    then 'PASS' else 'FAIL' end,
    'anon'
  union all
  select 'authenticated cannot update',
    case when to_regclass('public.student_interests') is not null
      and has_table_privilege('authenticated', 'public.student_interests', 'SELECT, INSERT, DELETE')
      and not has_table_privilege('authenticated', 'public.student_interests', 'UPDATE')
    then 'PASS' else 'FAIL' end,
    'authenticated: select, insert, delete only'
)
select check_name, result, detail from checks
union all
select 'Student interests postflight decision',
  case when exists (select 1 from checks where result = 'FAIL') then 'FAIL' else 'PASS' end,
  'PASS means the table exists with RLS, its three policies, the category check and the narrowed grants.'
order by check_name;
