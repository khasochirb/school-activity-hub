# Phase 3A Production Migration Runbook

## Status and scope

- Package status: prepared for independent human governance and technical review.
- Production execution status: **not authorized and not performed**.
- Migration: `supabase/migrations/202607170001_add_safeguarding_privacy_foundations.sql`.
- Preflight: `supabase/production-readiness/phase3a-preflight.sql`.
- Postflight: `supabase/production-readiness/phase3a-postflight.sql`.
- Application revision/deployment: `[DECISION REQUIRED]`.
- Production operator and independent verifier: `[DECISION REQUIRED]`.

This runbook contains no project URL, credential, emergency number, or real student data. The original production baseline migration is not in this repository. The Phase 3C evidence therefore proves the recovered pre-Phase-3A fixture plus this one migration, not a reproducible historical migration chain.

## Reviewed change

The migration is additive. It creates four school-scoped tables, seven explicit indexes, eight restricted functions, workflow triggers, and 14 RLS policies. It does not alter existing profile roles or grant platform administrators access to sensitive records.

Reviewed authenticated table privileges:

| Table | Authenticated privileges | Final row boundary |
|---|---|---|
| `safeguarding_staff_designations` | `SELECT`, `INSERT`, `UPDATE` | School-admin and own-designation RLS policies |
| `safety_reports` | `SELECT`, `INSERT`, `UPDATE` | Own submission plus active same-school safeguarding designation policies |
| `data_rights_requests` | `SELECT`, `INSERT`, `UPDATE` | Own request and same-school school-admin processing policies |
| `restricted_workflow_audit_events` | `SELECT` only | Target-specific safeguarding/admin read policies |

`anon` and `PUBLIC` receive no table privileges. Authenticated users receive no `DELETE` privilege. Authenticated users cannot directly insert, update, or delete restricted audit events. All eight `SECURITY DEFINER` functions set `search_path = public`; `PUBLIC` execution is revoked, and authenticated execution is limited to the designation predicate and narrative-free receipt RPC.

Composite foreign keys from profile, event, and club identifiers to the matching `school_id` enforce tenant consistency in addition to RLS. Platform-admin membership is not referenced by the new policies.

## Compatibility and operational review

| Review item | Phase 3D result |
|---|---|
| Existing application after additive migration | Compatible: no existing table, enum, policy, grant, or role is changed by this migration. |
| New application before required objects exist | Fails safely at the affected workflow: server pages/actions log only safe error categories and return localized load/action errors. This is contingency behavior, not an approved deployment order. |
| Sensitive navigation disclosure | Links expose no confidential count, report, request, or status payload. Inbox visibility is designation-gated and designation management is school-admin-gated. |
| Sensitive prefetch | `/safety`, `/privacy`, and safeguarding-inbox navigation retain disabled intent prefetch; sensitive page links use `prefetch={false}`. |
| Logging and error disclosure | The shared server logger records context plus safe code/name/status only. New actions do not send narratives/details to browser logs, Vercel logs, platform audit logs, or user-facing raw errors. |
| English and Mongolian foundation | Both dictionaries contain the safety/privacy workflows. Full browser comprehension, wrapping, and accessibility review remains T-48/T-56 and is not claimed complete. |
| Direct URL and action authorization | Sensitive pages call active-profile, school-admin, or designated-staff server guards; each mutation repeats its server-side guard and school scoping. |
| Privileged client use | No service-role client was introduced. The new workflows use the request-bound server Supabase client and RLS. |

No verified critical or high-severity defect remained after the authenticated table-grant correction made during Phase 3C. Existing broader pilot blockers and unrun browser/production checks remain open.

## Local validation evidence

On 2026-07-17 the disposable localhost-only harness used PostgreSQL 17.6 at `127.0.0.1:55322`, applied only the recovered pre-Phase-3A fixture plus migration `202607170001`, and passed 63 PostgreSQL RLS/RPC assertions and semantic catalog comparison. The Phase 3D preflight and postflight scripts were also executed read-only against that disposable catalog. The postflight passed every table, constraint, index, RLS, policy, grant, and function check; only the migration-ledger check failed as expected because the harness deliberately disables automatic migrations and applies the SQL directly. The stack and test volumes were then removed.

## Required approvals and evidence

Do not schedule production execution until all of the following are recorded:

1. Every applicable item in `GOVERNANCE_APPROVAL_REGISTER.md` has a named decision, approver, date, and evidence.
2. The production deployment approver and pilot go-live approver are named separately.
3. Any credential visible in an earlier screenshot has been rotated, with category, owner, date, and verification recorded but no value copied into evidence.
4. A current Supabase backup or point-in-time recovery capability is verified by an authorized owner.
5. The approved application revision and known-good rollback deployment are identified.
6. A staging rehearsal has used the same migration and read-only checks.
7. A maintenance/change window, operator, verifier, monitoring owner, and stop authority are named.

## Controlled deployment order

The order is mandatory:

1. Obtain named safeguarding and privacy approvals.
2. Confirm exposed credentials from earlier screenshots were rotated.
3. Confirm a current Supabase backup or point-in-time recovery capability.
4. Announce a controlled maintenance/change window.
5. Run the read-only production preflight.
6. Stop if any preflight expectation fails.
7. Apply only the reviewed Phase 3A migration.
8. Run the read-only postflight.
9. Stop if any postflight expectation fails.
10. Perform synthetic-account database and RPC smoke tests.
11. Deploy the compatible application build.
12. Perform route, authorization, bilingual, mobile, and accessibility smoke tests.
13. Monitor errors and audit behavior.
14. Record the deployment result.

The database migration must precede the application deployment because the new safety and privacy routes query the four new tables and two callable RPCs. The existing application remains compatible with the additive objects, while deploying the new application first would create an avoidable interval in which required relations are unavailable. Current new routes handle unavailable relations with localized safe errors, but that fallback is not a deployment strategy.

## Preflight procedure

1. Open the SQL editor from the intended production Supabase project, using an authorized operator account.
2. Match the visible provider project identity to the approved change record. The SQL cannot safely infer a Supabase project reference from portable PostgreSQL catalog metadata, so this is a mandatory human check.
3. Run only `phase3a-preflight.sql`.
4. Have the independent verifier review the `database_identity` row and every automated row.
5. Save the result with operator, verifier, date/time, approved project identifier, and change record. Do not include credentials or record data.
6. Continue only when every automated result is `PASS` and identity is signed. A `FAIL`, SQL error, unexpected object, or uncertain project identity is a stop condition.

The preflight checks existing columns and constraints, helper functions, required extension and roles/enums, absence of the Phase 3A tables/functions/index names/policies, and absence of migration version `202607170001` from the Supabase migration ledger.

## Migration application

1. Use the approved Supabase migration workflow that records `202607170001` in `supabase_migrations.schema_migrations` and was rehearsed against staging.
2. Apply the reviewed file unchanged. Do not copy selected statements into the SQL editor or mix unrelated migrations.
3. The approved mechanism must execute the migration atomically. If atomic execution has not been demonstrated in staging, stop.
4. Record start/end time and the tool/version. Do not capture connection strings or tokens.
5. If the migration reports an error, stop and follow the matching rollback scenario below.

## Postflight and synthetic smoke tests

1. Run only `phase3a-postflight.sql` immediately after migration.
2. Continue only when every row is `PASS`.
3. Using synthetic accounts in the intended school boundary, verify:
   - an active student can submit an own-school safety report but cannot read a narrative;
   - the receipt RPC exposes only its seven reviewed fields;
   - an ordinary teacher and non-designated admin cannot read narratives;
   - active designated staff can read/update own-school reports and cannot access another school;
   - a user can submit/read/withdraw only their own data-rights request;
   - a same-school school admin can process a request;
   - platform-admin membership alone grants no safety/privacy access;
   - anonymous, direct delete, and direct restricted-audit writes fail;
   - restricted audit metadata contains statuses only, never narratives or request details.
4. Store only redacted IDs/statuses as evidence. Never copy report narratives, request details, exports, tokens, or student data into logs or tickets.

## Application smoke tests

After deploying the approved application revision, use synthetic accounts to verify:

- logged-out and direct-URL denial;
- student, teacher, school-admin, designated-staff, and platform-only boundaries;
- `/safety`, `/safety/report`, `/safety/my-reports`, `/safety/reports`, `/safety/designations`, `/privacy`, `/privacy/requests`, and `/privacy/requests/manage`;
- English and Mongolian copy, wrapping, and safe error states;
- mobile navigation, keyboard focus, form errors, dark/light themes, and disabled sensitive prefetch;
- server logs contain error categories/codes only and no payloads;
- audit rows are created by triggers and contain no narrative fields.

## Monitoring and stop conditions

Monitor application/server errors, failed Supabase requests, RLS denials outside expected negative tests, trigger/audit failures, and route availability. Stop affected use and notify the named incident, privacy, and safeguarding owners for any cross-school exposure, unauthorized narrative access, missing audit event, secret exposure, destructive mutation, or misleading emergency/reporting behavior.

Monitoring owner, duration, alert route, and response target: `[DECISION REQUIRED]`.

## Conservative rollback strategy

No destructive rollback SQL is provided. Prefer application rollback and access restriction over schema deletion.

### Failure before migration

- Stop the change; no database rollback is needed.
- Correct the approval, identity, backup, preflight, or scheduling failure through a new review.
- Do not deploy the dependent application.

### Migration failure inside its transaction

- Confirm the approved migration mechanism rolled back the transaction.
- Do not retry until the exact database error and catalog state have been reviewed.
- Re-run the read-only preflight only after confirming no partial objects or ledger entry remain.
- If partial state exists, escalate to the database owner; do not improvise drops.

### Postflight failure before application deployment

- Do not deploy the new application.
- Keep the prior application live because the migration is additive.
- Restrict or disable access to new workflows if any route is already reachable.
- Preserve catalog evidence and obtain database, safeguarding, and privacy review before corrective SQL.

### Application deployment failure

- Restore the prior known-good Vercel deployment.
- Leave the additive database objects intact.
- Verify prior login and core school workflows, then record the failure and rollback result.
- Do not drop tables merely to match the prior application.

### Security defect after real records exist

- Immediately stop or restrict the affected route/account access and begin the approved incident process.
- Preserve safeguarding narratives, privacy requests, and restricted audit evidence under authorized access.
- Roll back the application or deploy a reviewed access-control fix as directed by incident leadership.
- Never routinely delete or export sensitive rows during rollback.
- Any destructive operation requires named safeguarding/privacy authorization, legal/retention review, a scoped backup, two-person execution, and a recorded verification plan.

## Deployment record

- Change record: `[DECISION REQUIRED]`
- Approved revision and migration hash: `[DECISION REQUIRED]`
- Production project confirmation: `[DECISION REQUIRED]`
- Operator / independent verifier: `[DECISION REQUIRED]`
- Backup/PITR evidence: `[DECISION REQUIRED]`
- Preflight result: `[DECISION REQUIRED]`
- Migration result: `[DECISION REQUIRED]`
- Postflight result: `[DECISION REQUIRED]`
- Synthetic smoke result: `[DECISION REQUIRED]`
- Application deployment and rollback target: `[DECISION REQUIRED]`
- Post-deploy smoke and monitoring result: `[DECISION REQUIRED]`
- Final outcome and approver: `[DECISION REQUIRED]`

## Known technical debt

The repository does not contain its original baseline production migration. The local Phase 3C fixture was historically recovered from `supabase/schema.sql`, and a test-only legacy `profiles` grant was reconstructed. This is not proof of production catalog state and must not be represented as a fully reproducible migration chain. Reconstructing, reviewing, and validating a canonical baseline remains separate technical debt.
