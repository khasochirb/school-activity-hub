-- Phase 3A: confidential safeguarding and data-rights foundations.
-- This migration is intentionally local until safeguarding/privacy governance is approved.

create table if not exists public.safeguarding_staff_designations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid not null,
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active',
  assigned_at timestamptz not null default now(),
  status_changed_by_profile_id uuid references public.profiles(id) on delete set null,
  status_changed_at timestamptz not null default now(),
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safeguarding_staff_designations_profile_school_fk
    foreign key (profile_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict,
  constraint safeguarding_staff_designations_profile_school_unique
    unique (profile_id, school_id),
  constraint safeguarding_staff_designations_status_check
    check (status in ('active', 'inactive')),
  constraint safeguarding_staff_designations_deactivated_at_check
    check (
      (status = 'active' and deactivated_at is null)
      or (status = 'inactive' and deactivated_at is not null)
    )
);

create index if not exists safeguarding_designations_school_status_idx
  on public.safeguarding_staff_designations (school_id, status, assigned_at desc);

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  reporter_profile_id uuid not null,
  related_event_id uuid,
  related_club_id uuid,
  concern_category text not null,
  description text not null,
  immediate_contact_requested boolean not null default false,
  status text not null default 'submitted',
  acknowledged_by_profile_id uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  external_referral_at timestamptz,
  closed_by_profile_id uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_reports_reporter_school_fk
    foreign key (reporter_profile_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict,
  constraint safety_reports_event_school_fk
    foreign key (related_event_id, school_id)
    references public.events(id, school_id)
    on delete restrict,
  constraint safety_reports_club_school_fk
    foreign key (related_club_id, school_id)
    references public.clubs(id, school_id)
    on delete restrict,
  constraint safety_reports_single_context_check
    check (num_nonnulls(related_event_id, related_club_id) <= 1),
  constraint safety_reports_category_check
    check (
      concern_category in (
        'personal_safety',
        'bullying_or_harassment',
        'activity_or_event',
        'online_or_platform',
        'other'
      )
    ),
  constraint safety_reports_description_check
    check (
      length(btrim(description)) between 1 and 2000
    ),
  constraint safety_reports_status_check
    check (
      status in (
        'submitted',
        'acknowledged',
        'in_review',
        'external_referral',
        'closed'
      )
    ),
  constraint safety_reports_acknowledgment_check
    check (
      (acknowledged_at is null and acknowledged_by_profile_id is null)
      or (acknowledged_at is not null and acknowledged_by_profile_id is not null)
    ),
  constraint safety_reports_closure_check
    check (
      (status = 'closed' and closed_at is not null and closed_by_profile_id is not null)
      or (status <> 'closed' and closed_at is null and closed_by_profile_id is null)
    )
);

create index if not exists safety_reports_school_status_created_at_idx
  on public.safety_reports (school_id, status, created_at desc);

create index if not exists safety_reports_reporter_created_at_idx
  on public.safety_reports (reporter_profile_id, created_at desc);

create table if not exists public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  requester_profile_id uuid not null,
  request_type text not null,
  details text,
  status text not null default 'submitted',
  response_summary text,
  handled_by_profile_id uuid references public.profiles(id) on delete set null,
  status_changed_by_profile_id uuid references public.profiles(id) on delete set null,
  status_changed_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_rights_requests_requester_school_fk
    foreign key (requester_profile_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict,
  constraint data_rights_requests_type_check
    check (
      request_type in (
        'access',
        'correction',
        'export',
        'deletion_or_deactivation',
        'research_withdrawal'
      )
    ),
  constraint data_rights_requests_details_check
    check (details is null or length(btrim(details)) between 1 and 2000),
  constraint data_rights_requests_status_check
    check (
      status in (
        'submitted',
        'acknowledged',
        'under_review',
        'action_required',
        'completed',
        'denied_with_reason',
        'withdrawn'
      )
    ),
  constraint data_rights_requests_response_check
    check (
      response_summary is null
      or length(btrim(response_summary)) between 1 and 1000
    ),
  constraint data_rights_requests_denial_reason_check
    check (
      status <> 'denied_with_reason'
      or response_summary is not null
    ),
  constraint data_rights_requests_resolution_check
    check (
      (
        status in ('completed', 'denied_with_reason', 'withdrawn')
        and resolved_at is not null
      )
      or (
        status not in ('completed', 'denied_with_reason', 'withdrawn')
        and resolved_at is null
      )
    )
);

create index if not exists data_rights_requests_school_status_created_at_idx
  on public.data_rights_requests (school_id, status, created_at desc);

create index if not exists data_rights_requests_requester_created_at_idx
  on public.data_rights_requests (requester_profile_id, created_at desc);

create table if not exists public.restricted_workflow_audit_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  safeguarding_designation_id uuid references public.safeguarding_staff_designations(id) on delete set null,
  safety_report_id uuid references public.safety_reports(id) on delete set null,
  data_rights_request_id uuid references public.data_rights_requests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint restricted_workflow_audit_target_check
    check (
      (
        target_type = 'safeguarding_designation'
        and safeguarding_designation_id is not null
        and safety_report_id is null
        and data_rights_request_id is null
      )
      or (
        target_type = 'safety_report'
        and safeguarding_designation_id is null
        and safety_report_id is not null
        and data_rights_request_id is null
      )
      or (
        target_type = 'data_rights_request'
        and safeguarding_designation_id is null
        and safety_report_id is null
        and data_rights_request_id is not null
      )
    )
);

create index if not exists restricted_workflow_audit_school_created_at_idx
  on public.restricted_workflow_audit_events (school_id, created_at desc);

create index if not exists restricted_workflow_audit_report_created_at_idx
  on public.restricted_workflow_audit_events (safety_report_id, created_at desc)
  where safety_report_id is not null;

comment on table public.safeguarding_staff_designations is
  'School-scoped safeguarding access designations. Not a profile role.';
comment on table public.safety_reports is
  'Highly confidential student/staff safety reports. Narratives must not enter ordinary analytics or logs.';
comment on column public.safety_reports.description is
  'Sensitive free text. Accessible only to actively designated same-school safeguarding staff.';
comment on table public.data_rights_requests is
  'Authenticated operational data access, correction, export, deletion/deactivation and research-withdrawal requests.';
comment on table public.restricted_workflow_audit_events is
  'Restricted status-only audit stream. Never store report narratives, exports, or sensitive case notes.';

create or replace function public.current_user_is_designated_safeguarding_staff(
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_school_id = public.current_profile_school_id()
    and public.current_profile_role() in ('school_admin', 'teacher')
    and exists (
      select 1
      from public.safeguarding_staff_designations ssd
      where ssd.school_id = target_school_id
        and ssd.profile_id = auth.uid()
        and ssd.status = 'active'
    )
$$;

revoke all on function public.current_user_is_designated_safeguarding_staff(uuid) from public;
grant execute on function public.current_user_is_designated_safeguarding_staff(uuid) to authenticated;

create or replace function public.get_my_safety_report_receipts()
returns table (
  id uuid,
  concern_category text,
  status text,
  immediate_contact_requested boolean,
  created_at timestamptz,
  acknowledged_at timestamptz,
  closed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sr.id,
    sr.concern_category,
    sr.status,
    sr.immediate_contact_requested,
    sr.created_at,
    sr.acknowledged_at,
    sr.closed_at
  from public.safety_reports sr
  join public.profiles p
    on p.id = sr.reporter_profile_id
   and p.school_id = sr.school_id
  where sr.reporter_profile_id = auth.uid()
    and p.status = 'active'
  order by sr.created_at desc
$$;

revoke all on function public.get_my_safety_report_receipts() from public;
grant execute on function public.get_my_safety_report_receipts() to authenticated;

create or replace function public.prepare_safeguarding_designation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.assigned_by_profile_id := auth.uid();
    new.assigned_at := now();
    new.status := 'active';
    new.status_changed_by_profile_id := auth.uid();
    new.status_changed_at := now();
    new.deactivated_at := null;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.id <> old.id
    or new.school_id <> old.school_id
    or new.profile_id <> old.profile_id
    or new.assigned_by_profile_id is distinct from old.assigned_by_profile_id
    or new.assigned_at <> old.assigned_at
    or new.created_at <> old.created_at then
    raise exception 'Safeguarding designation identity cannot be changed.';
  end if;

  if new.status = old.status then
    raise exception 'Safeguarding designation status did not change.';
  end if;

  new.status_changed_by_profile_id := auth.uid();
  new.status_changed_at := now();
  new.deactivated_at := case when new.status = 'inactive' then now() else null end;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_safeguarding_designation() from public;

create or replace function public.prepare_safety_report_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'submitted';
  new.acknowledged_by_profile_id := null;
  new.acknowledged_at := null;
  new.external_referral_at := null;
  new.closed_by_profile_id := null;
  new.closed_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_safety_report_submission() from public;

create or replace function public.protect_safety_report_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.school_id <> old.school_id
    or new.reporter_profile_id <> old.reporter_profile_id
    or new.related_event_id is distinct from old.related_event_id
    or new.related_club_id is distinct from old.related_club_id
    or new.concern_category <> old.concern_category
    or new.description <> old.description
    or new.immediate_contact_requested <> old.immediate_contact_requested
    or new.created_at <> old.created_at then
    raise exception 'Safety report content and identity cannot be changed.';
  end if;

  if new.status = old.status then
    raise exception 'Safety report workflow status did not change.';
  end if;

  if not (
    (old.status = 'submitted' and new.status = 'acknowledged')
    or (old.status = 'acknowledged' and new.status in ('in_review', 'external_referral', 'closed'))
    or (old.status = 'in_review' and new.status in ('external_referral', 'closed'))
    or (old.status = 'external_referral' and new.status = 'closed')
  ) then
    raise exception 'Invalid safety report workflow transition.';
  end if;

  new.acknowledged_by_profile_id := old.acknowledged_by_profile_id;
  new.acknowledged_at := old.acknowledged_at;
  new.external_referral_at := old.external_referral_at;
  new.closed_by_profile_id := old.closed_by_profile_id;
  new.closed_at := old.closed_at;

  if old.status = 'submitted' and new.status = 'acknowledged' then
    new.acknowledged_by_profile_id := auth.uid();
    new.acknowledged_at := now();
  end if;

  if new.status = 'external_referral' and old.status <> 'external_referral' then
    new.external_referral_at := now();
  end if;

  if new.status = 'closed' then
    new.closed_by_profile_id := auth.uid();
    new.closed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.protect_safety_report_workflow() from public;

create or replace function public.prepare_data_rights_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'submitted';
  new.response_summary := null;
  new.handled_by_profile_id := null;
  new.status_changed_by_profile_id := auth.uid();
  new.status_changed_at := now();
  new.acknowledged_at := null;
  new.resolved_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.prepare_data_rights_request() from public;

create or replace function public.protect_data_rights_request_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_school_admin boolean;
begin
  if new.id <> old.id
    or new.school_id <> old.school_id
    or new.requester_profile_id <> old.requester_profile_id
    or new.request_type <> old.request_type
    or new.details is distinct from old.details
    or new.created_at <> old.created_at then
    raise exception 'Data-rights request identity and submitted details cannot be changed.';
  end if;

  actor_is_school_admin := (
    public.current_profile_school_id() = old.school_id
    and public.current_profile_role() = 'school_admin'
  );

  if auth.uid() = old.requester_profile_id and new.status = 'withdrawn' then
    if new.status <> 'withdrawn'
      or old.status in ('completed', 'denied_with_reason', 'withdrawn')
      or new.response_summary is distinct from old.response_summary
      or new.handled_by_profile_id is distinct from old.handled_by_profile_id then
      raise exception 'A requester may only withdraw an unresolved request.';
    end if;
  elsif actor_is_school_admin then
    if not (
      (old.status = 'submitted' and new.status in ('acknowledged', 'under_review', 'action_required', 'completed', 'denied_with_reason'))
      or (old.status = 'acknowledged' and new.status in ('under_review', 'action_required', 'completed', 'denied_with_reason'))
      or (old.status = 'under_review' and new.status in ('action_required', 'completed', 'denied_with_reason'))
      or (old.status = 'action_required' and new.status in ('under_review', 'completed', 'denied_with_reason'))
    ) then
      raise exception 'Invalid data-rights request workflow transition.';
    end if;
  else
    raise exception 'Not authorized to update this data-rights request.';
  end if;

  new.status_changed_by_profile_id := auth.uid();
  new.status_changed_at := now();
  new.acknowledged_at := old.acknowledged_at;
  new.resolved_at := old.resolved_at;

  if actor_is_school_admin then
    new.handled_by_profile_id := auth.uid();
  end if;

  if new.status = 'acknowledged' and old.acknowledged_at is null then
    new.acknowledged_at := now();
  end if;

  if new.status in ('completed', 'denied_with_reason', 'withdrawn') then
    new.resolved_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.protect_data_rights_request_workflow() from public;

create or replace function public.log_restricted_workflow_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_action text;
  event_metadata jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'safeguarding_staff_designations' then
    event_action := case
      when tg_op = 'INSERT' then 'safeguarding.designation.added'
      when new.status = 'active' then 'safeguarding.designation.reactivated'
      else 'safeguarding.designation.deactivated'
    end;
    event_metadata := jsonb_build_object('new_status', new.status);

    insert into public.restricted_workflow_audit_events (
      school_id,
      actor_profile_id,
      action,
      target_type,
      safeguarding_designation_id,
      metadata
    ) values (
      new.school_id,
      auth.uid(),
      event_action,
      'safeguarding_designation',
      new.id,
      event_metadata
    );
  elsif tg_table_name = 'safety_reports' then
    event_action := case
      when tg_op = 'INSERT' then 'safety_report.submitted'
      when new.status = 'acknowledged' then 'safety_report.acknowledged'
      when new.status = 'external_referral' then 'safety_report.external_referral'
      when new.status = 'closed' then 'safety_report.closed'
      else 'safety_report.status_changed'
    end;
    event_metadata := case
      when tg_op = 'INSERT' then jsonb_build_object('new_status', new.status)
      else jsonb_build_object('previous_status', old.status, 'new_status', new.status)
    end;

    insert into public.restricted_workflow_audit_events (
      school_id,
      actor_profile_id,
      action,
      target_type,
      safety_report_id,
      metadata
    ) values (
      new.school_id,
      auth.uid(),
      event_action,
      'safety_report',
      new.id,
      event_metadata
    );
  elsif tg_table_name = 'data_rights_requests' then
    event_action := case
      when tg_op = 'INSERT' then 'data_rights.request.submitted'
      when new.status = 'withdrawn' then 'data_rights.request.withdrawn'
      else 'data_rights.request.status_changed'
    end;
    event_metadata := case
      when tg_op = 'INSERT' then jsonb_build_object('new_status', new.status)
      else jsonb_build_object('previous_status', old.status, 'new_status', new.status)
    end;

    insert into public.restricted_workflow_audit_events (
      school_id,
      actor_profile_id,
      action,
      target_type,
      data_rights_request_id,
      metadata
    ) values (
      new.school_id,
      auth.uid(),
      event_action,
      'data_rights_request',
      new.id,
      event_metadata
    );
  end if;

  return new;
end;
$$;

revoke all on function public.log_restricted_workflow_event() from public;

drop trigger if exists prepare_safeguarding_designation on public.safeguarding_staff_designations;
create trigger prepare_safeguarding_designation
  before insert or update on public.safeguarding_staff_designations
  for each row execute function public.prepare_safeguarding_designation();

drop trigger if exists protect_safety_report_workflow on public.safety_reports;
drop trigger if exists prepare_safety_report_submission on public.safety_reports;
create trigger prepare_safety_report_submission
  before insert on public.safety_reports
  for each row execute function public.prepare_safety_report_submission();

create trigger protect_safety_report_workflow
  before update on public.safety_reports
  for each row execute function public.protect_safety_report_workflow();

drop trigger if exists prepare_data_rights_request on public.data_rights_requests;
create trigger prepare_data_rights_request
  before insert on public.data_rights_requests
  for each row execute function public.prepare_data_rights_request();

drop trigger if exists protect_data_rights_request_workflow on public.data_rights_requests;
create trigger protect_data_rights_request_workflow
  before update on public.data_rights_requests
  for each row execute function public.protect_data_rights_request_workflow();

drop trigger if exists audit_safeguarding_designation on public.safeguarding_staff_designations;
create trigger audit_safeguarding_designation
  after insert or update on public.safeguarding_staff_designations
  for each row execute function public.log_restricted_workflow_event();

drop trigger if exists audit_safety_report on public.safety_reports;
create trigger audit_safety_report
  after insert or update on public.safety_reports
  for each row execute function public.log_restricted_workflow_event();

drop trigger if exists audit_data_rights_request on public.data_rights_requests;
create trigger audit_data_rights_request
  after insert or update on public.data_rights_requests
  for each row execute function public.log_restricted_workflow_event();

alter table public.safeguarding_staff_designations enable row level security;
alter table public.safety_reports enable row level security;
alter table public.data_rights_requests enable row level security;
alter table public.restricted_workflow_audit_events enable row level security;

revoke all on table public.safeguarding_staff_designations from public, anon, authenticated;
revoke all on table public.safety_reports from public, anon, authenticated;
revoke all on table public.data_rights_requests from public, anon, authenticated;
revoke all on table public.restricted_workflow_audit_events from public, anon, authenticated;

grant select, insert, update on table public.safeguarding_staff_designations to authenticated;
grant select, insert, update on table public.safety_reports to authenticated;
grant select, insert, update on table public.data_rights_requests to authenticated;
grant select on table public.restricted_workflow_audit_events to authenticated;

drop policy if exists "School admins can view safeguarding designations" on public.safeguarding_staff_designations;
create policy "School admins can view safeguarding designations"
  on public.safeguarding_staff_designations
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  );

drop policy if exists "Designated staff can view their own designation" on public.safeguarding_staff_designations;
create policy "Designated staff can view their own designation"
  on public.safeguarding_staff_designations
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
  );

drop policy if exists "School admins can assign safeguarding staff" on public.safeguarding_staff_designations;
create policy "School admins can assign safeguarding staff"
  on public.safeguarding_staff_designations
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and assigned_by_profile_id = auth.uid()
    and status_changed_by_profile_id = auth.uid()
    and status = 'active'
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and p.school_id = safeguarding_staff_designations.school_id
        and p.status = 'active'
        and p.role in ('school_admin', 'teacher')
    )
  );

drop policy if exists "School admins can update safeguarding designations" on public.safeguarding_staff_designations;
create policy "School admins can update safeguarding designations"
  on public.safeguarding_staff_designations
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  )
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and status_changed_by_profile_id = auth.uid()
    and status in ('active', 'inactive')
    and (
      status = 'inactive'
      or exists (
        select 1
        from public.profiles p
        where p.id = profile_id
          and p.school_id = safeguarding_staff_designations.school_id
          and p.status = 'active'
          and p.role in ('school_admin', 'teacher')
      )
    )
  );

drop policy if exists "Active users can submit their own safety reports" on public.safety_reports;
create policy "Active users can submit their own safety reports"
  on public.safety_reports
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and reporter_profile_id = auth.uid()
    and status = 'submitted'
    and acknowledged_by_profile_id is null
    and acknowledged_at is null
    and external_referral_at is null
    and closed_by_profile_id is null
    and closed_at is null
  );

drop policy if exists "Designated safeguarding staff can read same-school reports" on public.safety_reports;
create policy "Designated safeguarding staff can read same-school reports"
  on public.safety_reports
  for select
  to authenticated
  using (public.current_user_is_designated_safeguarding_staff(school_id));

drop policy if exists "Designated safeguarding staff can update same-school reports" on public.safety_reports;
create policy "Designated safeguarding staff can update same-school reports"
  on public.safety_reports
  for update
  to authenticated
  using (public.current_user_is_designated_safeguarding_staff(school_id))
  with check (public.current_user_is_designated_safeguarding_staff(school_id));

drop policy if exists "Users can view their own data-rights requests" on public.data_rights_requests;
create policy "Users can view their own data-rights requests"
  on public.data_rights_requests
  for select
  to authenticated
  using (
    requester_profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
  );

drop policy if exists "School admins can view same-school data-rights requests" on public.data_rights_requests;
create policy "School admins can view same-school data-rights requests"
  on public.data_rights_requests
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
  );

drop policy if exists "Users can submit their own data-rights requests" on public.data_rights_requests;
create policy "Users can submit their own data-rights requests"
  on public.data_rights_requests
  for insert
  to authenticated
  with check (
    school_id = public.current_profile_school_id()
    and requester_profile_id = auth.uid()
    and status = 'submitted'
    and handled_by_profile_id is null
    and acknowledged_at is null
    and resolved_at is null
  );

drop policy if exists "Users can withdraw their own unresolved data-rights requests" on public.data_rights_requests;
create policy "Users can withdraw their own unresolved data-rights requests"
  on public.data_rights_requests
  for update
  to authenticated
  using (
    requester_profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
    and status not in ('completed', 'denied_with_reason', 'withdrawn')
  )
  with check (
    requester_profile_id = auth.uid()
    and school_id = public.current_profile_school_id()
    and status = 'withdrawn'
  );

drop policy if exists "School admins can process same-school data-rights requests" on public.data_rights_requests;
create policy "School admins can process same-school data-rights requests"
  on public.data_rights_requests
  for update
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and status not in ('completed', 'denied_with_reason', 'withdrawn')
  )
  with check (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and handled_by_profile_id = auth.uid()
  );

drop policy if exists "Safeguarding staff can view report audit events" on public.restricted_workflow_audit_events;
create policy "Safeguarding staff can view report audit events"
  on public.restricted_workflow_audit_events
  for select
  to authenticated
  using (
    target_type = 'safety_report'
    and public.current_user_is_designated_safeguarding_staff(school_id)
  );

drop policy if exists "School admins can view designation and rights audit events" on public.restricted_workflow_audit_events;
create policy "School admins can view designation and rights audit events"
  on public.restricted_workflow_audit_events
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and target_type in ('safeguarding_designation', 'data_rights_request')
  );

notify pgrst, 'reload schema';
