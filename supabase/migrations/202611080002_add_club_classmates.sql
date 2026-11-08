-- Classmates in clubs: under each club, a student sees which classmates from
-- their own class are members ("Болд Б., Сараа Т. +2"). Students join clubs
-- their friends are in.
--
-- Access model
--   * Rosters and memberships stay hidden from students (RLS unchanged). The
--     names come only through get_club_classmates, which runs as the owner.
--   * A student sees members of their own school AND their own homeroom only,
--     never themselves, and only active rosters with active memberships.
--   * Only a first name (or preferred name) and the family-name initial leave
--     the database. No ids, numbers or other fields.
--   * Each student can hide their name with set_show_name_to_classmates(false).
--     Names show by default.

alter table public.student_rosters
  add column if not exists show_name_to_classmates boolean not null default true;

create or replace function public.get_club_classmates(target_club_ids uuid[])
returns table (club_id uuid, display_name text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with me as (
    select sr.id, sr.school_id, sr.homeroom
    from public.student_rosters sr
    where sr.id = public.current_student_roster_id()
      and nullif(btrim(sr.homeroom), '') is not null
  )
  select
    cm.club_id,
    btrim(coalesce(nullif(btrim(classmate.preferred_name), ''), classmate.first_name))
      || ' ' || upper(left(btrim(classmate.last_name), 1)) || '.' as display_name
  from me
  join public.club_memberships cm
    on cm.school_id = me.school_id
   and cm.status = 'active'
   and cm.club_id = any(target_club_ids)
  join public.student_rosters classmate
    on classmate.id = cm.student_roster_id
   and classmate.school_id = me.school_id
   and classmate.status = 'active'
   and classmate.show_name_to_classmates
   and lower(btrim(classmate.homeroom)) = lower(btrim(me.homeroom))
   and classmate.id <> me.id
  order by cm.club_id, display_name
$$;

create or replace function public.set_show_name_to_classmates(show_name boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  roster_id uuid := public.current_student_roster_id();
begin
  if roster_id is null then
    raise exception using errcode = '42501', message = 'active student roster required';
  end if;

  update public.student_rosters
  set show_name_to_classmates = coalesce(show_name, true)
  where id = roster_id;

  return coalesce(show_name, true);
end;
$$;

alter function public.get_club_classmates(uuid[]) owner to postgres;
revoke all on function public.get_club_classmates(uuid[]) from public, anon;
grant execute on function public.get_club_classmates(uuid[]) to authenticated;

alter function public.set_show_name_to_classmates(boolean) owner to postgres;
revoke all on function public.set_show_name_to_classmates(boolean) from public, anon;
grant execute on function public.set_show_name_to_classmates(boolean) to authenticated;

notify pgrst, 'reload schema';
