-- Phase 3A production preflight (read-only).
-- Run in the intended Supabase production project's SQL editor only after the
-- operator has matched that project to the approved change record. This script
-- performs no DDL, DML, privilege changes, or transaction-state changes.
-- Expected outcome: every automated check is PASS and the database identity row
-- is reviewed and signed by the operator. Any FAIL or unreviewed identity stops
-- the migration.

select
  'database_identity' as check_name,
  'MANUAL REVIEW' as result,
  format(
    'database=%s; user=%s; server_version=%s. Match the active Supabase project to the approved production change record.',
    current_database(),
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
phase3a_tables(name) as (
  values
    ('safeguarding_staff_designations'),
    ('safety_reports'),
    ('data_rights_requests'),
    ('restricted_workflow_audit_events')
),
phase3a_functions(name, arguments) as (
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
phase3a_indexes(name) as (
  values
    ('safeguarding_designations_school_status_idx'),
    ('safety_reports_school_status_created_at_idx'),
    ('safety_reports_reporter_created_at_idx'),
    ('data_rights_requests_school_status_created_at_idx'),
    ('data_rights_requests_requester_created_at_idx'),
    ('restricted_workflow_audit_school_created_at_idx'),
    ('restricted_workflow_audit_report_created_at_idx')
),
phase3a_policies(name) as (
  values
    ('School admins can view safeguarding designations'),
    ('Designated staff can view their own designation'),
    ('School admins can assign safeguarding staff'),
    ('School admins can update safeguarding designations'),
    ('Active users can submit their own safety reports'),
    ('Designated safeguarding staff can read same-school reports'),
    ('Designated safeguarding staff can update same-school reports'),
    ('Users can view their own data-rights requests'),
    ('School admins can view same-school data-rights requests'),
    ('Users can submit their own data-rights requests'),
    ('Users can withdraw their own unresolved data-rights requests'),
    ('School admins can process same-school data-rights requests'),
    ('Safeguarding staff can view report audit events'),
    ('School admins can view designation and rights audit events')
),
migration_ledger(applied) as (
  select case
    when to_regclass('supabase_migrations.schema_migrations') is null then null
    else query_to_xml(
      $$select exists (
          select 1
          from supabase_migrations.schema_migrations
          where version = '202607170001'
        ) as applied$$,
      true,
      false,
      ''
    )::text like '%<applied>true</applied>%'
  end
),
checks(check_name, passed, details) as (
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
    'Phase 3A tables absent',
    not exists (
      select 1
      from phase3a_tables e
      join pg_catalog.pg_class c on c.relname = e.name
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
    ),
    'the four new relation names are unused in public'
  union all
  select
    'Phase 3A functions absent',
    not exists (
      select 1
      from phase3a_functions e
      join pg_catalog.pg_proc p on p.proname = e.name
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and pg_catalog.oidvectortypes(p.proargtypes) = e.arguments
    ),
    'all eight Phase 3A function signatures are unused in public'
  union all
  select
    'Phase 3A index names absent',
    not exists (
      select 1
      from phase3a_indexes e
      join pg_catalog.pg_class c on c.relname = e.name and c.relkind = 'i'
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
    ),
    'all seven explicit Phase 3A index names are unused in public'
  union all
  select
    'Phase 3A policy names absent',
    not exists (
      select 1
      from phase3a_policies e
      join pg_catalog.pg_policies p on p.policyname = e.name
      where p.schemaname = 'public'
    ),
    'the reviewed policy names are not already present on a public table'
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
  union all
  select
    'Supabase migration ledger available',
    to_regclass('supabase_migrations.schema_migrations') is not null,
    'supabase_migrations.schema_migrations exists'
  union all
  select
    'Phase 3A migration not recorded',
    coalesce(not (select applied from migration_ledger), false),
    'migration version 202607170001 is not present in the Supabase migration ledger'
)
select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  details
from checks
order by check_name;
