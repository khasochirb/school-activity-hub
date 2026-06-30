create table if not exists public.club_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  converted_club_id uuid references public.clubs(id) on delete set null,
  title text not null,
  description text,
  category text,
  status text not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_requests_title_not_blank check (length(btrim(title)) > 0),
  constraint club_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'archived')
  )
);

create index if not exists club_requests_school_status_created_at_idx
  on public.club_requests (school_id, status, created_at desc);

create table if not exists public.club_request_supports (
  id uuid primary key default gen_random_uuid(),
  club_request_id uuid not null references public.club_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint club_request_supports_request_profile_unique unique (
    club_request_id,
    profile_id
  )
);

create index if not exists club_request_supports_request_idx
  on public.club_request_supports (club_request_id);

create index if not exists club_request_supports_profile_idx
  on public.club_request_supports (profile_id);

drop trigger if exists set_club_requests_updated_at on public.club_requests;
create trigger set_club_requests_updated_at
  before update on public.club_requests
  for each row execute function public.set_updated_at();

alter table public.club_requests enable row level security;
alter table public.club_request_supports enable row level security;

drop policy if exists "Club requests are visible to school members" on public.club_requests;
create policy "Club requests are visible to school members"
  on public.club_requests
  for select
  to authenticated
  using (school_id = public.current_profile_school_id());

drop policy if exists "Students can create club requests" on public.club_requests;
create policy "Students can create club requests"
  on public.club_requests
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'student'
    and created_by_profile_id = auth.uid()
    and status = 'pending'
    and reviewed_by_profile_id is null
    and converted_club_id is null
    and reviewed_at is null
    and rejection_reason is null
  );

drop policy if exists "School staff can review club requests" on public.club_requests;
create policy "School staff can review club requests"
  on public.club_requests
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (
    public.current_user_can_manage_school(school_id)
    and status in ('pending', 'approved', 'rejected', 'archived')
  );

drop policy if exists "Club request supports are visible to school members" on public.club_request_supports;
create policy "Club request supports are visible to school members"
  on public.club_request_supports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.club_requests cr
      where cr.id = club_request_id
        and cr.school_id = public.current_profile_school_id()
    )
  );

drop policy if exists "Students can support school club requests" on public.club_request_supports;
create policy "Students can support school club requests"
  on public.club_request_supports
  for insert
  to authenticated
  with check (
    public.current_profile_role() = 'student'
    and profile_id = auth.uid()
    and exists (
      select 1
      from public.club_requests cr
      where cr.id = club_request_id
        and cr.school_id = public.current_profile_school_id()
        and cr.status = 'pending'
    )
  );

drop policy if exists "Students can remove their club request support" on public.club_request_supports;
create policy "Students can remove their club request support"
  on public.club_request_supports
  for delete
  to authenticated
  using (
    public.current_profile_role() = 'student'
    and profile_id = auth.uid()
    and exists (
      select 1
      from public.club_requests cr
      where cr.id = club_request_id
        and cr.school_id = public.current_profile_school_id()
        and cr.status = 'pending'
    )
  );

notify pgrst, 'reload schema';
