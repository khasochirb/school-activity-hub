create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_school_id uuid references public.schools(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_created_at_idx
  on public.platform_audit_logs (created_at desc);

create index if not exists platform_audit_logs_target_school_created_at_idx
  on public.platform_audit_logs (target_school_id, created_at desc);

alter table public.platform_audit_logs enable row level security;

drop policy if exists "Platform admins can view platform audit logs" on public.platform_audit_logs;
create policy "Platform admins can view platform audit logs"
  on public.platform_audit_logs
  for select
  to authenticated
  using (public.current_user_is_platform_admin());

notify pgrst, 'reload schema';
