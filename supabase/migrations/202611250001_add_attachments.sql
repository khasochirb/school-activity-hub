-- Files on clubs, events and announcements (owner's request, 25 Nov 2026:
-- "file add option, pdf word file for clubs or events and announcements").
--
-- * Storage: a private bucket that takes only PDF and Word files up to 10 MB.
--   Browsers upload straight to it with a one-time signed upload link the
--   server hands out after checking who is uploading; the server then checks
--   the file really is a PDF or Word document before recording it.
-- * attachments: one row per file, tied to exactly one club, event or
--   announcement of a school.
--
-- Access model: nothing here is readable or writable by clients. The app reads
-- and writes with the service role after checking, for each file, that the
-- person may see (download) or manage (upload, delete) the club, event or
-- announcement it belongs to, in their own school.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  owner_type text not null,
  owner_id uuid not null,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null,
  storage_path text not null unique,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint attachments_owner_type_check check (owner_type in ('club', 'event', 'announcement')),
  constraint attachments_content_type_check check (content_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  constraint attachments_size_check check (size_bytes between 1 and 10485760),
  constraint attachments_file_name_length check (length(btrim(file_name)) between 1 and 160)
);

create index if not exists attachments_owner_idx
  on public.attachments (owner_type, owner_id, created_at);

alter table public.attachments enable row level security;
revoke all on public.attachments from anon, authenticated;

notify pgrst, 'reload schema';
