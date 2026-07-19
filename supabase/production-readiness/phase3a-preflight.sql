-- Phase 3A production preflight (read-only).
-- Run in the intended Supabase production project's SQL editor only after the
-- operator has matched that project to the approved change record. This script
-- performs no DDL, DML, privilege changes, or transaction-state changes.
--
-- Decision meanings:
-- PASS: prerequisites exist and all Phase 3A objects are absent.
-- FAIL: prerequisites are missing, object state is partial, or history conflicts.
-- ALREADY PRESENT: all four tables, eight functions, and 14 policies exist;
--                  do not apply the migration and run the postflight instead.

select
  'database identity' as check_name,
  'MANUAL REVIEW' as result,
  format(
    'database=%s; schema=%s; user=%s; server_version=%s. Match the active Supabase project to the approved production change record; portable PostgreSQL metadata does not expose the Supabase project environment.',
    current_database(),
    current_schema(),
    current_user,
    current_setting('server_version')
  ) as details;

with
expected_columns(table_name, column_name, data_type, udt_name, is_nullable) as (
  values
    ('schools', 'id', 'uuid', 'uuid', 'NO'),
    ('profiles', 'id', 'uuid', 'uuid', 'NO'),
    ('profiles', 'school_id', 'uuid', 'uuid', 'NO'),
    ('profiles', 'role', 'USER-DEFINED', 'profile_role', 'NO'),
    ('profiles', 'status', 'USER-DEFINED', 'profile_status', 'NO'),
    ('clubs', 'id', 'uuid', 'uuid', 'NO'),
    ('clubs', 'school_id', 'uuid', 'uuid', 'NO'),
    ('events', 'id', 'uuid', 'uuid', 'NO'),
    ('events', 'school_id', 'uuid', 'uuid', 'NO')
),
expected_constraints(table_name, constraint_name, constraint_type) as (
  values
    ('schools', 'schools_pkey', 'PRIMARY KEY'),
    ('profiles', 'profiles_pkey', 'PRIMARY KEY'),
    ('profiles', 'profiles_school_id_fkey', 'FOREIGN KEY'),
    ('profiles', 'profiles_id_school_unique', 'UNIQUE'),
    ('clubs', 'clubs_pkey', 'PRIMARY KEY'),
    ('clubs', 'clubs_school_id_fkey', 'FOREIGN KEY'),
    ('clubs', 'clubs_id_school_unique', 'UNIQUE'),
    ('events', 'events_pkey', 'PRIMARY KEY'),
    ('events', 'events_school_id_fkey', 'FOREIGN KEY'),
    ('events', 'events_id_school_unique', 'UNIQUE')
),
expected_tables(name) as (
  values
    ('safeguarding_staff_designations'),
    ('safety_reports'),
    ('data_rights_requests'),
    ('restricted_workflow_audit_events')
),
expected_functions(name, arguments) as (
  values
    ('current_user_is_designated_safeguarding_staff', 'uuid'),
    ('get_my_safety_report_receipts', ''),
    ('prepare_safeguarding_designation', ''),
    ('prepare_safety_report_submission', ''),
    ('protect_safety_report_workflow', ''),
    ('prepare_data_rights_request', ''),
    ('protect_data_rights_request_workflow', ''),
    ('log_restricted_workflow_event', '')
),
expected_indexes(name) as (
  values
    ('safeguarding_designations_school_status_idx'),
    ('safety_reports_school_status_created_at_idx'),
    ('safety_reports_reporter_created_at_idx'),
    ('data_rights_requests_school_status_created_at_idx'),
    ('data_rights_requests_requester_created_at_idx'),
    ('restricted_workflow_audit_school_created_at_idx'),
    ('restricted_workflow_audit_report_created_at_idx')
),
expected_policies(table_name, policy_name, command) as (
  values
    ('safeguarding_staff_designations', 'School admins can view safeguarding designations', 'SELECT'),
    ('safeguarding_staff_designations', 'Designated staff can view their own designation', 'SELECT'),
    ('safeguarding_staff_designations', 'School admins can assign safeguarding staff', 'INSERT'),
    ('safeguarding_staff_designations', 'School admins can update safeguarding designations', 'UPDATE'),
    ('safety_reports', 'Active users can submit their own safety reports', 'INSERT'),
    ('safety_reports', 'Designated safeguarding staff can read same-school reports', 'SELECT'),
    ('safety_reports', 'Designated safeguarding staff can update same-school reports', 'UPDATE'),
    ('data_rights_requests', 'Users can view their own data-rights requests', 'SELECT'),
    ('data_rights_requests', 'School admins can view same-school data-rights requests', 'SELECT'),
    ('data_rights_requests', 'Users can submit their own data-rights requests', 'INSERT'),
    ('data_rights_requests', 'Users can withdraw their own unresolved data-rights requests', 'UPDATE'),
    ('data_rights_requests', 'School admins can process same-school data-rights requests', 'UPDATE'),
    ('restricted_workflow_audit_events', 'Safeguarding staff can view report audit events', 'SELECT'),
    ('restricted_workflow_audit_events', 'School admins can view designation and rights audit events', 'SELECT')
),
history_relation as (
  select
    exists (
      select 1 from pg_catalog.pg_namespace where nspname = 'supabase_migrations'
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
            where version = '202607170001'
          ) as version_recorded
        $history$,
        true,
        false,
        ''
      )::text like '%<version_recorded>true</version_recorded>%'
    end as version_recorded
  from history_relation
),
prerequisite_checks(check_name, passed, details) as (
  select
    'required pre-Phase-3A columns',
    not exists (
      select 1
      from expected_columns e
      left join information_schema.columns c
        on c.table_schema = 'public'
       and c.table_name = e.table_name
       and c.column_name = e.column_name
       and c.data_type = e.data_type
       and c.udt_name = e.udt_name
       and c.is_nullable = e.is_nullable
      where c.column_name is null
    ),
    'schools, profiles, clubs, and events expose the columns and types required by the migration'
  union all
  select
    'required existing constraints',
    not exists (
      select 1
      from expected_constraints e
      left join information_schema.table_constraints c
        on c.constraint_schema = 'public'
       and c.table_schema = 'public'
       and c.table_name = e.table_name
       and c.constraint_name = e.constraint_name
       and c.constraint_type = e.constraint_type
      where c.constraint_name is null
    ),
    'primary keys, school foreign keys, and composite id/school unique constraints are present'
  union all
  select
    'required existing helper functions',
    to_regprocedure('public.current_profile_school_id()') is not null
      and to_regprocedure('public.current_profile_role()') is not null,
    'public.current_profile_school_id() and public.current_profile_role() exist'
  union all
  select
    'current schema is public',
    current_schema() = 'public',
    'the SQL Editor session resolves unqualified objects through the expected public schema'
  union all
  select
    'pgcrypto extension available',
    exists (select 1 from pg_catalog.pg_extension where extname = 'pgcrypto'),
    'gen_random_uuid() dependency is available'
  union all
  select
    'Data API roles available',
    exists (select 1 from pg_catalog.pg_roles where rolname = 'anon')
      and exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated'),
    'anon and authenticated roles exist'
  union all
  select
    'profile_role enum matches assumptions',
    coalesce((
      select array_agg(e.enumlabel::text order by e.enumsortorder)
      from pg_catalog.pg_type t
      join pg_catalog.pg_namespace n on n.oid = t.typnamespace
      join pg_catalog.pg_enum e on e.enumtypid = t.oid
      where n.nspname = 'public' and t.typname = 'profile_role'
    ), array[]::text[]) = array['school_admin', 'teacher', 'student']::text[],
    'public.profile_role contains school_admin, teacher, student in the reviewed order'
  union all
  select
    'profile_status enum matches assumptions',
    coalesce((
      select array_agg(e.enumlabel::text order by e.enumsortorder)
      from pg_catalog.pg_type t
      join pg_catalog.pg_namespace n on n.oid = t.typnamespace
      join pg_catalog.pg_enum e on e.enumtypid = t.oid
      where n.nspname = 'public' and t.typname = 'profile_status'
    ), array[]::text[]) = array['active', 'inactive']::text[],
    'public.profile_status contains active and inactive in the reviewed order'
),
object_counts as (
  select
    (select count(*) from expected_tables e where to_regclass('public.' || e.name) is not null) as table_count,
    (
      select count(*)
      from expected_functions e
      join pg_catalog.pg_proc p
        on p.proname = e.name
       and pg_catalog.oidvectortypes(p.proargtypes) = e.arguments
      join pg_catalog.pg_namespace n
        on n.oid = p.pronamespace
       and n.nspname = 'public'
    ) as function_count,
    (
      select count(*)
      from expected_policies e
      join pg_catalog.pg_policies p
        on p.schemaname = 'public'
       and p.tablename = e.table_name
       and p.policyname = e.policy_name
       and p.cmd = e.command
    ) as policy_count,
    (
      select count(*)
      from expected_indexes e
      join pg_catalog.pg_class c on c.relname = e.name and c.relkind = 'i'
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    ) as index_count
),
object_state as (
  select
    table_count,
    function_count,
    policy_count,
    index_count,
    case
      when table_count = 0 and function_count = 0 and policy_count = 0 then 'ABSENT'
      when table_count = 4 and function_count = 8 and policy_count = 14 then 'COMPLETE'
      else 'PARTIAL'
    end as state
  from object_counts
),
preflight_decision as (
  select case
    when o.state = 'COMPLETE' then 'ALREADY PRESENT'
    when o.state = 'PARTIAL' then 'FAIL'
    when o.index_count <> 0 then 'FAIL'
    when coalesce(h.version_recorded, false) then 'FAIL'
    when not (select bool_and(passed) from prerequisite_checks) then 'FAIL'
    else 'PASS'
  end as result
  from object_state o
  cross join migration_history h
),
result_rows(sort_order, check_name, result, details) as (
  select
    10,
    'Phase 3A preflight decision',
    result,
    case result
      when 'PASS' then 'Prerequisites pass and all Phase 3A objects are absent; migration may proceed through the approved controlled SQL procedure.'
      when 'ALREADY PRESENT' then 'All expected Phase 3A tables, functions, and policies are present; do not reapply the migration and run the postflight.'
      else 'Stop: prerequisites failed, Phase 3A is partially present, an index name conflicts, or migration history conflicts with actual objects.'
    end
  from preflight_decision
  union all
  select
    20,
    'Phase 3A object inventory',
    state,
    format(
      'tables=%s/4; functions=%s/8; policies=%s/14; expected_index_names=%s/7',
      table_count,
      function_count,
      policy_count,
      index_count
    )
  from object_state
  union all
  select
    30,
    'migration history',
    case
      when not table_exists then 'MIGRATION HISTORY: NOT AVAILABLE'
      when version_recorded then 'MIGRATION HISTORY: VERSION RECORDED'
      else 'MIGRATION HISTORY: VERSION NOT RECORDED'
    end,
    case
      when not schema_exists then 'Production appears not to be managed through Supabase CLI migration history; schema and table are absent.'
      when not table_exists then 'Production appears not to be managed through Supabase CLI migration history; schema exists but schema_migrations is absent.'
      when version_recorded then 'Version 202607170001 is recorded; actual Phase 3A objects remain authoritative.'
      else 'Migration history exists but version 202607170001 is not recorded; actual Phase 3A objects remain authoritative.'
    end
  from migration_history
  union all
  select
    100,
    check_name,
    case when passed then 'PASS' else 'FAIL' end,
    details
  from prerequisite_checks
)
select check_name, result, details
from result_rows
order by sort_order, check_name;
