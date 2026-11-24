-- Platform admins work in one school at a time (owner's call, 24 Nov 2026:
-- "when you switch and choose to see one school, only see stuff from that
-- school. never mix").
--
-- * A platform admin's account is an ordinary school admin of exactly one
--   school, its profiles.school_id. platform_admin_switch_school() moves it to
--   another school and records the switch in platform_audit_logs. Only a
--   platform admin can call it, and only for themselves.
-- * The school pages then see one school, like any school admin. The
--   platform-wide powers that let platform admins read and change every
--   school's events, attendance, event shares and event clubs from those
--   pages are removed. The platform console reads with the service role and
--   does not use these policies.

create or replace function public.platform_admin_switch_school(target_school_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  me uuid := auth.uid();
  from_school uuid;
begin
  if me is null or not exists (
    select 1 from public.platform_admins pa where pa.profile_id = me and pa.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'platform admin required';
  end if;

  if not exists (select 1 from public.schools s where s.id = target_school_id and s.status = 'active') then
    raise exception using errcode = 'P0002', message = 'school not found';
  end if;

  select p.school_id into from_school
  from public.profiles p
  where p.id = me and p.status = 'active' and p.role = 'school_admin';

  if from_school is null then
    raise exception using errcode = '42501', message = 'platform admin profile must be an active school admin';
  end if;

  if from_school = target_school_id then
    return target_school_id;
  end if;

  begin
    update public.profiles set school_id = target_school_id where id = me;
  exception when foreign_key_violation then
    -- Still named as responsible staff, a safeguarding designate or a
    -- reporter in the current school.
    raise exception using errcode = '23503', message = 'school ties block switching';
  end;

  insert into public.platform_audit_logs (actor_profile_id, action, target_type, target_id, target_school_id, metadata)
  values (me, 'platform_admin.switch_school', 'school', target_school_id, target_school_id,
          jsonb_build_object('from_school_id', from_school));

  return target_school_id;
end;
$$;

alter function public.platform_admin_switch_school(uuid) owner to postgres;
revoke all on function public.platform_admin_switch_school(uuid) from public, anon;
grant execute on function public.platform_admin_switch_school(uuid) to authenticated;

notify pgrst, 'reload schema';
