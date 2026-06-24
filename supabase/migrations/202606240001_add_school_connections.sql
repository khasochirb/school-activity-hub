do $$
begin
  create type public.school_connection_status as enum (
    'pending',
    'approved',
    'rejected',
    'blocked',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.school_connections (
  id uuid primary key default gen_random_uuid(),
  requester_school_id uuid not null references public.schools(id) on delete cascade,
  receiver_school_id uuid not null references public.schools(id) on delete cascade,
  requested_by_profile_id uuid references public.profiles(id) on delete set null,
  responded_by_profile_id uuid references public.profiles(id) on delete set null,
  status public.school_connection_status not null default 'pending',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_connections_different_schools check (
    requester_school_id <> receiver_school_id
  )
);

create unique index if not exists school_connections_school_pair_unique
  on public.school_connections (
    least(requester_school_id::text, receiver_school_id::text),
    greatest(requester_school_id::text, receiver_school_id::text)
  );

create index if not exists school_connections_requester_status_idx
  on public.school_connections (requester_school_id, status, created_at desc);

create index if not exists school_connections_receiver_status_idx
  on public.school_connections (receiver_school_id, status, created_at desc);

create or replace function public.prevent_school_connection_identity_changes()
returns trigger
language plpgsql
as $$
begin
  if new.requester_school_id <> old.requester_school_id
    or new.receiver_school_id <> old.receiver_school_id
    or new.requested_by_profile_id is distinct from old.requested_by_profile_id
    or new.requested_at <> old.requested_at then
    raise exception 'School connection request identity cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_school_connection_identity_changes on public.school_connections;
create trigger prevent_school_connection_identity_changes
  before update on public.school_connections
  for each row execute function public.prevent_school_connection_identity_changes();

drop trigger if exists set_school_connections_updated_at on public.school_connections;
create trigger set_school_connections_updated_at
  before update on public.school_connections
  for each row execute function public.set_updated_at();

alter table public.school_connections enable row level security;

drop policy if exists "School admins can view active school directory" on public.schools;
create policy "School admins can view active school directory"
  on public.schools
  for select
  to authenticated
  using (
    status = 'active'
    and public.current_profile_role() = 'school_admin'
  );

drop policy if exists "School admins can view their school connections" on public.school_connections;
create policy "School admins can view their school connections"
  on public.school_connections
  for select
  to authenticated
  using (
    public.current_profile_role() = 'school_admin'
    and public.current_profile_school_id() in (
      requester_school_id,
      receiver_school_id
    )
  );

drop policy if exists "School admins can request school connections" on public.school_connections;
create policy "School admins can request school connections"
  on public.school_connections
  for insert
  to authenticated
  with check (
    public.current_profile_role() = 'school_admin'
    and requester_school_id = public.current_profile_school_id()
    and requester_school_id <> receiver_school_id
    and requested_by_profile_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "Receiver school admins can respond to pending connections" on public.school_connections;
create policy "Receiver school admins can respond to pending connections"
  on public.school_connections
  for update
  to authenticated
  using (
    public.current_profile_role() = 'school_admin'
    and receiver_school_id = public.current_profile_school_id()
    and status = 'pending'
  )
  with check (
    public.current_profile_role() = 'school_admin'
    and receiver_school_id = public.current_profile_school_id()
    and status in ('approved', 'rejected')
    and responded_by_profile_id = auth.uid()
    and responded_at is not null
  );

notify pgrst, 'reload schema';
