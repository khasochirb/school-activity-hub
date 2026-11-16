-- School site: public information pages a school's staff write themselves
-- (about us, management, news, timetable), shown at /s/<school slug>.
--
-- Access model
--   * Staff (school admin, teacher) of the school can read and write its pages.
--   * No policy for anon and none for students: the table is closed to both.
--     The public site reads published pages on the server with the service
--     role, through src/lib/site/school-site.ts, which selects published pages
--     of an active school only.
--   * A page holds a title and plain text. No student data belongs here.

create table if not exists public.school_pages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  parent_id uuid references public.school_pages(id) on delete cascade,
  slug text not null,
  title text not null,
  body text not null default '',
  position integer not null default 0,
  status text not null default 'draft',
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_pages_school_slug_unique unique (school_id, slug),
  constraint school_pages_title_not_blank check (length(btrim(title)) > 0),
  constraint school_pages_title_length check (length(title) <= 120),
  constraint school_pages_body_length check (length(body) <= 20000),
  constraint school_pages_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  constraint school_pages_status_valid check (status in ('draft', 'published')),
  constraint school_pages_not_own_parent check (parent_id is null or parent_id <> id)
);

create index if not exists school_pages_school_position_idx
  on public.school_pages (school_id, parent_id, position);

alter table public.school_pages enable row level security;

revoke all on public.school_pages from anon;
grant select, insert, update, delete on public.school_pages to authenticated;

drop policy if exists "School staff can read their school pages" on public.school_pages;
create policy "School staff can read their school pages"
  on public.school_pages
  for select
  to authenticated
  using (public.current_user_can_manage_school(school_id));

drop policy if exists "School staff can create their school pages" on public.school_pages;
create policy "School staff can create their school pages"
  on public.school_pages
  for insert
  to authenticated
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "School staff can update their school pages" on public.school_pages;
create policy "School staff can update their school pages"
  on public.school_pages
  for update
  to authenticated
  using (public.current_user_can_manage_school(school_id))
  with check (public.current_user_can_manage_school(school_id));

drop policy if exists "School staff can delete their school pages" on public.school_pages;
create policy "School staff can delete their school pages"
  on public.school_pages
  for delete
  to authenticated
  using (public.current_user_can_manage_school(school_id));

notify pgrst, 'reload schema';
