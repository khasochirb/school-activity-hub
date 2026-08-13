-- Private, school-scoped logo and banner images for dedicated club pages.
-- Image bytes remain in Storage; PostgreSQL stores only controlled object paths.

create or replace function public.club_media_path_is_valid(
  value text,
  target_school_id uuid,
  target_club_id uuid,
  media_kind text default null
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select value is not null
    and target_school_id is not null
    and target_club_id is not null
    and split_part(value, '/', 1) = target_school_id::text
    and split_part(value, '/', 2) = target_club_id::text
    and split_part(value, '/', 3) in ('logo', 'banner')
    and (media_kind is null or split_part(value, '/', 3) = media_kind)
    and split_part(value, '/', 4) ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and split_part(value, '/', 5) = ''
$$;

alter function public.club_media_path_is_valid(text, uuid, uuid, text)
  owner to postgres;
revoke all on function public.club_media_path_is_valid(text, uuid, uuid, text)
  from public, anon, authenticated;

alter table public.club_profiles
  add column if not exists logo_path text,
  add column if not exists banner_path text;

alter table public.club_profiles
  drop constraint if exists club_profiles_logo_path_valid,
  add constraint club_profiles_logo_path_valid check (
    logo_path is null
    or public.club_media_path_is_valid(
      logo_path,
      school_id,
      club_id,
      'logo'
    )
  ),
  drop constraint if exists club_profiles_banner_path_valid,
  add constraint club_profiles_banner_path_valid check (
    banner_path is null
    or public.club_media_path_is_valid(
      banner_path,
      school_id,
      club_id,
      'banner'
    )
  );

create or replace function public.club_media_upload_metadata_is_valid(
  object_name text,
  object_metadata jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  object_kind text := split_part(object_name, '/', 3);
  object_extension text := lower(regexp_replace(object_name, '^.*\.', ''));
  object_mime text := lower(coalesce(object_metadata ->> 'mimetype', ''));
  object_size bigint;
begin
  if coalesce(object_metadata ->> 'size', '') !~ '^[0-9]+$' then
    return false;
  end if;

  object_size := (object_metadata ->> 'size')::bigint;

  if object_size < 1 then
    return false;
  end if;

  if not (
    (object_extension = 'jpg' and object_mime = 'image/jpeg')
    or (object_extension = 'png' and object_mime = 'image/png')
    or (object_extension = 'webp' and object_mime = 'image/webp')
  ) then
    return false;
  end if;

  return case object_kind
    when 'logo' then object_size <= 2097152
    when 'banner' then object_size <= 5242880
    else false
  end;
end;
$$;

alter function public.club_media_upload_metadata_is_valid(text, jsonb)
  owner to postgres;
revoke all on function public.club_media_upload_metadata_is_valid(text, jsonb)
  from public, anon;
grant execute on function public.club_media_upload_metadata_is_valid(text, jsonb)
  to authenticated;

create or replace function public.current_user_can_upload_club_media(
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
  target_club_id uuid;
begin
  if object_name !~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}/(logo|banner)/[0-9a-f-]{36}\.(jpg|png|webp)$'
  then
    return false;
  end if;

  begin
    target_school_id := split_part(object_name, '/', 1)::uuid;
    target_club_id := split_part(object_name, '/', 2)::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.club_media_path_is_valid(
      object_name,
      target_school_id,
      target_club_id,
      null
    )
    and exists (
      select 1
      from public.clubs c
      where c.id = target_club_id
        and c.school_id = target_school_id
        and public.current_user_can_edit_club_profile(c.id)
    );
end;
$$;

alter function public.current_user_can_upload_club_media(text)
  owner to postgres;
revoke all on function public.current_user_can_upload_club_media(text)
  from public, anon;
grant execute on function public.current_user_can_upload_club_media(text)
  to authenticated;

create or replace function public.current_user_can_read_club_media(
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
  target_club_id uuid;
begin
  if object_name !~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}/(logo|banner)/[0-9a-f-]{36}\.(jpg|png|webp)$'
  then
    return false;
  end if;

  begin
    target_school_id := split_part(object_name, '/', 1)::uuid;
    target_club_id := split_part(object_name, '/', 2)::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.club_media_path_is_valid(
      object_name,
      target_school_id,
      target_club_id,
      null
    )
    and public.current_user_can_view_club_profile(target_club_id)
    and exists (
      select 1
      from public.club_profiles cp
      where cp.club_id = target_club_id
        and cp.school_id = target_school_id
        and object_name in (cp.logo_path, cp.banner_path)
    );
end;
$$;

alter function public.current_user_can_read_club_media(text)
  owner to postgres;
revoke all on function public.current_user_can_read_club_media(text)
  from public, anon;
grant execute on function public.current_user_can_read_club_media(text)
  to authenticated;

create or replace function public.club_profile_actor_can_edit_media(
  actor_profile_id uuid,
  target_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clubs c
    join public.schools s on s.id = c.school_id
    where c.id = target_club_id
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
            and p.school_id = c.school_id
            and p.status = 'active'
            and p.role in ('school_admin', 'teacher')
        )
        or exists (
          select 1
          from public.profiles p
          join public.student_rosters sr
            on sr.profile_id = p.id
           and sr.school_id = p.school_id
           and sr.status = 'active'
          join public.club_memberships cm
            on cm.student_roster_id = sr.id
           and cm.school_id = sr.school_id
           and cm.club_id = c.id
           and cm.role = 'leader'
           and cm.status = 'active'
          where p.id = actor_profile_id
            and p.school_id = c.school_id
            and p.status = 'active'
            and p.role = 'student'
        )
      )
  )
$$;

alter function public.club_profile_actor_can_edit_media(uuid, uuid)
  owner to postgres;
revoke all on function public.club_profile_actor_can_edit_media(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.set_club_profile_media(
  target_club_id uuid,
  media_kind text,
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
  if media_kind not in ('logo', 'banner') then
    raise exception using errcode = '22023', message = 'invalid club media kind';
  end if;

  if not public.club_profile_actor_can_edit_media(
    actor_profile_id,
    target_club_id
  ) then
    raise exception using errcode = '42501', message = 'club media edit denied';
  end if;

  select c.school_id
    into target_school_id
  from public.clubs c
  where c.id = target_club_id;

  if target_school_id is null then
    raise exception using errcode = '22023', message = 'club not found';
  end if;

  if media_path is not null then
    if not public.club_media_path_is_valid(
      media_path,
      target_school_id,
      target_club_id,
      media_kind
    ) then
      raise exception using errcode = '22023', message = 'invalid club media path';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'club-media'
        and o.name = media_path
    ) then
      raise exception using errcode = '22023', message = 'club media object not found';
    end if;
  end if;

  select case media_kind
      when 'logo' then cp.logo_path
      else cp.banner_path
    end
    into previous_path
  from public.club_profiles cp
  where cp.club_id = target_club_id
  for update;

  insert into public.club_profiles (
    club_id,
    school_id,
    logo_path,
    banner_path,
    updated_by_profile_id
  ) values (
    target_club_id,
    target_school_id,
    case when media_kind = 'logo' then media_path else null end,
    case when media_kind = 'banner' then media_path else null end,
    actor_profile_id
  )
  on conflict (club_id) do update set
    logo_path = case
      when media_kind = 'logo' then excluded.logo_path
      else club_profiles.logo_path
    end,
    banner_path = case
      when media_kind = 'banner' then excluded.banner_path
      else club_profiles.banner_path
    end,
    updated_by_profile_id = excluded.updated_by_profile_id;

  return previous_path;
end;
$$;

alter function public.set_club_profile_media(uuid, text, text, uuid)
  owner to postgres;
revoke all on function public.set_club_profile_media(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.set_club_profile_media(uuid, text, text, uuid)
  to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'club-media',
  'club-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized users can read referenced club media"
  on storage.objects;
create policy "Authorized users can read referenced club media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'club-media'
    and storage.allow_only_operation('storage.object.get_authenticated')
    and public.current_user_can_read_club_media(name)
  );

drop policy if exists "Authorized club editors can upload club media"
  on storage.objects;
create policy "Authorized club editors can upload club media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'club-media'
    and public.current_user_can_upload_club_media(name)
    and public.club_media_upload_metadata_is_valid(name, metadata)
  );

notify pgrst, 'reload schema';
