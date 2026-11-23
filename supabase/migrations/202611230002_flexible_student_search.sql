-- Flexible classmate search for tagging club founders.
--
-- * Latin or Cyrillic: names and the query are both folded to plain Latin, so
--   "bold", "Болд" and "BOLD" all find Болд, and "khulan"/"hulan" find Хулан.
-- * Several words narrow the search: every word must match the given name,
--   family name, preferred name or class ("болд 11б", "bold batbold").
-- * Results show the full name and class so namesakes can be told apart.
--   The access rules are unchanged: same school, signed-up active students who
--   have not hidden their name, never the caller, at most 10 results.

create or replace function public.mn_search_fold(value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select replace(replace(replace(replace(replace(replace(
    translate(
      replace(replace(replace(replace(replace(replace(replace(replace(replace(
        lower(coalesce(value, '')),
        'ё', 'yo'), 'ж', 'j'), 'ц', 'ts'), 'ч', 'ch'), 'ш', 'sh'), 'щ', 'sh'), 'ю', 'yu'), 'я', 'ya'), 'х', 'h'),
      'абвгдезийклмноөпрстуүфыэьъ',
      'abvgdeziiklmnooprstuufyei'
    ),
    'kh', 'h'), 'zh', 'j'), 'ö', 'o'), 'ü', 'u'), '%', ''), '_', '')
$$;

create or replace function public.search_school_students(search text)
returns table (profile_id uuid, display_name text, homeroom text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with me as (
    select p.id, p.school_id
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role = 'student'
  ), q as (
    select array_remove(regexp_split_to_array(public.mn_search_fold(btrim(coalesce(search, ''))), '\s+'), '') as words,
           length(btrim(coalesce(search, ''))) as total
  )
  select
    sr.profile_id,
    btrim(coalesce(nullif(btrim(sr.preferred_name), ''), sr.first_name))
      || ' ' || btrim(sr.last_name) as display_name,
    nullif(btrim(sr.homeroom), '') as homeroom
  from me
  cross join q
  join public.student_rosters sr
    on sr.school_id = me.school_id
   and sr.status = 'active'
   and sr.profile_id is not null
   and sr.profile_id <> me.id
   and sr.show_name_to_classmates
  join public.profiles student
    on student.id = sr.profile_id
   and student.status = 'active'
   and student.role = 'student'
  where q.total >= 2
    and cardinality(q.words) between 1 and 4
    and not exists (
      select 1
      from unnest(q.words) as word
      where not (
        public.mn_search_fold(sr.first_name) like '%' || word || '%'
        or public.mn_search_fold(sr.last_name) like '%' || word || '%'
        or public.mn_search_fold(coalesce(sr.preferred_name, '')) like '%' || word || '%'
        or public.mn_search_fold(coalesce(sr.homeroom, '')) like word || '%'
      )
    )
  order by sr.homeroom, sr.first_name, sr.last_name
  limit 10
$$;

alter function public.search_school_students(text) owner to postgres;
revoke all on function public.search_school_students(text) from public, anon;
grant execute on function public.search_school_students(text) to authenticated;

notify pgrst, 'reload schema';
