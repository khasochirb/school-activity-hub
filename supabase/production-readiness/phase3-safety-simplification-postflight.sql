-- Phase 3 safety simplification postflight (read-only).
-- Run after 202607180003_simplify_safety_reporting.sql. This script verifies
-- actual objects even when Supabase CLI migration history is unavailable.

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
retained_functions(signature, authenticated_execute) as (
  values
    ('public.current_user_is_designated_safeguarding_staff(uuid)', true),
    ('public.get_my_safety_report_receipts()', true),
    ('public.log_restricted_workflow_event()', false),
    ('public.prepare_safeguarding_designation()', false),
    ('public.prepare_safety_report_submission()', false),
    ('public.protect_safety_report_workflow()', false)
),
checks(check_name, passed, details) as (
  select
    'retained safety tables exist',
    to_regclass('public.safeguarding_staff_designations') is not null
      and to_regclass('public.safety_reports') is not null
      and to_regclass('public.restricted_workflow_audit_events') is not null,
    'all three safety-only tables remain present'
  union all
  select
    'data-rights database objects are absent',
    to_regclass('public.data_rights_requests') is null
      and to_regprocedure('public.prepare_data_rights_request()') is null
      and to_regprocedure('public.protect_data_rights_request_workflow()') is null
      and not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'restricted_workflow_audit_events'
          and column_name = 'data_rights_request_id'
      )
      and not exists (
        select 1
        from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'data_rights_requests'
      ),
    'the table, trigger functions, audit target column, and policies are removed'
  union all
  select
    'RLS remains enabled on safety tables',
    (
      select count(*) = 3 and bool_and(c.relrowsecurity)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'safeguarding_staff_designations',
          'safety_reports',
          'restricted_workflow_audit_events'
        )
    ),
    'each retained safety table has row-level security enabled'
  union all
  select
    'anonymous and PUBLIC table access is absent',
    not has_table_privilege('anon', 'public.safeguarding_staff_designations', 'SELECT,INSERT,UPDATE,DELETE')
      and not has_table_privilege('anon', 'public.safety_reports', 'SELECT,INSERT,UPDATE,DELETE')
      and not has_table_privilege('anon', 'public.restricted_workflow_audit_events', 'SELECT,INSERT,UPDATE,DELETE')
      and not exists (
        select 1
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
        where n.nspname = 'public'
          and c.relname in (
            'safeguarding_staff_designations',
            'safety_reports',
            'restricted_workflow_audit_events'
          )
          and acl.grantee = 0
          and upper(acl.privilege_type) in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      ),
    'client-anonymous and PUBLIC roles have no retained safety-table privileges'
  union all
  select
    'authenticated table grants exclude destructive access',
    has_table_privilege('authenticated', 'public.safeguarding_staff_designations', 'SELECT,INSERT,UPDATE')
      and has_table_privilege('authenticated', 'public.safety_reports', 'SELECT,INSERT,UPDATE')
      and has_table_privilege('authenticated', 'public.restricted_workflow_audit_events', 'SELECT')
      and not has_table_privilege('authenticated', 'public.safeguarding_staff_designations', 'DELETE')
      and not has_table_privilege('authenticated', 'public.safety_reports', 'DELETE')
      and not has_table_privilege('authenticated', 'public.restricted_workflow_audit_events', 'INSERT,UPDATE,DELETE'),
    'RLS-backed required operations remain while DELETE and direct audit writes remain unavailable'
  union all
  select
    'exact retained safety policies exist',
    (
      select count(*) = 9
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename in (
          'safeguarding_staff_designations',
          'safety_reports',
          'restricted_workflow_audit_events'
        )
    )
    and not exists (
      select 1
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename in (
          'safeguarding_staff_designations',
          'safety_reports',
          'restricted_workflow_audit_events'
        )
        and policyname not in (
          'School admins can view safeguarding designations',
          'Designated staff can view their own designation',
          'School admins can assign safeguarding staff',
          'School admins can update safeguarding designations',
          'Active users can submit their own safety reports',
          'Designated safeguarding staff can read same-school reports',
          'Designated safeguarding staff can update same-school reports',
          'Safeguarding staff can view report audit events',
          'School admins can view designation audit events'
        )
    ),
    'only the reviewed school-scoped safety policies remain'
  union all
  select
    'function execution grants are exact',
    not exists (
      select 1
      from retained_functions f
      where to_regprocedure(f.signature) is null
         or has_function_privilege('authenticated', f.signature, 'EXECUTE') is distinct from f.authenticated_execute
         or has_function_privilege('anon', f.signature, 'EXECUTE')
         or exists (
           select 1
           from pg_catalog.pg_proc p
           cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
           where p.oid = to_regprocedure(f.signature)
             and acl.grantee = 0
             and upper(acl.privilege_type) = 'EXECUTE'
         )
    ),
    'authenticated can execute only the designation check and safe-receipt RPC; anon and PUBLIC execute none'
  union all
  select
    'internal safety triggers remain enabled',
    (
      select count(*) = 5
      from pg_catalog.pg_trigger t
      where t.tgrelid in (
        to_regclass('public.safeguarding_staff_designations'),
        to_regclass('public.safety_reports')
      )
        and not t.tgisinternal
        and t.tgenabled <> 'D'
        and t.tgname in (
          'prepare_safeguarding_designation',
          'audit_safeguarding_designation',
          'prepare_safety_report_submission',
          'protect_safety_report_workflow',
          'audit_safety_report'
        )
    ),
    'submission, workflow-protection, designation, and status-only audit triggers remain enabled'
  union all
  select
    'three-responder database guard is installed',
    pg_get_functiondef(to_regprocedure('public.prepare_safeguarding_designation()'))
      like '%SAFETY_RESPONSE_TEAM_LIMIT_REACHED%'
      and pg_get_functiondef(to_regprocedure('public.prepare_safeguarding_designation()'))
        like '%pg_advisory_xact_lock%'
      and pg_get_functiondef(to_regprocedure('public.prepare_safeguarding_designation()'))
        like '%active_responder_count >= 3%'
      and pg_get_functiondef(to_regprocedure('public.prepare_safeguarding_designation()'))
        like '%p.status = ''active''%'
      and pg_get_functiondef(to_regprocedure('public.prepare_safeguarding_designation()'))
        like '%p.role in (''school_admin'', ''teacher'')%',
    'the trigger validates eligible staff and serializes per-school activation before enforcing the cap'
  union all
  select
    'platform admin receives no automatic narrative access',
    pg_get_functiondef(to_regprocedure('public.current_user_is_designated_safeguarding_staff(uuid)'))
      not ilike '%platform_admin%'
      and not exists (
        select 1
        from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'safety_reports'
          and coalesce(qual, '') ilike '%platform_admin%'
      ),
    'narrative access depends only on active same-school teacher/admin designation'
  union all
  select
    'audit metadata remains status-only',
    not exists (
      select 1
      from public.restricted_workflow_audit_events
      where metadata ?| array[
        'description',
        'details',
        'narrative',
        'password',
        'invite_code',
        'export'
      ]
    ),
    'existing restricted audit rows contain no narratives, credentials, or exports'
  union all
  select
    'Phase 4A and Phase 4B1 event columns remain',
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
    'the safety correction does not remove either event-information phase'
),
decision as (
  select case when bool_and(passed) then 'PASS' else 'FAIL' end as result
  from checks
),
result_rows(sort_order, check_name, result, details) as (
  select
    10,
    'Phase 3 safety simplification postflight decision',
    result,
    case result
      when 'PASS' then 'The database matches the reviewed safety-only Phase 3 design.'
      else 'Stop application deployment: one or more safety, privilege, or preservation checks failed.'
    end
  from decision
  union all
  select
    20,
    'migration history',
    case
      when not table_exists then 'NOT TRACKED'
      when version_recorded then 'RECORDED'
      else 'NOT RECORDED'
    end,
    'Migration history is informational; actual postflight object checks are authoritative.'
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
