-- School site visit counter: one number per page per day, for the platform
-- admins' sites console (/super-admin/sites).
--
-- Access model
--   * Nothing about the visitor is stored: no IP address, cookie, device or
--     user id. Only the school, the page ('' = the home page), the day and a
--     count.
--   * Closed to anon and authenticated. The server writes it with the service
--     role through record_school_site_view(), after checking that the school is
--     active and the page is published, and the sites console reads it with the
--     service role after checking that the viewer is a platform admin.

create table if not exists public.school_site_views (
  school_id uuid not null references public.schools(id) on delete cascade,
  page_key text not null default '',
  day date not null,
  views integer not null default 0,
  primary key (school_id, page_key, day),
  constraint school_site_views_page_key_format
    check (page_key = '' or page_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  constraint school_site_views_views_not_negative check (views >= 0)
);

create index if not exists school_site_views_day_idx
  on public.school_site_views (day);

alter table public.school_site_views enable row level security;
revoke all on table public.school_site_views from anon, authenticated;

create or replace function public.record_school_site_view(
  target_school_id uuid,
  target_page_key text,
  view_day date
)
returns void
language sql
security invoker
set search_path = pg_catalog, public
as $$
  insert into public.school_site_views (school_id, page_key, day, views)
  values (target_school_id, coalesce(target_page_key, ''), view_day, 1)
  on conflict (school_id, page_key, day)
  do update set views = public.school_site_views.views + 1;
$$;

revoke execute on function public.record_school_site_view(uuid, text, date)
  from public, anon, authenticated;
grant execute on function public.record_school_site_view(uuid, text, date)
  to service_role;
