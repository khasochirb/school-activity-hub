-- Phase 3A production postflight (read-only).
-- Run immediately after applying only migration 202607170001. Any FAIL stops
-- application deployment. This script performs no DDL, DML, privilege changes,
-- or transaction-state changes.

with
expected_tables(name) as (
  values
    ('safeguarding_staff_designations'),
    ('safety_reports'),
    ('data_rights_requests'),
    ('restricted_workflow_audit_events')
),
expected_constraints(table_name, constraint_name) as (
  values
    ('safeguarding_staff_designations', 'safeguarding_staff_designations_pkey'),
    ('safeguarding_staff_designations', 'safeguarding_staff_designations_school_id_fkey'),
    ('safeguarding_staff_designations', 'safeguarding_staff_designations_assigned_by_profile_id_fkey'),
    ('safeguarding_staff_designations', 'safeguarding_staff_designatio_status_changed_by_profile_id_fkey'),
    ('safeguarding_staff_designations', 'safeguarding_staff_designations_profile_school_fk'),
    ('safeguarding_staff_designations', 'safeguarding_staff_designations_profile_school_unique'),
    ('safeguarding_staff_designations', 'safeguarding_staff_designations_status_check'),
    ('safeguarding_staff_designations', 'safeguarding_staff_designations_deactivated_at_check'),
    ('safety_reports', 'safety_reports_pkey'),
    ('safety_reports', 'safety_reports_school_id_fkey'),
    ('safety_reports', 'safety_reports_acknowledged_by_profile_id_fkey'),
    ('safety_reports', 'safety_reports_closed_by_profile_id_fkey'),
    ('safety_reports', 'safety_reports_reporter_school_fk'),
    ('safety_reports', 'safety_reports_event_school_fk'),
    ('safety_reports', 'safety_reports_club_school_fk'),
    ('safety_reports', 'safety_reports_single_context_check'),
    ('safety_reports', 'safety_reports_category_check'),
    ('safety_reports', 'safety_reports_description_check'),
    ('safety_reports', 'safety_reports_status_check'),
    ('safety_reports', 'safety_reports_acknowledgment_check'),
    ('safety_reports', 'safety_reports_closure_check'),
    ('data_rights_requests', 'data_rights_requests_pkey'),
    ('data_rights_requests', 'data_rights_requests_school_id_fkey'),
    ('data_rights_requests', 'data_rights_requests_handled_by_profile_id_fkey'),
    ('data_rights_requests', 'data_rights_requests_status_changed_by_profile_id_fkey'),
    ('data_rights_requests', 'data_rights_requests_requester_school_fk'),
    ('data_rights_requests', 'data_rights_requests_type_check'),
    ('data_rights_requests', 'data_rights_requests_details_check'),
    ('data_rights_requests', 'data_rights_requests_status_check'),
    ('data_rights_requests', 'data_rights_requests_response_check'),
    ('data_rights_requests', 'data_rights_requests_denial_reason_check'),
    ('data_rights_requests', 'data_rights_requests_resolution_check'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_events_pkey'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_events_school_id_fkey'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_events_actor_profile_id_fkey'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_even_safeguarding_designation_id_fkey'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_events_safety_report_id_fkey'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_events_data_rights_request_id_fkey'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_target_check')
),
expected_indexes(table_name, index_name) as (
  values
    ('safeguarding_staff_designations', 'safeguarding_designations_school_status_idx'),
    ('safety_reports', 'safety_reports_school_status_created_at_idx'),
    ('safety_reports', 'safety_reports_reporter_created_at_idx'),
    ('data_rights_requests', 'data_rights_requests_school_status_created_at_idx'),
    ('data_rights_requests', 'data_rights_requests_requester_created_at_idx'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_school_created_at_idx'),
    ('restricted_workflow_audit_events', 'restricted_workflow_audit_report_created_at_idx')
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
expected_table_grants(table_name, privileges) as (
  values
    ('safeguarding_staff_designations', array['INSERT', 'SELECT', 'UPDATE']::text[]),
    ('safety_reports', array['INSERT', 'SELECT', 'UPDATE']::text[]),
    ('data_rights_requests', array['INSERT', 'SELECT', 'UPDATE']::text[]),
    ('restricted_workflow_audit_events', array['SELECT']::text[])
),
expected_functions(signature, authenticated_execute) as (
  values
    ('public.current_user_is_designated_safeguarding_staff(uuid)', true),
    ('public.get_my_safety_report_receipts()', true),
    ('public.prepare_safeguarding_designation()', false),
    ('public.prepare_safety_report_submission()', false),
    ('public.protect_safety_report_workflow()', false),
    ('public.prepare_data_rights_request()', false),
    ('public.protect_data_rights_request_workflow()', false),
    ('public.log_restricted_workflow_event()', false)
),
actual_authenticated_grants as (
  select
    c.relname as table_name,
    array_agg(distinct upper(x.privilege_type) order by upper(x.privilege_type)) as privileges
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
  join pg_catalog.pg_roles r on r.oid = x.grantee
  where n.nspname = 'public'
    and r.rolname = 'authenticated'
    and c.relname in (select name from expected_tables)
  group by c.relname
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
    'four Phase 3A tables exist',
    (select count(*) from expected_tables e where to_regclass('public.' || e.name) is not null) = 4,
    'all four reviewed tables resolve in public'
  union all
  select
    'expected constraints exist',
    not exists (
      select 1
      from expected_constraints e
      left join information_schema.table_constraints c
        on c.constraint_schema = 'public'
       and c.table_schema = 'public'
       and c.table_name = e.table_name
       and c.constraint_name = e.constraint_name
      where c.constraint_name is null
    ),
    'all reviewed primary, foreign-key, unique, and check constraints exist'
  union all
  select
    'expected explicit indexes exist',
    not exists (
      select 1
      from expected_indexes e
      left join pg_catalog.pg_indexes i
        on i.schemaname = 'public'
       and i.tablename = e.table_name
       and i.indexname = e.index_name
      where i.indexname is null
    ),
    'all seven reviewed explicit indexes exist on their expected tables'
  union all
  select
    'RLS enabled on all new tables',
    (select count(*)
       from expected_tables e
       join pg_catalog.pg_class c on c.relname = e.name and c.relrowsecurity
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public') = 4,
    'relrowsecurity is true for every Phase 3A table'
  union all
  select
    'exact reviewed policy set',
    not exists (
      select 1
      from expected_policies e
      left join pg_catalog.pg_policies p
        on p.schemaname = 'public'
       and p.tablename = e.table_name
       and p.policyname = e.policy_name
       and p.cmd = e.command
       and p.roles = array['authenticated']::name[]
      where p.policyname is null
    )
    and not exists (
      select 1
      from pg_catalog.pg_policies p
      where p.schemaname = 'public'
        and p.tablename in (select name from expected_tables)
        and not exists (
          select 1 from expected_policies e
          where e.table_name = p.tablename
            and e.policy_name = p.policyname
            and e.command = p.cmd
        )
    ),
    'the 14 named authenticated policies exist with reviewed commands and no extra policies are attached'
  union all
  select
    'exact authenticated table grants',
    not exists (
      select 1
      from expected_table_grants e
      left join actual_authenticated_grants a on a.table_name = e.table_name
      where coalesce(a.privileges, array[]::text[]) <> e.privileges
    ),
    'designation/report/rights tables have INSERT, SELECT, UPDATE; restricted audit has SELECT only'
  union all
  select
    'anonymous table grants absent',
    not exists (
      select 1
      from expected_tables e
      join pg_catalog.pg_class c on c.relname = e.name
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
      join pg_catalog.pg_roles r on r.oid = x.grantee
      where r.rolname = 'anon'
    ),
    'anon has no explicit table privilege on any Phase 3A table'
  union all
  select
    'PUBLIC table grants absent',
    not exists (
      select 1
      from expected_tables e
      join pg_catalog.pg_class c on c.relname = e.name
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
      where x.grantee = 0
    ),
    'PUBLIC has no table privilege on any Phase 3A table'
  union all
  select
    'authenticated DELETE absent',
    not exists (
      select 1
      from expected_tables e
      where coalesce(
        has_table_privilege('authenticated', to_regclass('public.' || e.name), 'DELETE'),
        false
      )
    ),
    'authenticated cannot delete from any Phase 3A table'
  union all
  select
    'restricted audit is read-only for authenticated',
    coalesce(has_table_privilege('authenticated', to_regclass('public.restricted_workflow_audit_events'), 'SELECT'), false)
      and not coalesce(has_table_privilege('authenticated', to_regclass('public.restricted_workflow_audit_events'), 'INSERT'), false)
      and not coalesce(has_table_privilege('authenticated', to_regclass('public.restricted_workflow_audit_events'), 'UPDATE'), false)
      and not coalesce(has_table_privilege('authenticated', to_regclass('public.restricted_workflow_audit_events'), 'DELETE'), false),
    'authenticated receives SELECT and no direct write privilege on restricted audit events'
  union all
  select
    'function definitions are hardened',
    not exists (
      select 1
      from expected_functions e
      left join pg_catalog.pg_proc p on p.oid = to_regprocedure(e.signature)
      where p.oid is null
         or not p.prosecdef
         or not (coalesce(p.proconfig, array[]::text[]) @> array['search_path=public']::text[])
    ),
    'all eight functions are SECURITY DEFINER with search_path=public'
  union all
  select
    'function execution grants are exact for client roles',
    not exists (
      select 1
      from expected_functions e
      where has_function_privilege('authenticated', to_regprocedure(e.signature), 'EXECUTE') is distinct from e.authenticated_execute
         or coalesce(has_function_privilege('anon', to_regprocedure(e.signature), 'EXECUTE'), false)
         or exists (
           select 1
           from pg_catalog.pg_proc p
           cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
           where p.oid = to_regprocedure(e.signature)
             and x.grantee = 0
             and upper(x.privilege_type) = 'EXECUTE'
         )
    ),
    'authenticated can execute only the designation check and receipt RPC; anon and PUBLIC can execute none'
  union all
  select
    'Phase 3A migration recorded',
    coalesce((select applied from migration_ledger), false),
    'migration version 202607170001 is present in the Supabase migration ledger'
)
select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  details
from checks
order by check_name;
