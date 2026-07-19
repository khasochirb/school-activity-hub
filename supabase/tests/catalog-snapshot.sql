select record
from (
  select
    'table|' || c.relname
      || '|rls=' || c.relrowsecurity::text
      || '|force_rls=' || c.relforcerowsecurity::text as record
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')

  union all

  select
    'column|' || c.relname || '|'
      || row_number() over (partition by c.oid order by a.attnum)::text
      || '|' || a.attname
      || '|type=' || pg_catalog.format_type(a.atttypid, a.atttypmod)
      || '|notnull=' || a.attnotnull::text
      || '|default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '')
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and a.attnum > 0
    and not a.attisdropped

  union all

  select
    'constraint|' || c.relname || '|' || con.conname || '|'
      || pg_get_constraintdef(con.oid, true)
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'

  union all

  select
    'index|' || tab.relname || '|' || idx.relname || '|'
      || pg_get_indexdef(i.indexrelid)
  from pg_index i
  join pg_class idx on idx.oid = i.indexrelid
  join pg_class tab on tab.oid = i.indrelid
  join pg_namespace n on n.oid = tab.relnamespace
  where n.nspname = 'public'

  union all

  select
    'function|' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      || '|result=' || pg_get_function_result(p.oid)
      || '|security_definer=' || p.prosecdef::text
      || '|volatility=' || p.provolatile::text
      || '|config=' || coalesce(array_to_string(p.proconfig, ','), '')
      || '|body=' || md5(regexp_replace(p.prosrc, '\s+', ' ', 'g'))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not exists (
      select 1
      from pg_depend d
      where d.classid = 'pg_proc'::regclass
        and d.objid = p.oid
        and d.deptype = 'e'
    )

  union all

  select
    'trigger|' || c.relname || '|' || t.tgname || '|'
      || pg_get_triggerdef(t.oid, true)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal

  union all

  select
    'policy|' || schemaname || '|' || tablename || '|' || policyname
      || '|permissive=' || permissive
      || '|roles=' || array_to_string(roles, ',')
      || '|cmd=' || cmd
      || '|qual=' || coalesce(qual, '')
      || '|check=' || coalesce(with_check, '')
  from pg_policies
  where schemaname = 'public'

  union all

  select
    'table_grant|' || table_name || '|' || grantee || '|' || privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')

  union all

  select
    'routine_grant|' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')|'
      || coalesce(grantee.rolname, 'PUBLIC') || '|' || acl.privilege_type
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  left join pg_roles grantee on grantee.oid = acl.grantee
  where n.nspname = 'public'
    and coalesce(grantee.rolname, 'PUBLIC') in ('anon', 'authenticated', 'service_role', 'PUBLIC')
    and not exists (
      select 1
      from pg_depend d
      where d.classid = 'pg_proc'::regclass
        and d.objid = p.oid
        and d.deptype = 'e'
    )
) catalog
order by record;
