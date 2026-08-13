-- Private, school-scoped event posters. Image bytes remain in Storage;
-- public.events stores only a controlled object path.

create or replace function public.event_poster_path_is_valid(
  value text,
  target_school_id uuid,
  target_event_id uuid
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select value is not null
    and target_school_id is not null
    and target_event_id is not null
    and split_part(value, '/', 1) = target_school_id::text
    and split_part(value, '/', 2) = target_event_id::text
    and split_part(value, '/', 3) = 'poster'
    and split_part(value, '/', 4) ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and split_part(value, '/', 5) = ''
$$;

alter function public.event_poster_path_is_valid(text, uuid, uuid)
  owner to postgres;
revoke all on function public.event_poster_path_is_valid(text, uuid, uuid)
  from public, anon, authenticated;

alter table public.events
  add column if not exists poster_path text;

alter table public.events
  drop constraint if exists events_poster_path_valid,
  add constraint events_poster_path_valid check (
    poster_path is null
    or public.event_poster_path_is_valid(poster_path, school_id, id)
  );

create or replace function public.event_poster_upload_metadata_is_valid(
  object_name text,
  object_metadata jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  object_extension text := lower(regexp_replace(object_name, '^.*\.', ''));
  object_mime text := lower(coalesce(object_metadata ->> 'mimetype', ''));
  object_size bigint;
begin
  if coalesce(object_metadata ->> 'size', '') !~ '^[0-9]+$' then
    return false;
  end if;

  object_size := (object_metadata ->> 'size')::bigint;

  return object_size between 1 and 5242880
    and (
      (object_extension = 'jpg' and object_mime = 'image/jpeg')
      or (object_extension = 'png' and object_mime = 'image/png')
      or (object_extension = 'webp' and object_mime = 'image/webp')
    );
end;
$$;

alter function public.event_poster_upload_metadata_is_valid(text, jsonb)
  owner to postgres;
revoke all on function public.event_poster_upload_metadata_is_valid(text, jsonb)
  from public, anon;
grant execute on function public.event_poster_upload_metadata_is_valid(text, jsonb)
  to authenticated;

create or replace function public.current_user_can_edit_event_poster(
  target_event_id uuid
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
    join public.schools s on s.id = e.school_id
    where e.id = target_event_id
      and s.status = 'active'
      and (
        public.current_platform_admin_can_use_event_school(e.school_id)
        or public.current_user_can_manage_school(e.school_id)
        or (
          (
            e.status in ('draft', 'rejected')
            or (e.status = 'pending_approval' and e.poster_path is null)
          )
          and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.school_id = e.school_id
              and p.status = 'active'
              and p.role = 'student'
          )
          and public.current_user_is_club_leader(e.club_id)
        )
      )
  )
$$;

alter function public.current_user_can_edit_event_poster(uuid)
  owner to postgres;
revoke all on function public.current_user_can_edit_event_poster(uuid)
  from public, anon;
grant execute on function public.current_user_can_edit_event_poster(uuid)
  to authenticated;

create or replace function public.current_user_can_upload_event_poster(
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  target_school_id uuid;
  target_event_id uuid;
begin
  if object_name !~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}/poster/[0-9a-f-]{36}\.(jpg|png|webp)$'
  then
    return false;
  end if;

  begin
    target_school_id := split_part(object_name, '/', 1)::uuid;
    target_event_id := split_part(object_name, '/', 2)::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.event_poster_path_is_valid(
      object_name,
      target_school_id,
      target_event_id
    )
    and exists (
      select 1
      from public.events e
      where e.id = target_event_id
        and e.school_id = target_school_id
        and public.current_user_can_edit_event_poster(e.id)
    );
end;
$$;

alter function public.current_user_can_upload_event_poster(text)
  owner to postgres;
revoke all on function public.current_user_can_upload_event_poster(text)
  from public, anon;
grant execute on function public.current_user_can_upload_event_poster(text)
  to authenticated;

create or replace function public.current_user_can_read_event_poster(
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  target_school_id uuid;
  target_event_id uuid;
begin
  if object_name !~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}/poster/[0-9a-f-]{36}\.(jpg|png|webp)$'
  then
    return false;
  end if;

  begin
    target_school_id := split_part(object_name, '/', 1)::uuid;
    target_event_id := split_part(object_name, '/', 2)::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.event_poster_path_is_valid(
      object_name,
      target_school_id,
      target_event_id
    )
    and exists (
      select 1
      from public.events e
      where e.id = target_event_id
        and e.school_id = target_school_id
        and e.poster_path = object_name
        and (
          public.current_user_is_platform_admin()
          or public.current_user_can_manage_school(e.school_id)
          or (
            exists (
              select 1
              from public.profiles p
              where p.id = auth.uid()
                and p.school_id = e.school_id
                and p.status = 'active'
            )
            and e.status in ('approved', 'completed')
          )
          or (
            exists (
              select 1
              from public.profiles p
              where p.id = auth.uid()
                and p.school_id = e.school_id
                and p.status = 'active'
                and p.role = 'student'
            )
            and public.current_user_is_club_leader(e.club_id)
          )
          or (
            e.status = 'approved'
            and exists (
              select 1
              from public.profiles p
              where p.id = auth.uid()
                and p.school_id = public.current_profile_school_id()
                and p.status = 'active'
            )
            and exists (
              select 1
              from public.event_school_shares ess
              where ess.event_id = e.id
                and ess.school_id = public.current_profile_school_id()
            )
            and public.schools_have_approved_connection(
              e.school_id,
              public.current_profile_school_id()
            )
          )
        )
    );
end;
$$;

alter function public.current_user_can_read_event_poster(text)
  owner to postgres;
revoke all on function public.current_user_can_read_event_poster(text)
  from public, anon;
grant execute on function public.current_user_can_read_event_poster(text)
  to authenticated;

create or replace function public.event_poster_actor_can_edit(
  actor_profile_id uuid,
  target_event_id uuid
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
    join public.schools s on s.id = e.school_id
    where e.id = target_event_id
      and s.status = 'active'
      and (
        exists (
          select 1
          from public.platform_admins pa
          where pa.profile_id = actor_profile_id
            and pa.status = 'active'
        )
        or exists (
          select 1
          from public.profiles p
          where p.id = actor_profile_id
            and p.school_id = e.school_id
            and p.status = 'active'
            and p.role in ('school_admin', 'teacher')
        )
        or (
          (
            e.status in ('draft', 'rejected')
            or (e.status = 'pending_approval' and e.poster_path is null)
          )
          and exists (
            select 1
            from public.profiles p
            join public.student_rosters sr
              on sr.profile_id = p.id
             and sr.school_id = p.school_id
             and sr.status = 'active'
            join public.club_memberships cm
              on cm.student_roster_id = sr.id
             and cm.school_id = sr.school_id
             and cm.club_id = e.club_id
             and cm.role = 'leader'
             and cm.status = 'active'
            where p.id = actor_profile_id
              and p.school_id = e.school_id
              and p.status = 'active'
              and p.role = 'student'
          )
        )
      )
  )
$$;

alter function public.event_poster_actor_can_edit(uuid, uuid)
  owner to postgres;
revoke all on function public.event_poster_actor_can_edit(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.set_event_poster(
  target_event_id uuid,
  media_path text,
  actor_profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  target_school_id uuid;
  previous_path text;
begin
  if not public.event_poster_actor_can_edit(actor_profile_id, target_event_id)
  then
    raise exception using errcode = '42501', message = 'event poster edit denied';
  end if;

  select e.school_id, e.poster_path
    into target_school_id, previous_path
  from public.events e
  where e.id = target_event_id
  for update;

  if target_school_id is null then
    raise exception using errcode = '22023', message = 'event not found';
  end if;

  if media_path is not null then
    if not public.event_poster_path_is_valid(
      media_path,
      target_school_id,
      target_event_id
    ) then
      raise exception using errcode = '22023', message = 'invalid event poster path';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'event-media'
        and o.name = media_path
    ) then
      raise exception using errcode = '22023', message = 'event poster object not found';
    end if;
  end if;

  update public.events
  set poster_path = media_path
  where id = target_event_id;

  return previous_path;
end;
$$;

alter function public.set_event_poster(uuid, text, uuid)
  owner to postgres;
revoke all on function public.set_event_poster(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.set_event_poster(uuid, text, uuid)
  to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'event-media',
  'event-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized users can read referenced event posters"
  on storage.objects;
create policy "Authorized users can read referenced event posters"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'event-media'
    and (
      (
        storage.allow_only_operation('storage.object.get_authenticated')
        and public.current_user_can_read_event_poster(name)
      )
      or (
        storage.allow_only_operation('storage.object.upload')
        and public.current_user_can_upload_event_poster(name)
        and public.event_poster_upload_metadata_is_valid(name, metadata)
      )
    )
  );

drop policy if exists "Authorized event editors can upload event posters"
  on storage.objects;
create policy "Authorized event editors can upload event posters"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'event-media'
    and public.current_user_can_upload_event_poster(name)
    and public.event_poster_upload_metadata_is_valid(name, metadata)
  );

notify pgrst, 'reload schema';
