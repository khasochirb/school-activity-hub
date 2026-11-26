-- School site cover photos: one optional photo per page, shown on the home
-- page's section cards and behind the page title.
--
-- Access model
--   * cover_path is written by staff of the school through the page editor
--     (same row-level security as the rest of school_pages).
--   * The photos sit in a private bucket with no storage.objects policies:
--     browsers never read or write it directly. Staff upload through a signed
--     upload URL the server issues after checking their role; the public site
--     serves a photo only for a published page of an active school, through
--     /s/<school>/<page>/cover.

alter table public.school_pages
  add column if not exists cover_path text;

alter table public.school_pages
  drop constraint if exists school_pages_cover_path_length;
alter table public.school_pages
  add constraint school_pages_cover_path_length
  check (cover_path is null or length(cover_path) <= 300);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'site-media',
  'site-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
