-- Phase 3 safety simplification preflight (read-only).
-- Run before 202607180003_simplify_safety_reporting.sql. This script performs
-- no DDL, DML, privilege, transaction-state, or remote operations.

select
  'database identity' as check_name,
  'MANUAL REVIEW' as result,
  format(
    'database=%s; schema=%s; user=%s; server_version=%s',
    current_database(),
    current_schema(),
    current_user,
    current_setting('server_version')
  ) as details;

with
history_relation as (
  select
    exists (
      select 1
      from pg_catalog.pg_namespace
      where nspname = 'supabase_migrations'
    ) as schema_exists,
    to_regclass('supabase_migrations.schema_migrations') is not null as table_exists
),
migration_history as (
  select
    schema_exists,
    table_exists,
    case
      when not table_exists then null
      else query_to_xml(
        $history$
          select exists (
            select 1
            from supabase_migrations.schema_migrations
            where version = '202607180003'
          ) as version_recorded
        $history$,
        true,
        false,
        ''
      )::text like '%<version_recorded>true</version_recorded>%'
    end as version_recorded
  from history_relation
),
object_state as (
  select
    to_regclass('public.data_rights_requests') is not null as rights_table_exists,
    to_regprocedure('public.prepare_data_rights_request()') is not null
      as prepare_rights_function_exists,
    to_regprocedure('public.protect_data_rights_request_workflow()') is not null
      as protect_rights_function_exists,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'restricted_workflow_audit_events'
        and column_name = 'data_rights_request_id'
    ) as rights_audit_column_exists
),
safe_counts as (
  select
    case
      when not rights_table_exists then null
      else query_to_xml(
        'select count(*) as request_count from public.data_rights_requests',
        true,
        false,
        ''
      )::text
    end as request_count_xml,
    case
      when to_regclass('public.restricted_workflow_audit_events') is null
        or not rights_audit_column_exists then null
      else query_to_xml(
        $audit$
          select count(*) as rights_audit_count
          from public.restricted_workflow_audit_events
          where target_type = 'data_rights_request'
             or data_rights_request_id is not null
        $audit$,
        true,
        false,
        ''
      )::text
    end as rights_audit_count_xml
  from object_state
),
checks(check_name, passed, details) as (
  select
    'required safety tables exist',
    to_regclass('public.safeguarding_staff_designations') is not null
      and to_regclass('public.safety_reports') is not null
      and to_regclass('public.restricted_workflow_audit_events') is not null,
    'safeguarding_staff_designations, safety_reports, and restricted_workflow_audit_events must exist'
  union all
  select
    'data-rights table exists before removal',
    rights_table_exists,
    'public.data_rights_requests must be present for the corrective migration'
  from object_state
  union all
  select
    'data-rights table is empty',
    request_count_xml like '%<request_count>0</request_count>%',
    'the migration aborts instead of deleting data when any request row exists'
  from safe_counts
  union all
  select
    'data-rights audit branch is empty',
    rights_audit_count_xml like '%<rights_audit_count>0</rights_audit_count>%',
    'status audit rows tied to the removed workflow must not exist'
  from safe_counts
  union all
  select
    'required safety functions exist',
    to_regprocedure('public.current_user_is_designated_safeguarding_staff(uuid)') is not null
      and to_regprocedure('public.get_my_safety_report_receipts()') is not null
      and to_regprocedure('public.prepare_safeguarding_designation()') is not null
      and to_regprocedure('public.prepare_safety_report_submission()') is not null
      and to_regprocedure('public.protect_safety_report_workflow()') is not null
      and to_regprocedure('public.log_restricted_workflow_event()') is not null,
    'all six retained safety functions must exist'
  union all
  select
    'Phase 4A and Phase 4B1 event columns exist',
    (
      select count(*) = 10
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'events'
        and column_name in (
          'responsible_staff_id',
          'eligibility_notes',
          'experience_level',
          'accessibility_notes',
          'cost_type',
          'cost_amount',
          'cost_currency',
          'cost_notes',
          'required_materials',
          'expected_commitment'
        )
    ),
    'apply the reviewed Phase 4A and Phase 4B1 migrations before this correction'
  union all
  select
    'data-rights functions exist before removal',
    prepare_rights_function_exists and protect_rights_function_exists,
    'both named data-rights trigger functions must exist so removal is explicit'
  from object_state
  union all
  select
    'expected data-rights triggers exist',
    (
      select array_agg(t.tgname order by t.tgname)
      from pg_catalog.pg_trigger t
      where t.tgrelid = to_regclass('public.data_rights_requests')
        and not t.tgisinternal
    ) = array[
      'audit_data_rights_request',
      'prepare_data_rights_request',
      'protect_data_rights_request_workflow'
    ]::name[],
    'only the three reviewed application triggers may depend on the request table'
  union all
  select
    'expected data-rights policies exist',
    (
      select count(*) = 5
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'data_rights_requests'
        and policyname in (
          'Users can view their own data-rights requests',
          'School admins can view same-school data-rights requests',
          'Users can submit their own data-rights requests',
          'Users can withdraw their own unresolved data-rights requests',
          'School admins can process same-school data-rights requests'
        )
    )
    and (
      select count(*) = 5
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'data_rights_requests'
    ),
    'the table must expose exactly the five reviewed policies'
  union all
  select
    'expected audit dependency exists',
    rights_audit_column_exists
      and exists (
        select 1
        from pg_catalog.pg_constraint
        where conrelid = to_regclass('public.restricted_workflow_audit_events')
          and confrelid = to_regclass('public.data_rights_requests')
          and contype = 'f'
      ),
    'the only retained cross-table dependency is the reviewed restricted-audit foreign key'
  from object_state
  union all
  select
    'no unexpected foreign-key dependency exists',
    not exists (
      select 1
      from pg_catalog.pg_constraint
      where confrelid = to_regclass('public.data_rights_requests')
        and conrelid <> to_regclass('public.restricted_workflow_audit_events')
    ),
    'no other table may depend on data_rights_requests'
),
decision as (
  select case
    when not o.rights_table_exists
      and not o.prepare_rights_function_exists
      and not o.protect_rights_function_exists
      and not o.rights_audit_column_exists
      and to_regclass('public.safety_reports') is not null
      and to_regclass('public.safeguarding_staff_designations') is not null
      then 'ALREADY PRESENT'
    when bool_and(c.passed) then 'PASS'
    else 'FAIL'
  end as result
  from object_state o
  cross join checks c
  group by
    o.rights_table_exists,
    o.prepare_rights_function_exists,
    o.protect_rights_function_exists,
    o.rights_audit_column_exists
),
result_rows(sort_order, check_name, result, details) as (
  select
    10,
    'Phase 3 safety simplification preflight decision',
    result,
    case result
      when 'PASS' then 'The unused data-rights workflow is empty and has only expected dependencies; the corrective migration may proceed.'
      when 'ALREADY PRESENT' then 'The data-rights workflow is already absent and retained safety tables exist; do not reapply the migration.'
      else 'Stop: data exists, a prerequisite is missing, or an unexpected dependency requires review.'
    end
  from decision
  union all
  select
    20,
    'migration history',
    case
      when not table_exists then 'NOT AVAILABLE'
      when version_recorded then 'VERSION RECORDED'
      else 'VERSION NOT RECORDED'
    end,
    'Migration history is informational; actual object and row checks are authoritative.'
  from migration_history
  union all
  select
    100,
    check_name,
    case when passed then 'PASS' else 'FAIL' end,
    details
  from checks
)
select check_name, result, details
from result_rows
order by sort_order, check_name;
