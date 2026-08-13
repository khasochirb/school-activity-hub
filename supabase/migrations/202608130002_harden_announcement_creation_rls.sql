alter table public.announcements enable row level security;

grant select, insert, update on table public.announcements to authenticated;

drop policy if exists "School staff can create announcements" on public.announcements;
create policy "School staff can create announcements"
  on public.announcements
  for insert
  to authenticated
  with check (
    public.current_user_can_manage_school(school_id)
    and created_by_profile_id = auth.uid()
    and status in ('active', 'archived')
  );
