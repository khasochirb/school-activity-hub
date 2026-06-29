create table if not exists public.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.profile_id = auth.uid()
      and pa.status = 'active'
  )
$$;

drop policy if exists "Platform admins can view platform admins" on public.platform_admins;
create policy "Platform admins can view platform admins"
  on public.platform_admins
  for select
  to authenticated
  using (public.current_user_is_platform_admin());

notify pgrst, 'reload schema';
