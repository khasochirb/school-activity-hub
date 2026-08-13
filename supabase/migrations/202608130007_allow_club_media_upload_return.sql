-- Allow Supabase Storage to return a newly uploaded club-media row without
-- enabling bucket listing or relaxing the controlled-path upload policy.

drop policy if exists "Authorized users can read referenced club media"
  on storage.objects;
create policy "Authorized users can read referenced club media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'club-media'
    and (
      (
        storage.allow_only_operation('storage.object.get_authenticated')
        and public.current_user_can_read_club_media(name)
      )
      or (
        storage.allow_only_operation('storage.object.upload')
        and public.current_user_can_upload_club_media(name)
        and public.club_media_upload_metadata_is_valid(name, metadata)
      )
    )
  );

notify pgrst, 'reload schema';
