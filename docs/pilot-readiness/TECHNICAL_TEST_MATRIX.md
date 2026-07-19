# Phase 2 and Phase 3A Technical Test Matrix

## Purpose and status rules

This matrix records the technical evidence required before real-student onboarding. Use synthetic accounts and data in an isolated non-production Supabase/Vercel environment. Never copy production student data into a test environment.

Statuses:

- **Not run**: no acceptable evidence has been recorded.
- **In progress**: some evidence exists, but the complete test has not passed.
- **Passed**: expected results were observed and evidence was reviewed.
- **Failed**: observed behavior did not meet the expected result.
- **Blocked**: a dependency or missing capability prevents the test.
- **Not applicable**: approved owner documented why the test does not apply.

A source-code inspection or navigation screenshot is not sufficient evidence for a database authorization test.

## Automated repository checks

Command: `npm.cmd test`

| Test | Current result | What it establishes | What it does not establish |
|---|---|---|---|
| Environment-file tracking | Passed 2026-07-17 | Only `.env.example` is tracked; `.env.local` is ignored; example assignments are placeholders/flags. | Whether a secret was ever committed historically or is correctly configured in providers. |
| Server-only module guards | Passed 2026-07-17 | Privileged/request-bound helper modules import `server-only`. | Runtime authorization correctness. |
| Service-role source boundary | Passed 2026-07-17 | The service-role variable is referenced only by the server-only admin module under `src`. | Correct provider permissions, rotation, or every runtime call path. |
| Client import boundary | Passed 2026-07-17 | Current client components do not import privileged helpers or service-role configuration. | Future dynamic/runtime bundling beyond the tested source patterns. |
| Platform-admin guard presence | Passed 2026-07-17 | Platform pages/actions call `requirePlatformAdmin()` and the helper queries `platform_admins`. | Live RLS state or bypass resistance under direct requests. |
| Sensitive action self-check presence | Passed 2026-07-17 | Sensitive server-action modules contain their own identity/platform check pattern. | Correctness of every branch or live database policy. |
| Logged-out protected-layout guard | Passed 2026-07-17 | The protected layout redirects when no authenticated user exists. | Expired-session timing and direct action behavior. |
| Security-header configuration | Passed 2026-07-17 | Four conservative headers are configured and no untested CSP was introduced. | Headers delivered by the deployed production response. |
| Protected prefetch boundary | Passed 2026-07-17 | Automatic protected-link prefetch is disabled; mobile/collapsed content remains conditional. | Browser network behavior on all devices without a trace. |
| Raw error-message source check | Passed 2026-07-17 | Application UI code no longer interpolates `.message` from errors. | Every provider-generated message or future code path. |
| Safeguarding/privacy source boundaries | Passed 2026-07-17 | Static tests confirm separate designation, narrative-safe receipt RPC, restricted audit metadata, server guards, no platform-admin bypass, bilingual foundations, and disabled sensitive-route prefetch. | Live PostgreSQL RLS behavior, trigger execution, operational response, and policy approval. |
| Phase 3D production-readiness artifacts | Ready for review 2026-07-17 | Read-only metadata preflight/postflight SQL handles optional CLI migration history, uses actual objects as authority, and has dependency-free regression checks for absent/partial/complete states. | Intended-production execution, provider identity, backup/PITR, governance approval, migration application, or post-deploy behavior. |
| Phase 4A event decision information | Implemented locally 2026-07-18 | Static tests and the disposable local PostgreSQL suite cover responsible-staff school/role/status validation, nullable legacy data, experience states, text limits, privacy boundaries, and unchanged registration/attendance policy presence. | Production migration execution, real listing quality, school wording approval, and browser usability with pilot users. |
| Phase 4B1 event practical details | Implemented locally 2026-07-18 | Static tests and the disposable local PostgreSQL suite cover free/paid/variable/null cost states, exact positive MNT amounts, invalid combinations/currency, bounded trimmed materials and commitment, privacy separation, and unchanged authorization policies. | Production migration execution, real price/content accuracy, school wording approval, and browser usability with pilot users. |

Evidence required for review: saved command output, commit/revision identifier, reviewer, execution date, Node/npm versions, and any accepted limitation.

## Authentication, role, and tenant tests

| ID | Scenario | Prerequisite | Action | Expected result | Security significance | Status | Evidence required |
|---|---|---|---|---|---|---|---|
| T-01 | Logged-out user | Signed-out browser with cleared Supabase session | Open every protected route, including a deep event and super-admin URL | Redirect to `/login`; no protected HTML, RSC payload, or private data is returned | Confirms authentication is not only navigation visibility | Not run | Browser/network trace and response screenshots for route list |
| T-02 | Logged-out direct action | Capture a harmless synthetic action request, then sign out | Re-submit the request without a session | Action rejects or redirects before mutation; database remains unchanged | Server actions must authorize independently of layouts | Not run | Request/response trace and before/after database evidence |
| T-03 | Student allowed access | Active synthetic student with active roster in School A | Open dashboard, events, clubs, club ideas, announcements, profile, and own check-in | Allowed pages work; only own/school-permitted records appear | Establishes intended student baseline | Not run | Screen/network evidence and synthetic record IDs |
| T-04 | Student denied staff access | Same student | Directly open students, invites, approvals, reports, staff, settings, school network, attendance-management, and platform routes | Redirect/deny; no private payload or mutation control appears | Protects roster, staff, reports, and administration | Not run | Route-by-route results and network response inspection |
| T-05 | Student invokes staff action | Same student; synthetic staff action request | Directly submit create/archive/approve/export/settings/staff action | Server rejects/redirects and no record changes | Hidden buttons are not authorization | Not run | Request trace and database before/after |
| T-06 | Teacher allowed access | Active synthetic teacher in School A | Use students, invites, clubs, events, approvals, attendance, announcements, reports | Intended teacher workflows work only for School A | Confirms teacher operational scope | Not run | Role checklist, request trace, and affected synthetic rows |
| T-07 | Teacher denied school-admin access | Same teacher | Directly open or invoke staff accounts, school settings, school connections, and platform actions | Redirect/deny; no mutation occurs | Protects higher-impact school administration | Not run | Route/action matrix and database before/after |
| T-08 | School admin allowed access | Active synthetic school admin in School A | Exercise all school-admin routes/actions with School A data | Intended workflows succeed; no School B private data appears | Establishes school administrator scope | Not run | Route/action matrix and synthetic records |
| T-09 | School admin denied platform access | School admin not in `platform_admins` | Directly open/invoke all `/super-admin` pages/actions | Redirect/deny; no platform mutation or cross-school list is returned | Proves platform role is separate from school role | Not run | Network/action trace and audit/database evidence |
| T-10 | Active platform admin | Active profile plus active `platform_admins` row | Open platform dashboard/schools/connections/audit/admins and perform reversible synthetic actions | Platform routes work; only documented platform data appears; platform actions are audited | Establishes separate platform authorization | Not run | Page/action results and safe audit rows |
| T-11 | Platform admin without school authority | Platform admin whose school role is not authorized for School B private pages | Directly request School B roster, reports, attendance, invites, and staff actions | Access denied/empty according to school RLS; platform status alone grants no private school access | Prevents silent platform-wide student access | Not run | Direct URL/action trace and database logs without private exports |
| T-12 | Cross-school read attempt | Active equivalent users and records in Schools A and B | As School A user, request known School B roster/profile/club membership/event attendance/report identifiers | No School B private record is returned | Primary child-data tenant boundary | Not run | Supabase/request results for each protected table |
| T-13 | Cross-school mutation attempt | Same two-school fixture | Submit known School B IDs to School A actions and direct Supabase calls | Mutation fails; School B rows remain unchanged | Client IDs and `school_id` must not be trusted | Not run | Before/after rows and action responses |
| T-14 | Connected-school shared event | Approved connection and explicit share from A to B | As B student, list/register; as B staff, attempt owner attendance view; unshare/reject connection and retry | Only approved shared listing/registration works; B staff cannot see A private attendance; access stops when share/connection is invalid | Tests the intentional cross-school exception | Not run | State matrix, traces, and attendance visibility evidence |
| T-15 | Deactivated school profile | Deactivate a synthetic student, teacher, and school admin | Reuse existing session and directly open pages/actions | School data/action access is denied by active-profile/RLS rules; session behavior is documented | Deactivation must take effect without relying on logout | Not run | Route/action/database evidence for each role |
| T-16 | Deactivated platform admin | Set synthetic platform-admin status inactive while session remains valid | Open/invoke platform routes/actions | Platform access is rejected immediately; school role remains unchanged | Tests separate platform lifecycle | Not run | Platform route/action trace and unchanged school permissions |
| T-17 | Expired/revoked session | Expire or revoke a synthetic session | Refresh protected page and submit a previously prepared action | Redirect/reject safely; no mutation; no raw token/auth details appear | Session expiry must fail closed | Not run | Response trace with credentials redacted and database before/after |
| T-18 | Direct report/ICS route | Synthetic users across roles/schools | Request report CSV and event ICS URLs directly | Report export requires authorized staff and own school; ICS includes only an event visible to requester | Route handlers require independent checks | Not run | HTTP status/headers/content review using synthetic data |

## Error, resilience, localization, and device tests

| ID | Scenario | Prerequisite | Action | Expected result | Security significance | Status | Evidence required |
|---|---|---|---|---|---|---|---|
| T-19 | Failed protected data request | Non-production environment where one query can be safely denied/failed | Open each priority route with the controlled failure | Localized safe state or route error appears; no SQL, table details, identifiers, stack, URL secrets, or configuration; retry does not submit a form | Prevents accidental disclosure during failure | Not run | English/Mongolian screenshots and response/log review |
| T-20 | Empty data | Synthetic school with no rows for each feature | Open students, clubs, events, requests, announcements, reports, connections, and audit page as allowed | Only the appropriate empty state appears; no contradictory error state | Distinguishes absence from failure | Not run | Screenshots by role/language/theme |
| T-21 | Not found versus unauthorized | Known missing ID and known unauthorized School B ID | Open event and school detail URLs | Missing resource uses safe not-found behavior; unauthorized resource does not reveal whether private resource exists | Avoids resource enumeration | Not run | Response/status/UI comparison |
| T-22 | English and Mongolian | Locale switch available | Run critical auth, approval, registration, check-in, and error journeys in both languages | Critical labels/errors are translated, legible, and semantically equivalent; database content remains unchanged | Safety instructions must be understood | Not run | Bilingual reviewer checklist and screenshots |
| T-23 | Light and dark themes | Theme switch available | Run priority pages, dialogs, QR, loading, error, and focus states | Text/controls remain readable; QR remains black on white; state is retained after refresh | Prevents inaccessible safety/action states | Not run | Contrast review and screenshots |
| T-24 | Mobile and desktop | Representative iPhone Safari, Android Chrome, and desktop browsers | Navigate, open drawer, forms, modal, tables/cards, and error state | No horizontal overflow; drawer scroll locks body; controls are reachable; Mongolian wraps safely | Mobile is the likely student access path | Not run | Device/browser matrix and videos/screenshots |
| T-25 | Keyboard and screen reader | Desktop keyboard and approved screen reader combinations | Traverse navigation, dialogs, forms, event quick view, errors, and validation | Logical focus, visible outline, labels, Escape/focus restoration, announcements, and no keyboard trap | Accessibility and safe recovery | Not run | WCAG-oriented test notes and defect log |
| T-26 | Slow/unstable network | Browser throttling matching agreed pilot conditions | Load dashboard/events and perform one reversible registration action | Loading state is visible; no request storm; action has pending state; retry does not duplicate; safe failure is recoverable | Low bandwidth and duplicate-mutation resilience | Not run | Network waterfall, request counts, timings, and database result |
| T-27 | Protected prefetch trace | Authenticated desktop and mobile sessions | Idle, hover/focus approved links, open/close drawer and collapsed groups | No automatic `_rsc` storm; only approved intent prefetch occurs; closed/collapsed navigation makes no requests | Protects latency and Supabase/Vercel load | Not run | Browser network recording by role/device |
| T-28 | Security headers in production-like response | Successful local production build or protected preview | Inspect representative public/protected/static responses | Baseline headers present without conflicts; no new CSP; authenticated responses are not publicly cached; hashed static assets retain framework CDN caching | Browser hardening without breaking auth/QR | In progress | Local production `/` response passed on 2026-07-17 with all four headers and `private, no-cache, no-store`; authenticated, static-asset, and deployed-preview captures remain required |

## Attendance and recovery tests

| ID | Scenario | Prerequisite | Action | Expected result | Security significance | Status | Evidence required |
|---|---|---|---|---|---|---|---|
| T-29 | QR attendance | Approved future/current synthetic event with registered and unregistered students | Scan/open link as registered student, retry, then use wrong-school/unregistered/inactive users | First eligible check-in succeeds; duplicate is safe/idempotent; ineligible attempts fail without roster disclosure | Attendance is sensitive and link possession is not authorization | Not run | Synthetic check-in rows, action responses, and UI screenshots |
| T-30 | Manual attendance fallback | Approved event and authorized staff | Attempt documented non-QR fallback during simulated connectivity failure | A protected, auditable fallback should work without duplicate attendance | Required for inclusion and data completeness | Blocked | No complete manual staff workflow exists; Phase 5 implementation and approval required |
| T-31 | Backup verification | Authorized provider owner and documented production/staging boundary | Review configured backup scope/schedule/retention and capture evidence without secrets | Required tables and auth dependencies are covered to approved RPO | Prevents unsupported recovery assumptions | Not run | Provider evidence, owner/date, scope, RPO, encryption/access review |
| T-32 | Restoration test | Approved isolated restore target and authorized operator | Restore a selected backup, validate integrity/authorization, then securely remove test copy | Restore completes within approved RTO; expected records/constraints/RLS/auth dependencies are validated; test copy is deleted | Backups are not useful until restore is proven | Not run | Dated run log, timings, validation, deletion proof, and sign-off |
| T-33 | Deployment rollback | Protected preview and known-good deployment | Deploy a reversible test change, verify, then roll back | Service returns to known-good deployment within target; env values and data remain intact | Reduces school-day outage risk | Not run | Vercel deployment IDs, timings, checks, owner, and incident notes |

## Simplified safety-report authorization tests

Local database evidence recorded 2026-07-18:

- Command: `powershell -ExecutionPolicy Bypass -File supabase/tests/run-phase3c-local.ps1`
- Runtime: Docker Engine `29.6.1`, Supabase CLI `2.109.1`, PostgreSQL `17.6`, database host `127.0.0.1:47022`.
- Baseline: schema DDL was historically recovered from committed `HEAD:supabase/schema.sql` before Phase 3A and stripped before the fake-seed marker. The historical snapshot did not record legacy Data API grants, so the test harness separately reconstructs the existing authenticated `profiles` read grant required by profile RLS/designation checks. That grant is test-only and is not evidence of live production grants.
- Isolation: the fixture and nested Supabase project live under `supabase/tests/`, automatic migrations/seeding are disabled, project-reference markers are rejected, and the disposable stack is removed after the run. No production migration, linked project, remote database, real user, or real student data was used.
- Current suite: the harness applies the historical Phase 3A foundation, Phase 4A, Phase 4B1, the read-only simplification preflight, and corrective migration `202607180003`; then it runs the safety-only postflight, RLS/RPC assertions, both event-phase suites, and semantic catalog comparison.
- Result: safety preflight `PASS`, safety postflight `PASS`, 44 PostgreSQL safety assertions passed, both event-phase database suites passed, and the migrated catalog matched `supabase/schema.sql` for tables, logical columns, constraints, indexes, functions, triggers, RLS, policies, and grants.
- Correction: the final model contains three retained safety tables and no digital data-rights table/functions/policies. Anonymous access, authenticated deletes, direct restricted-audit writes, and platform-admin automatic access remain denied.
- Limitation: the full historical migration chain still lacks its original baseline and has not been proven clean-reset reproducible. Browser journeys and shared-test execution remain separate evidence.

| ID | Scenario | Action | Expected result | Status |
|---|---|---|---|---|
| T-34 | Student submits own-school report | Submit through `/safety/report` and direct authenticated insert | Row is created for verified profile/school in `submitted`; no client-supplied foreign school is accepted | In progress: direct authenticated insert and forced-status reset passed locally 2026-07-18; browser/server-action path not run |
| T-35 | Student reads another report | Use a known same-school and cross-school report ID through table select and receipt RPC | No narrative or other report is returned; receipt RPC returns only caller's safe projection | Passed locally 2026-07-17 |
| T-36 | Student changes report workflow | Directly update own/another report status | RLS rejects; row and audit history remain unchanged | Passed locally 2026-07-17 |
| T-37 | Ordinary teacher browses reports | Open `/safety/reports` and query `safety_reports` before designation | Route redirects to `/safety`; direct select returns no rows | In progress: direct RLS denial passed; route behavior not run |
| T-38 | Non-designated school admin browses reports | Open inbox/query known report before designation | No narrative access; designation-management access alone does not expose reports | In progress: direct narrative/audit denial passed; page path not run |
| T-39 | Designated staff reads own school | Activate designation, keep session, open inbox/query own-school reports | Same-school narratives and allowed workflow updates work | In progress: designation, read, update, deactivation, inactive-profile, and role-change database paths passed; browser path not run |
| T-40 | Designated staff reads another school | Query known School B report from designated School A profile | No row or audit event is returned; no mutation occurs | Passed locally 2026-07-17 |
| T-41 | Platform admin without designation | Add active `platform_admins` row but no safety response-team designation | No narrative, report audit, or inbox access is gained | In progress: direct report access denial is covered locally; page path not run |
| T-42 | Logged-out report submission | Invoke authenticated report action/insert without session | Redirect/reject before mutation; no report/audit row appears | In progress: `anon` table/RPC denial passed; server-action redirect not run |
| T-43 | Reporter safe receipt | Submit then call `get_my_safety_report_receipts()` | Only ID/category/status/contact flag/timestamps return; no description/staff identity/audit | Passed locally 2026-07-17; exact seven output fields verified |
| T-44 | Response-team maximum | Activate three eligible same-school responders, then attempt a fourth | Three are accepted; fourth is rejected by the database and server boundary | Passed locally 2026-07-18; shared-test/browser confirmation pending |
| T-45 | Response-team replacement | Deactivate one responder and activate another | Inactive designation no longer grants access or consumes an eligible active slot; replacement succeeds | Passed locally 2026-07-18; browser confirmation pending |
| T-46 | Client-supplied cross-school IDs | Submit a related School B event or mutate a School B report/designation | Validation, RLS, and composite FKs reject; School B remains unchanged | Passed locally 2026-07-18 for report school/event and designation boundaries |
| T-47 | Restricted audit metadata | Exercise designation and report transitions | Audit rows contain only action/target/status metadata; no narrative, details, password, invite code, or export | Passed locally 2026-07-18; target-scoped reads and direct writes are denied |
| T-48 | English and Mongolian | Run safety/privacy submission, receipt, inbox, and error journeys | Copy is complete, accurate, wraps safely, and does not promise anonymity/emergency monitoring/deadline | Not run |
| T-49 | Mobile navigation and themes | Use student/staff mobile drawer, forms, and restricted pages in light/dark/system | Links are reachable, body/drawer behave, no overflow, focus remains visible | Not run |
| T-50 | Existing workflow regression | Re-run T-03 through T-18 and build checks | Student, teacher, admin, platform, cross-school, invite, event, attendance, export behavior is unchanged | Not run |

### Exact RLS SQL template

Run only in an isolated test project after replacing placeholders with synthetic UUIDs. Keep each actor test in its own transaction so the SQL editor does not retain the JWT context.

```sql
begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '<SYNTHETIC_PROFILE_UUID>',
    'role', 'authenticated'
  )::text,
  true
);

-- Safe receipt test: must return only the declared seven columns and caller rows.
select * from public.get_my_safety_report_receipts();

-- Direct narrative test: expected row count depends on active same-school designation.
select id, school_id, reporter_profile_id, description, status
from public.safety_reports
order by created_at desc;

-- Restricted audit test: access depends on target_type and designation/school-admin rule.
select action, target_type, metadata, created_at
from public.restricted_workflow_audit_events
order by created_at desc;

rollback;
```

For mutation tests, capture target rows before/after, execute the action through the browser and a direct Supabase client using the same synthetic JWT, and preserve only redacted IDs/statuses in evidence. Do not paste report narratives into test records, screenshots, tickets, or logs.

## Test completion rule

Phase 2 technical evidence is not complete until all blocker tests have **Passed** or an accountable owner has recorded an approved safer alternative. T-30, T-31, and T-32 cannot be converted to Passed through source inspection alone.

The simplified Phase 3 workflow is not complete for pilot launch until T-34 through T-50 pass, safeguarding/privacy owners approve the operating procedures, and the corrective migration is independently reviewed and applied to the intended environments through change control.

## Phase 3D production migration verification

These tests are intentionally **Not run** in Phase 3D preparation. They require named approval and authorized human execution in the intended environments.

| ID | Scenario | Action | Expected result | Status |
|---|---|---|---|---|
| T-51 | Production identity and preflight | Two authorized people match the active Supabase project to the change record, then run `phase3a-preflight.sql` | Identity is signed and every automated row is PASS; any failure stops the change | Not run |
| T-52 | Controlled migration application | Apply only the checksummed Phase 3A SQL through the rehearsed atomic SQL Editor procedure | Migration succeeds once; checksum, date, approver, operator/verifier, project identity, and result are recorded without creating/repairing CLI history | Not run |
| T-53 | Production postflight | Run `phase3a-postflight.sql` before application deployment | Tables, constraints, indexes, RLS, exact policies/grants, function hardening, and audit read-only boundary PASS; missing CLI history reports `NOT TRACKED` without weakening checks | Not run |
| T-54 | Synthetic production RLS/RPC smoke | Use approved synthetic accounts across two schools and platform-only membership | Same-school intended paths work; cross-school/platform/anonymous/delete/audit-write paths fail; receipt remains narrative-free | Not run |
| T-55 | Compatible application deployment | Deploy only the approved revision after T-53 and T-54 | New routes load; old workflows remain available; safe failures reveal no payload or catalog details | Not run |
| T-56 | Bilingual/mobile/accessibility smoke | Exercise all safety/privacy journeys in English/Mongolian on mobile/desktop with keyboard checks | Complete understandable copy, no overflow, reachable controls, visible focus, and sensitive links remain non-prefetched | Not run |
| T-57 | Rollback and monitoring readiness | Verify known-good Vercel rollback target, alerts, restricted audit events, and deployment record | Operators can restore the prior app without dropping additive tables; errors/audits are monitored and redacted | Not run |
| T-58 | Optional migration-history regression | Run dependency-free readiness SQL tests and review the scripts against six catalog states | Schema absent, schema-only, table-present, Phase 3A absent, partial, and complete states map to informational history plus PASS/FAIL/ALREADY PRESENT as designed | Passed locally 2026-07-17 through `npm.cmd test`; no production connection |

The source package cannot convert T-51 through T-57 to Passed. Production SQL was not executed, no Vercel deployment occurred, and no production credentials were used during Phase 3D preparation.
