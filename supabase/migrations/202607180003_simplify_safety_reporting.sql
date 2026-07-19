-- Phase 3 corrective migration: retain a small safety-report workflow and
-- remove the unused digital data-rights request workflow.

do $$
declare
  request_count bigint;
  rights_audit_count bigint;
begin
  if to_regclass('public.data_rights_requests') is null then
    raise exception 'Expected public.data_rights_requests before Phase 3 simplification.';
  end if;

  select count(*) into request_count
  from public.data_rights_requests;

  if request_count <> 0 then
    raise exception
      'Phase 3 simplification aborted: public.data_rights_requests contains % row(s).',
      request_count;
  end if;

  select count(*) into rights_audit_count
  from public.restricted_workflow_audit_events
  where target_type = 'data_rights_request'
     or data_rights_request_id is not null;

  if rights_audit_count <> 0 then
    raise exception
      'Phase 3 simplification aborted: restricted audit data contains % data-rights event(s).',
      rights_audit_count;
  end if;
end;
$$;

drop trigger if exists audit_data_rights_request on public.data_rights_requests;
drop trigger if exists protect_data_rights_request_workflow on public.data_rights_requests;
drop trigger if exists prepare_data_rights_request on public.data_rights_requests;

drop policy if exists "Users can view their own data-rights requests"
  on public.data_rights_requests;
drop policy if exists "School admins can view same-school data-rights requests"
  on public.data_rights_requests;
drop policy if exists "Users can submit their own data-rights requests"
  on public.data_rights_requests;
drop policy if exists "Users can withdraw their own unresolved data-rights requests"
  on public.data_rights_requests;
drop policy if exists "School admins can process same-school data-rights requests"
  on public.data_rights_requests;

create or replace function public.current_user_is_designated_safeguarding_staff(
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.safeguarding_staff_designations ssd
      on ssd.profile_id = p.id
     and ssd.school_id = p.school_id
    where p.id = auth.uid()
      and p.school_id = target_school_id
      and p.status = 'active'
      and p.role in ('school_admin', 'teacher')
      and ssd.status = 'active'
  )
$$;

create or replace function public.prepare_safeguarding_designation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_responder_count integer;
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
  else
    if new.id <> old.id
      or new.school_id <> old.school_id
      or new.profile_id <> old.profile_id
      or new.assigned_by_profile_id is distinct from old.assigned_by_profile_id
      or new.assigned_at <> old.assigned_at
      or new.created_at <> old.created_at then
      raise exception 'Safety response team designation identity cannot be changed.';
    end if;

    if new.status = old.status then
      raise exception 'Safety response team designation status did not change.';
    end if;

    new.status_changed_by_profile_id := auth.uid();
    new.status_changed_at := now();
    new.deactivated_at := case when new.status = 'inactive' then now() else null end;
    new.updated_at := now();
  end if;

  if new.status = 'active' then
    if not exists (
      select 1
      from public.profiles p
      where p.id = new.profile_id
        and p.school_id = new.school_id
        and p.status = 'active'
        and p.role in ('school_admin', 'teacher')
    ) then
      raise exception using
        errcode = '23514',
        message = 'SAFETY_RESPONSE_TEAM_PROFILE_INELIGIBLE';
    end if;

    -- Serialize activations for this school so concurrent attempts cannot both
    -- observe fewer than three active eligible responders.
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.school_id::text, 0)
    );

    select count(*) into active_responder_count
    from public.safeguarding_staff_designations ssd
    join public.profiles p
      on p.id = ssd.profile_id
     and p.school_id = ssd.school_id
    where ssd.school_id = new.school_id
      and ssd.status = 'active'
      and ssd.id <> new.id
      and p.status = 'active'
      and p.role in ('school_admin', 'teacher');

    if active_responder_count >= 3 then
      raise exception using
        errcode = 'P0001',
        message = 'SAFETY_RESPONSE_TEAM_LIMIT_REACHED';
    end if;
  end if;

  return new;
end;
$$;

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
    (old.status = 'submitted' and new.status = 'in_review')
    or (old.status = 'acknowledged' and new.status in ('in_review', 'closed'))
    or (old.status = 'in_review' and new.status = 'closed')
    or (old.status = 'external_referral' and new.status = 'closed')
  ) then
    raise exception 'Invalid safety report workflow transition.';
  end if;

  new.acknowledged_by_profile_id := old.acknowledged_by_profile_id;
  new.acknowledged_at := old.acknowledged_at;
  new.external_referral_at := old.external_referral_at;
  new.closed_by_profile_id := old.closed_by_profile_id;
  new.closed_at := old.closed_at;

  if old.acknowledged_at is null and new.status in ('in_review', 'closed') then
    new.acknowledged_by_profile_id := auth.uid();
    new.acknowledged_at := now();
  end if;

  if new.status = 'closed' then
    new.closed_by_profile_id := auth.uid();
    new.closed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

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
      when new.status = 'in_review' then 'safety_report.review_started'
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
  end if;

  return new;
end;
$$;

drop policy if exists "School admins can view designation and rights audit events"
  on public.restricted_workflow_audit_events;
drop policy if exists "School admins can view designation audit events"
  on public.restricted_workflow_audit_events;
create policy "School admins can view designation audit events"
  on public.restricted_workflow_audit_events
  for select
  to authenticated
  using (
    school_id = public.current_profile_school_id()
    and public.current_profile_role() = 'school_admin'
    and target_type = 'safeguarding_designation'
  );

alter table public.restricted_workflow_audit_events
  drop constraint if exists restricted_workflow_audit_events_data_rights_request_id_fkey;

alter table public.restricted_workflow_audit_events
  drop constraint restricted_workflow_audit_target_check;

alter table public.restricted_workflow_audit_events
  drop column data_rights_request_id;

alter table public.restricted_workflow_audit_events
  add constraint restricted_workflow_audit_target_check
  check (
    (
      target_type = 'safeguarding_designation'
      and safeguarding_designation_id is not null
      and safety_report_id is null
    )
    or (
      target_type = 'safety_report'
      and safeguarding_designation_id is null
      and safety_report_id is not null
    )
  );

drop table public.data_rights_requests;

drop function public.prepare_data_rights_request();
drop function public.protect_data_rights_request_workflow();

comment on table public.safeguarding_staff_designations is
  'School-scoped safety response team designations. Maximum three active eligible responders per school. Not a profile role.';
comment on table public.restricted_workflow_audit_events is
  'Restricted safety status-only audit stream. Never store report narratives, exports, or sensitive case notes.';

revoke all on function public.current_user_is_designated_safeguarding_staff(uuid)
  from public, anon, authenticated;
revoke all on function public.get_my_safety_report_receipts()
  from public, anon, authenticated;
revoke all on function public.log_restricted_workflow_event()
  from public, anon, authenticated;
revoke all on function public.prepare_safeguarding_designation()
  from public, anon, authenticated;
revoke all on function public.prepare_safety_report_submission()
  from public, anon, authenticated;
revoke all on function public.protect_safety_report_workflow()
  from public, anon, authenticated;

grant execute on function public.current_user_is_designated_safeguarding_staff(uuid)
  to authenticated;
grant execute on function public.get_my_safety_report_receipts()
  to authenticated;

notify pgrst, 'reload schema';
