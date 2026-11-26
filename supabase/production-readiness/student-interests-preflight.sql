-- Read-only preflight for 202610310001_add_student_interests.sql.
with required_relations(name, present) as (
  values
    ('public.schools', to_regclass('public.schools') is not null),
    ('public.profiles', to_regclass('public.profiles') is not null)
), required_helpers(name, present) as (
  values
    ('public.current_profile_school_id()', to_regprocedure('public.current_profile_school_id()') is not null),
    ('public.current_profile_role()', to_regprocedure('public.current_profile_role()') is not null),
    ('public.current_user_can_manage_school(uuid)', to_regprocedure('public.current_user_can_manage_school(uuid)') is not null)
), phase_objects as (
  select
    (to_regclass('public.student_interests') is not null) as table_present,
    (
      select count(*)::integer
      from pg_policies
      where schemaname = 'public'
        and tablename = 'student_interests'
        and policyname in (
          'Students and their school staff can view interests',
          'Students can add their own interests',
          'Students can remove their own interests'
        )
    ) as policy_count
), checks as (
  select 'required relation: ' || name as check_name,
    case when present then 'PASS' else 'FAIL' end as result,
    case when present then 'present' else 'missing' end as detail
  from required_relations
  union all
  select 'required helper: ' || name,
    case when present then 'PASS' else 'FAIL' end,
    case when present then 'present' else 'missing' end
  from required_helpers
  union all
  select 'student_interests table',
    case
      when not table_present and policy_count = 0 then 'PASS'
      when table_present and policy_count = 3 then 'ALREADY PRESENT'
      else 'FAIL'
    end,
    case when table_present then 'present' else 'absent' end
      || '; ' || policy_count::text || ' of 3 expected policies found'
  from phase_objects
)
select check_name, result, detail from checks
union all
select 'Student interests preflight decision',
  case
    when exists (
      select 1 from checks
      where result = 'FAIL'
    ) then 'FAIL'
    when exists (
      select 1 from checks
      where result = 'ALREADY PRESENT'
    ) then 'ALREADY PRESENT'
    else 'PASS'
  end,
  'PASS means prerequisites exist and the student_interests table is absent; partial presence is FAIL.'
order by check_name;
