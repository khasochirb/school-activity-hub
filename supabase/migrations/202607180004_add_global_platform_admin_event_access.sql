-- Platform-admin authority is global only for the existing Events domain.
-- Ordinary school-role policies remain unchanged and continue to enforce school isolation.

alter table public.platform_admins
  drop constraint if exists platform_admins_profile_id_fkey;

alter table public.platform_admins
  add constraint platform_admins_profile_id_fkey
  foreign key (profile_id) references auth.users(id) on delete cascade;

alter table public.platform_audit_logs
  drop constraint if exists platform_audit_logs_actor_profile_id_fkey;

alter table public.platform_audit_logs
  add constraint platform_audit_logs_actor_profile_id_fkey
  foreign key (actor_profile_id) references auth.users(id) on delete set null;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.profile_id = auth.uid()
      and pa.status = 'active'
  )
$$;

alter function public.current_user_is_platform_admin() owner to postgres;
revoke all on function public.current_user_is_platform_admin() from public, anon;
grant execute on function public.current_user_is_platform_admin() to authenticated;

create or replace function public.get_platform_event_school_options()
returns table (
  id uuid,
  name text,
  slug text,
  status public.school_status
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select s.id, s.name, s.slug, s.status
  from public.schools s
  where public.current_user_is_platform_admin()
    and s.status = 'active'
  order by s.name, s.id
$$;

alter function public.get_platform_event_school_options() owner to postgres;
revoke all on function public.get_platform_event_school_options() from public, anon;
grant execute on function public.get_platform_event_school_options() to authenticated;

create or replace function public.current_platform_admin_can_use_event_school(
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_platform_admin()
    and exists (
      select 1
      from public.schools s
      where s.id = target_school_id
        and s.status = 'active'
    )
$$;

alter function public.current_platform_admin_can_use_event_school(uuid) owner to postgres;
revoke all on function public.current_platform_admin_can_use_event_school(uuid) from public, anon;
grant execute on function public.current_platform_admin_can_use_event_school(uuid) to authenticated;

create or replace function public.get_platform_event_staff_options(target_school_id uuid)
returns table (
  id uuid,
  full_name text,
  role public.profile_role
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id, p.full_name, p.role
  from public.profiles p
  join public.schools s on s.id = p.school_id
  where public.current_user_is_platform_admin()
    and s.id = target_school_id
    and s.status = 'active'
    and p.status = 'active'
    and p.role in ('school_admin', 'teacher')
  order by p.full_name, p.id
$$;

alter function public.get_platform_event_staff_options(uuid) owner to postgres;
revoke all on function public.get_platform_event_staff_options(uuid) from public, anon;
grant execute on function public.get_platform_event_staff_options(uuid) to authenticated;

create or replace function public.current_user_can_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_platform_admin()
    or exists (
      select 1
      from public.events e
      where e.id = target_event_id
        and (
          public.current_user_can_manage_school(e.school_id)
          or public.current_user_is_club_leader(e.club_id)
        )
    )
$$;

create or replace function public.current_user_can_manage_event_owner_school(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_platform_admin()
    or exists (
      select 1
      from public.events e
      where e.id = target_event_id
        and public.current_user_can_manage_school(e.school_id)
    )
$$;

create or replace function public.current_user_can_share_event_with_school(
  target_event_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.status = 'approved'
      and (
        public.current_user_is_platform_admin()
        or public.current_user_can_manage_school(e.school_id)
      )
      and public.schools_have_approved_connection(e.school_id, target_school_id)
  )
$$;

revoke all on function public.current_user_can_manage_event(uuid) from public, anon;
revoke all on function public.current_user_can_manage_event_owner_school(uuid) from public, anon;
revoke all on function public.current_user_can_share_event_with_school(uuid, uuid) from public, anon;
grant execute on function public.current_user_can_manage_event(uuid) to authenticated;
grant execute on function public.current_user_can_manage_event_owner_school(uuid) to authenticated;
grant execute on function public.current_user_can_share_event_with_school(uuid, uuid) to authenticated;

drop policy if exists "Platform admins can view all events" on public.events;
create policy "Platform admins can view all events"
  on public.events for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create events" on public.events;
create policy "Platform admins can create events"
  on public.events for insert to authenticated
  with check (public.current_platform_admin_can_use_event_school(school_id));

drop policy if exists "Platform admins can update all events" on public.events;
create policy "Platform admins can update all events"
  on public.events for update to authenticated
  using (public.current_user_is_platform_admin())
  with check (public.current_platform_admin_can_use_event_school(school_id));

drop policy if exists "Platform admins can view event clubs" on public.clubs;
create policy "Platform admins can view event clubs"
  on public.clubs for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can view event shares" on public.event_school_shares;
create policy "Platform admins can view event shares"
  on public.event_school_shares for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create event shares" on public.event_school_shares;
create policy "Platform admins can create event shares"
  on public.event_school_shares for insert to authenticated
  with check (public.current_user_can_share_event_with_school(event_id, school_id));

drop policy if exists "Platform admins can remove event shares" on public.event_school_shares;
create policy "Platform admins can remove event shares"
  on public.event_school_shares for delete to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can view event attendees" on public.event_attendees;
create policy "Platform admins can view event attendees"
  on public.event_attendees for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create event attendees" on public.event_attendees;
create policy "Platform admins can create event attendees"
  on public.event_attendees for insert to authenticated
  with check (
    public.current_user_is_platform_admin()
    and exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and e.school_id = event_attendees.school_id
    )
  );

drop policy if exists "Platform admins can update event attendees" on public.event_attendees;
create policy "Platform admins can update event attendees"
  on public.event_attendees for update to authenticated
  using (public.current_user_is_platform_admin())
  with check (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can view attendance checkins" on public.attendance_checkins;
create policy "Platform admins can view attendance checkins"
  on public.attendance_checkins for select to authenticated
  using (public.current_user_is_platform_admin());

drop policy if exists "Platform admins can create attendance checkins" on public.attendance_checkins;
create policy "Platform admins can create attendance checkins"
  on public.attendance_checkins for insert to authenticated
  with check (
    public.current_user_is_platform_admin()
    and exists (
      select 1 from public.events e
      where e.id = attendance_checkins.event_id
        and e.school_id = attendance_checkins.school_id
    )
  );

grant select, insert, update on table public.events to authenticated;
grant select on table public.clubs to authenticated;
grant select, insert, delete on table public.event_school_shares to authenticated;
grant select, insert, update on table public.event_attendees to authenticated;
grant select, insert on table public.attendance_checkins to authenticated;

notify pgrst, 'reload schema';
