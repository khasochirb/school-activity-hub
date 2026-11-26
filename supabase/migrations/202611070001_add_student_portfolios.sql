-- Student portfolios: entries (photos, projects, achievements, reflections),
-- per-entry visibility, one featured entry, and teacher notes.
--
-- Access model
--   * Only the student who owns an entry can create, edit, feature or delete it.
--   * Drafts and "private" entries are visible to the owner only.
--   * "staff" entries are also visible to active teachers and school admins
--     at the student's school.
--   * "school" entries are also visible to every active profile at that school.
--   * Teacher notes are written by staff who can see the entry and are read by
--     the owner and staff only (never by classmates).
--   * Platform admins get no access: portfolios are student-owned content.
--   * All writes go through the functions below; table privileges are
--     select-only. Photos live in a private bucket with no client policies:
--     the app uploads through signed URLs and serves images through a route
--     that checks current_user_can_view_portfolio_entry first.

create table if not exists public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_roster_id uuid not null,
  kind text not null default 'reflection',
  title text not null,
  body text,
  entry_date date not null default current_date,
  club_id uuid,
  event_id uuid,
  visibility text not null default 'staff',
  is_draft boolean not null default false,
  is_featured boolean not null default false,
  media_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_entries_id_school_unique unique (id, school_id),
  constraint portfolio_entries_roster_school_fk
    foreign key (student_roster_id, school_id)
    references public.student_rosters(id, school_id)
    on delete cascade,
  constraint portfolio_entries_club_school_fk
    foreign key (club_id, school_id)
    references public.clubs(id, school_id)
    on delete set null (club_id),
  constraint portfolio_entries_event_school_fk
    foreign key (event_id, school_id)
    references public.events(id, school_id)
    on delete set null (event_id),
  constraint portfolio_entries_kind_check check (
    kind in ('reflection', 'project', 'achievement', 'photos')
  ),
  constraint portfolio_entries_visibility_check check (
    visibility in ('private', 'staff', 'school')
  ),
  constraint portfolio_entries_title_valid check (
    public.club_profile_text_is_valid(title, 140)
  ),
  constraint portfolio_entries_body_valid check (
    body is null or public.club_profile_text_is_valid(body, 5000)
  ),
  constraint portfolio_entries_media_count check (
    coalesce(array_length(media_paths, 1), 0) <= 6
  ),
  constraint portfolio_entries_draft_not_featured check (
    not (is_draft and is_featured)
  )
);

create index if not exists portfolio_entries_owner_idx
  on public.portfolio_entries (student_roster_id, entry_date desc);
create index if not exists portfolio_entries_school_idx
  on public.portfolio_entries (school_id, visibility, entry_date desc);
create unique index if not exists portfolio_entries_one_featured
  on public.portfolio_entries (student_roster_id)
  where is_featured;

drop trigger if exists set_portfolio_entries_updated_at
  on public.portfolio_entries;
create trigger set_portfolio_entries_updated_at
  before update on public.portfolio_entries
  for each row execute function public.set_updated_at();

create table if not exists public.portfolio_feedback (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  school_id uuid not null,
  author_profile_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint portfolio_feedback_entry_school_fk
    foreign key (entry_id, school_id)
    references public.portfolio_entries(id, school_id)
    on delete cascade,
  constraint portfolio_feedback_body_valid check (
    public.club_profile_text_is_valid(body, 1000)
  )
);

create index if not exists portfolio_feedback_entry_idx
  on public.portfolio_feedback (entry_id, created_at);

-- Path: <school_id>/<student_roster_id>/<entry_id>/<uuid>.<jpg|png|webp>
create or replace function public.portfolio_media_path_is_valid(
  object_path text,
  expected_school_id uuid,
  expected_roster_id uuid,
  expected_entry_id uuid
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select object_path is not null
    and expected_school_id is not null
    and expected_roster_id is not null
    and expected_entry_id is not null
    and object_path ~ (
      '^' || expected_school_id::text || '/' || expected_roster_id::text || '/'
      || expected_entry_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
$$;

alter function public.portfolio_media_path_is_valid(text, uuid, uuid, uuid)
  owner to postgres;
revoke all on function public.portfolio_media_path_is_valid(text, uuid, uuid, uuid)
  from public, anon, authenticated;

create or replace function public.current_user_owns_portfolio_entry(
  target_entry_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.portfolio_entries e
    where e.id = target_entry_id
      and e.school_id = public.current_profile_school_id()
      and e.student_roster_id = public.current_student_roster_id()
  )
$$;

alter function public.current_user_owns_portfolio_entry(uuid) owner to postgres;
revoke all on function public.current_user_owns_portfolio_entry(uuid)
  from public, anon;
grant execute on function public.current_user_owns_portfolio_entry(uuid)
  to authenticated;

create or replace function public.current_user_can_view_portfolio_entry(
  target_entry_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.portfolio_entries e
    join public.schools s on s.id = e.school_id
    join public.student_rosters sr
      on sr.id = e.student_roster_id and sr.school_id = e.school_id
    where e.id = target_entry_id
      and s.status = 'active'
      and e.school_id = public.current_profile_school_id()
      and (
        e.student_roster_id = public.current_student_roster_id()
        or (
          not e.is_draft
          and sr.status = 'active'
          and (
            (e.visibility in ('staff', 'school') and public.current_profile_is_staff())
            or e.visibility = 'school'
          )
        )
      )
  )
$$;

alter function public.current_user_can_view_portfolio_entry(uuid) owner to postgres;
revoke all on function public.current_user_can_view_portfolio_entry(uuid)
  from public, anon;
grant execute on function public.current_user_can_view_portfolio_entry(uuid)
  to authenticated;

create or replace function public.save_portfolio_entry(
  target_entry_id uuid,
  entry_kind text,
  entry_title text,
  entry_body text,
  entry_on date,
  entry_club_id uuid,
  entry_event_id uuid,
  entry_visibility text,
  entry_is_draft boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_school_id uuid := public.current_profile_school_id();
  actor_roster_id uuid := public.current_student_roster_id();
  normalized_title text := nullif(btrim(entry_title), '');
  normalized_body text := nullif(btrim(entry_body), '');
  saved_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if actor_school_id is null
    or actor_roster_id is null
    or public.current_profile_role() <> 'student' then
    raise exception using errcode = '42501', message = 'portfolio edit denied';
  end if;

  if entry_club_id is not null and not exists (
    select 1 from public.clubs c
    where c.id = entry_club_id and c.school_id = actor_school_id
  ) then
    raise exception using errcode = '22023', message = 'club not found';
  end if;

  if entry_event_id is not null and not exists (
    select 1 from public.events ev
    where ev.id = entry_event_id and ev.school_id = actor_school_id
  ) then
    raise exception using errcode = '22023', message = 'event not found';
  end if;

  if target_entry_id is null then
    insert into public.portfolio_entries (
      school_id, student_roster_id, kind, title, body, entry_date,
      club_id, event_id, visibility, is_draft
    ) values (
      actor_school_id, actor_roster_id, entry_kind, normalized_title,
      normalized_body, coalesce(entry_on, current_date), entry_club_id,
      entry_event_id, entry_visibility, coalesce(entry_is_draft, false)
    )
    returning id into saved_id;
  else
    update public.portfolio_entries e set
      kind = entry_kind,
      title = normalized_title,
      body = normalized_body,
      entry_date = coalesce(entry_on, e.entry_date),
      club_id = entry_club_id,
      event_id = entry_event_id,
      visibility = entry_visibility,
      is_draft = coalesce(entry_is_draft, false),
      is_featured = e.is_featured and not coalesce(entry_is_draft, false)
    where e.id = target_entry_id
      and e.school_id = actor_school_id
      and e.student_roster_id = actor_roster_id
    returning e.id into saved_id;

    if saved_id is null then
      raise exception using errcode = '42501', message = 'portfolio edit denied';
    end if;
  end if;

  return saved_id;
end;
$$;

alter function public.save_portfolio_entry(
  uuid, text, text, text, date, uuid, uuid, text, boolean
) owner to postgres;
revoke all on function public.save_portfolio_entry(
  uuid, text, text, text, date, uuid, uuid, text, boolean
) from public, anon;
grant execute on function public.save_portfolio_entry(
  uuid, text, text, text, date, uuid, uuid, text, boolean
) to authenticated;

-- Returns the deleted entry's photo paths so the app can remove the files.
create or replace function public.delete_portfolio_entry(target_entry_id uuid)
returns text[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  removed_paths text[];
begin
  delete from public.portfolio_entries e
  where e.id = target_entry_id
    and e.school_id = public.current_profile_school_id()
    and e.student_roster_id = public.current_student_roster_id()
  returning e.media_paths into removed_paths;

  if removed_paths is null then
    raise exception using errcode = '42501', message = 'portfolio edit denied';
  end if;

  return removed_paths;
end;
$$;

alter function public.delete_portfolio_entry(uuid) owner to postgres;
revoke all on function public.delete_portfolio_entry(uuid) from public, anon;
grant execute on function public.delete_portfolio_entry(uuid) to authenticated;

-- Pass null to clear the featured entry.
create or replace function public.set_featured_portfolio_entry(
  target_entry_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_roster_id uuid := public.current_student_roster_id();
begin
  if actor_roster_id is null then
    raise exception using errcode = '42501', message = 'portfolio edit denied';
  end if;

  if target_entry_id is not null and not exists (
    select 1 from public.portfolio_entries e
    where e.id = target_entry_id
      and e.student_roster_id = actor_roster_id
      and not e.is_draft
  ) then
    raise exception using errcode = '42501', message = 'portfolio edit denied';
  end if;

  update public.portfolio_entries
  set is_featured = false
  where student_roster_id = actor_roster_id
    and is_featured;

  if target_entry_id is not null then
    update public.portfolio_entries
    set is_featured = true
    where id = target_entry_id
      and student_roster_id = actor_roster_id;
  end if;
end;
$$;

alter function public.set_featured_portfolio_entry(uuid) owner to postgres;
revoke all on function public.set_featured_portfolio_entry(uuid)
  from public, anon;
grant execute on function public.set_featured_portfolio_entry(uuid)
  to authenticated;

create or replace function public.add_portfolio_feedback(
  target_entry_id uuid,
  feedback_body text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry_school_id uuid;
  saved_id uuid;
begin
  if not public.current_profile_is_staff()
    or not public.current_user_can_view_portfolio_entry(target_entry_id) then
    raise exception using errcode = '42501', message = 'portfolio feedback denied';
  end if;

  select e.school_id into entry_school_id
  from public.portfolio_entries e
  where e.id = target_entry_id;

  insert into public.portfolio_feedback (entry_id, school_id, author_profile_id, body)
  values (target_entry_id, entry_school_id, auth.uid(), nullif(btrim(feedback_body), ''))
  returning id into saved_id;

  return saved_id;
end;
$$;

alter function public.add_portfolio_feedback(uuid, text) owner to postgres;
revoke all on function public.add_portfolio_feedback(uuid, text)
  from public, anon;
grant execute on function public.add_portfolio_feedback(uuid, text)
  to authenticated;

-- Server-only: called by the app after it has validated the uploaded image.
create or replace function public.set_portfolio_entry_media(
  target_entry_id uuid,
  new_media_paths text[],
  actor_profile_id uuid
)
returns text[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry_record public.portfolio_entries;
  media_path text;
begin
  select e.* into entry_record
  from public.portfolio_entries e
  join public.student_rosters sr
    on sr.id = e.student_roster_id and sr.school_id = e.school_id
  join public.profiles p on p.id = sr.profile_id
  where e.id = target_entry_id
    and sr.profile_id = actor_profile_id
    and sr.status = 'active'
    and p.status = 'active'
    and p.role = 'student';

  if entry_record.id is null then
    raise exception using errcode = '42501', message = 'portfolio edit denied';
  end if;

  foreach media_path in array coalesce(new_media_paths, '{}'::text[]) loop
    if not public.portfolio_media_path_is_valid(
      media_path,
      entry_record.school_id,
      entry_record.student_roster_id,
      entry_record.id
    ) then
      raise exception using errcode = '22023', message = 'invalid portfolio media path';
    end if;
  end loop;

  update public.portfolio_entries
  set media_paths = coalesce(new_media_paths, '{}'::text[])
  where id = entry_record.id;

  return entry_record.media_paths;
end;
$$;

alter function public.set_portfolio_entry_media(uuid, text[], uuid) owner to postgres;
revoke all on function public.set_portfolio_entry_media(uuid, text[], uuid)
  from public, anon, authenticated;
grant execute on function public.set_portfolio_entry_media(uuid, text[], uuid)
  to service_role;

alter table public.portfolio_entries enable row level security;
alter table public.portfolio_feedback enable row level security;

drop policy if exists "Allowed viewers can read portfolio entries"
  on public.portfolio_entries;
create policy "Allowed viewers can read portfolio entries"
  on public.portfolio_entries
  for select
  to authenticated
  using (public.current_user_can_view_portfolio_entry(id));

drop policy if exists "Owners and staff can read portfolio feedback"
  on public.portfolio_feedback;
create policy "Owners and staff can read portfolio feedback"
  on public.portfolio_feedback
  for select
  to authenticated
  using (
    public.current_user_can_view_portfolio_entry(entry_id)
    and (
      public.current_user_owns_portfolio_entry(entry_id)
      or public.current_profile_is_staff()
    )
  );

revoke all privileges on table public.portfolio_entries from anon;
revoke all privileges on table public.portfolio_feedback from anon;
revoke insert, update, delete, truncate, trigger, references
  on table public.portfolio_entries from authenticated;
revoke insert, update, delete, truncate, trigger, references
  on table public.portfolio_feedback from authenticated;
grant select on table public.portfolio_entries to authenticated;
grant select on table public.portfolio_feedback to authenticated;

-- Private photo bucket. No storage.objects policies on purpose: browsers never
-- read or write it directly.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'portfolio-media',
  'portfolio-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
