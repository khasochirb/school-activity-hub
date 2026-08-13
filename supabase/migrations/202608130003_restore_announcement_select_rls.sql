alter table public.announcements enable row level security;

grant select on table public.announcements to authenticated;

drop policy if exists "Announcements are visible to school members" on public.announcements;
create policy "Announcements are visible to school members"
  on public.announcements
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and (
      status = 'active'
      or public.current_user_can_manage_school(school_id)
    )
  );
