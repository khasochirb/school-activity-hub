-- Read-only preflight for 202611010002_add_club_first_visit_flags.sql.
with phase_objects as (
  select
    (
      select count(*)::integer
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'club_profiles'
        and column_name in ('beginners_welcome', 'first_visit_free')
    ) as column_count,
    to_regprocedure(
      'public.upsert_club_profile(uuid, text, text, text, text, text, text, text, text, text, text)'
    ) is not null as old_upsert_present,
    to_regprocedure(
      'public.upsert_club_profile(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean)'
    ) is not null as new_upsert_present
), checks as (
  select 'required relation: public.club_profiles' as check_name,
    case when to_regclass('public.club_profiles') is not null then 'PASS' else 'FAIL' end as result,
    case when to_regclass('public.club_profiles') is not null then 'present' else 'missing' end as detail
  union all
  select 'required helper: public.current_user_can_edit_club_profile(uuid)',
    case when to_regprocedure('public.current_user_can_edit_club_profile(uuid)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.current_user_can_edit_club_profile(uuid)')::text, 'missing')
  union all
  select 'first-visit columns and save function',
    case
      when column_count = 0 and old_upsert_present and not new_upsert_present then 'PASS'
      when column_count = 2 and not old_upsert_present and new_upsert_present then 'ALREADY PRESENT'
      else 'FAIL'
    end,
    column_count::text || ' of 2 columns; old save function '
      || case when old_upsert_present then 'present' else 'absent' end
      || '; new save function '
      || case when new_upsert_present then 'present' else 'absent' end
  from phase_objects
)
select check_name, result, detail from checks
union all
select 'Club first-visit flags preflight decision',
  case
    when exists (select 1 from checks where result = 'FAIL') then 'FAIL'
    when exists (select 1 from checks where result = 'ALREADY PRESENT') then 'ALREADY PRESENT'
    else 'PASS'
  end,
  'PASS means the columns are absent and only the 11-argument save function exists; partial presence is FAIL.'
order by check_name;
