-- Read-only postflight for 202611010002_add_club_first_visit_flags.sql.
with expected_columns(column_name) as (
  values ('beginners_welcome'), ('first_visit_free')
), new_upsert as (
  select to_regprocedure(
    'public.upsert_club_profile(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean)'
  ) as oid
), checks as (
  select 'column: ' || expected_columns.column_name as check_name,
    case when c.column_name is not null
      and c.data_type = 'boolean'
      and c.is_nullable = 'NO'
      and c.column_default = 'false'
    then 'PASS' else 'FAIL' end as result,
    coalesce(c.data_type || ', nullable ' || c.is_nullable || ', default ' || c.column_default, 'missing') as detail
  from expected_columns
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = 'club_profiles'
   and c.column_name = expected_columns.column_name
  union all
  select 'old 11-argument save function removed',
    case when to_regprocedure(
      'public.upsert_club_profile(uuid, text, text, text, text, text, text, text, text, text, text)'
    ) is null then 'PASS' else 'FAIL' end,
    'one save function only, so PostgREST cannot pick the wrong one'
  union all
  select 'new save function present',
    case when oid is not null then 'PASS' else 'FAIL' end,
    coalesce(oid::text, 'missing')
  from new_upsert
  union all
  select 'new save function is security definer, owned by postgres',
    case when exists (
      select 1 from pg_proc p
      join pg_roles r on r.oid = p.proowner
      where p.oid = (select oid from new_upsert)
        and p.prosecdef
        and r.rolname = 'postgres'
    ) then 'PASS' else 'FAIL' end,
    'security definer'
  union all
  select 'authenticated can call the save function; anon cannot',
    case when (select oid from new_upsert) is not null
      and has_function_privilege('authenticated', (select oid from new_upsert), 'EXECUTE')
      and not has_function_privilege('anon', (select oid from new_upsert), 'EXECUTE')
    then 'PASS' else 'FAIL' end,
    'execute grants'
  union all
  select 'authenticated still cannot write club_profiles directly',
    case when not has_table_privilege(
      'authenticated', 'public.club_profiles', 'INSERT, UPDATE, DELETE, TRUNCATE'
    ) then 'PASS' else 'FAIL' end,
    'writes go through the save function only'
)
select check_name, result, detail from checks
union all
select 'Club first-visit flags postflight decision',
  case when exists (select 1 from checks where result = 'FAIL') then 'FAIL' else 'PASS' end,
  'PASS means both columns exist as non-null booleans and only the 13-argument save function remains.'
order by check_name;
