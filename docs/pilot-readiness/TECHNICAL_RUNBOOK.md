# School Activity Hub Technical Runbook

## Status

- Phase: Phase 2 technical stabilization
- Status: Draft for operational review
- Production branch: `[DECISION REQUIRED]`
- Platform maintenance owner and backup: `[DECISION REQUIRED]`
- Environment-variable owner: `[DECISION REQUIRED]`
- Monitoring owner and backup: `[DECISION REQUIRED]`
- Backup/restore owner and approver: `[DECISION REQUIRED]`

This runbook contains no credentials. Documentation is not proof that a production deployment, backup, restoration, rollback, or incident drill has succeeded.

## Environment boundaries

1. Production, staging, and local development must use separate Supabase and Vercel projects/credentials.
2. Production student data must never be copied into development, preview, local, screenshots, bug reports, demos, or automated test fixtures.
3. Use synthetic records in all non-production environments.
4. `supabase/schema.sql` contains fake demonstration seed rows. The production migration/seed process must explicitly exclude or remove them and must be reviewed before real-student onboarding.
5. `.env.local` and other `.env*` files remain ignored. Only `.env.example`, containing empty placeholders and non-secret flag defaults, may be tracked.
6. Never paste environment values into issues, documentation, chat, terminal transcripts, screenshots, or logs.

## Deployment process

1. Confirm the intended production branch and authorized releaser: `[DECISION REQUIRED]`.
2. Open a reviewed change with scope, risk, affected roles, schema statement, test evidence, rollback method, and any school/policy approval.
3. Run locally from a clean worktree:
   - `npm.cmd test`
   - `npm.cmd run lint`
   - `npm.cmd exec tsc -- --noEmit`
   - `npm.cmd run build`
   - `git diff --check`
4. Verify no schema, migration, RLS, environment, route, permission, or business-rule change is present unless explicitly approved for that release.
5. Deploy to the isolated preview/staging environment.
6. Execute the relevant rows in `TECHNICAL_TEST_MATRIX.md`, including role, two-school, Mongolian, mobile, and slow-network checks.
7. Obtain the required technical and school approval.
8. Promote the reviewed revision through the approved Vercel workflow. Do not rebuild from an unreviewed local state.
9. Record revision, deployment identifier, operator, date/time, checks, known limitations, and rollback target.
10. Perform post-deploy smoke tests without creating or exposing real student data unnecessarily.

## Seoul region requirement

- Vercel Functions must remain configured for Seoul `icn1`; the repository currently records this in `vercel.json`.
- Confirm the live Vercel deployment uses `icn1` and the live Supabase project region is the approved Seoul region.
- A code/config file is not proof of the provider's live region.
- Any region change requires latency, continuity, contractual, privacy, and international-transfer review before deployment.

## Build verification

Record:

- Git revision and clean/dirty state.
- Node/npm versions.
- Output of test, lint, type-check, build, and diff checks.
- Any warning, whether pre-existing, owner, and disposition.
- Route manifest check for expected protected routes.
- Confirmation that no privileged module appears in a client bundle, using source tests and practical bundle inspection where available.

Do not waive a failed authorization, isolation, secret, schema, or build check for schedule reasons.

## Rollback procedure

1. Stop further promotion and notify the maintenance owner.
2. If the issue affects authorization, privacy, safeguarding, or cross-school isolation, stop affected use immediately and begin the incident process.
3. Identify the last known-good Vercel deployment and its database/schema compatibility.
4. Roll back through the approved Vercel deployment controls. Do not use destructive Git or database commands as an improvised rollback.
5. Verify login, protected routes, role denial, two-school isolation, critical student journey, staff workflow, and safe errors.
6. Record trigger, impact, timeline, operator, deployment IDs, verification, and follow-up owner.
7. If data changed, do not restore a database automatically. Follow the separately approved restoration and incident procedures.

Rollback owner, access, response target, and rehearsal schedule: `[DECISION REQUIRED]`.

## Environment-variable ownership

Categories currently expected:

- Public browser configuration: Supabase URL, public/anonymous key, and public site URL.
- Server-only privileged configuration: Supabase service-role key.
- Server-only diagnostic flag: performance logging.

Rules:

- The service-role key must never use a `NEXT_PUBLIC_` prefix and must never be imported by a client component.
- Browser Supabase code may use only approved public/publishable values.
- Environment access must be least privilege and reviewed at an approved cadence.
- Production values must be configured directly in the authorized provider interface, not committed.
- Preview environments must not automatically inherit production service credentials unless specifically reviewed and protected.

## Secret rotation procedure

1. Treat suspected exposure as a security incident; do not paste the suspected value into the ticket or chat.
2. Identify secret category, affected environment, owner, consumers, and potential exposure window without recording the value.
3. Create/revoke/rotate through the provider's approved interface and least-privilege account.
4. Update only authorized environment stores.
5. redeploy affected server functions/applications and invalidate the old credential.
6. Verify public login and privileged server workflows with synthetic data.
7. Review logs and repository history using approved tooling; do not print candidate values.
8. Record secret name/category, environment, rotation time, owner, affected deployments, verification, and follow-up - never the value.

Rotation frequency and emergency owner: `[DECISION REQUIRED]`.

## Account deactivation

### School user

1. Confirm request authority and target identity through the approved school process.
2. School admin changes the profile status using the existing authorized staff workflow where supported.
3. Verify an existing session cannot read/mutate school data using T-15.
4. Decide whether Supabase Auth access must also be disabled/revoked and who is authorized to do so: `[DECISION REQUIRED]`.
5. Preserve required audit/operational records under the retention policy; do not delete records ad hoc.
6. Record requester, approver, category of reason, time, actions, verification, and review/appeal route without unnecessary sensitive detail.

### Platform administrator

1. Another active platform administrator deactivates the platform-admin status. Self-deactivation is intentionally prevented by the current workflow.
2. Verify platform routes/actions fail while the person's school role remains unchanged.
3. Record the platform audit entry and conduct access review.

Urgent deactivation target and after-hours authority: `[DECISION REQUIRED]`.

## Incident escalation

The safety-report route is not an emergency or counselling service. Urgent concerns must be reported directly to school staff or the appropriate local emergency process. Only the designated same-school safety response team may review reports.

- Do not put safety narratives in ordinary forms, announcements, support tickets, analytics, platform audit logs, or general incident logs.
- Escalate urgent child-safety concerns through the school's existing authorized safeguarding/emergency process rather than waiting for the platform workflow.
- The response team has at most three active eligible staff accounts. A school psychologist uses an existing teacher or school-admin account; no special role exists.
- Platform administrators do not receive report access unless they also hold a separately eligible and designated same-school staff profile.
- Restrict technical incident access to people who need it.
- Preserve evidence without copying full student records into general incident channels.
- If the safe local route is unknown or unavailable, pause affected pilot operation and escalate to the accountable school/NDYP owner.

## Support severity levels

| Level | Examples | Initial action | Target |
|---|---|---|---|
| Severity 1 - Critical | Cross-school exposure, unauthorized privileged access, suspected secret exposure, material child-safety concern, destructive data loss | Stop affected use, preserve evidence, contact security/privacy/safeguarding owners, consider rollback or access restriction | `[DECISION REQUIRED]` |
| Severity 2 - High | Login failure affecting many users, attendance unavailable during an event, exports incorrect, production outage | Assign owner, provide safe workaround if approved, investigate, communicate, prepare rollback | `[DECISION REQUIRED]` |
| Severity 3 - Moderate | Single workflow failure with safe alternative, translation/accessibility defect affecting a journey, delayed query | Triage, record impact, schedule remediation, communicate to coordinator | `[DECISION REQUIRED]` |
| Severity 4 - Low | Cosmetic or non-blocking issue | Add to reviewed backlog and resolve through normal release process | `[DECISION REQUIRED]` |

Support hours, channels, owner, backup, and escalation contacts: `[DECISION REQUIRED]`.

## Backup verification

Do not mark backups verified from repository configuration or provider marketing.

An authorized operator must record:

1. Supabase project/environment and backup feature/configuration category, without credentials.
2. Tables, Auth dependencies, storage if any, audit logs, and other required components in scope.
3. Schedule, retention, encryption/access controls, geographic location, and provider responsibility.
4. Approved recovery point objective (RPO) and recovery time objective (RTO).
5. Last successful backup evidence and owner review date.
6. Interaction with deletion, retention, legal hold, and partnership closeout.

Current verification status: **Not verified from repository**.

## Restoration-test procedure

1. Obtain controller/security approval and an isolated non-production target.
2. Select a dated backup and define expected synthetic validation records.
3. Record start time and authorized operators.
4. Restore using provider-supported procedures without overwriting production.
5. Validate schema, constraints, RLS, Auth/profile relationship, two-school isolation, critical counts, audit records, and application compatibility.
6. Record completion time against RTO and backup age against RPO.
7. Securely delete the restored test copy under the approved process.
8. Document defects, owners, remediation, and reviewer sign-off.

Current restoration-test status: **Not tested/verified by this phase**.

## Monitoring responsibilities

No centralized monitoring package was added in Phase 2. Current repository diagnostics are limited to optional server timing and minimal server-side error categories.

Before launch, assign owners and implement approved monitoring for:

- Availability and authenticated page failures.
- Auth/session failures and unusual privileged-action failures.
- Registration, approval, attendance, export, and platform-audit failures.
- Deployment health and region.
- Backup failures and restoration-test schedule.

Monitoring must redact tokens, cookies, headers, passwords, invite codes, service keys, private student details, and full attendance records. Provider and retention approval is required before adding a vendor.

## Release and change log

Every production release record should include:

- Revision/deployment identifier and date.
- Scope and user-visible changes.
- Roles and schools affected.
- Authorization, privacy, safeguarding, schema/RLS, and region statement.
- Tests and approvals.
- Environment/config categories changed, never values.
- Migration and rollback instructions, if separately approved.
- Known limitations and owners.
- Post-deploy verification and incident link where applicable.

## Prohibited operational shortcuts

- No production data in development, preview, demos, screenshots, or tests.
- No secret values in source, documentation, chat, tickets, logs, or command output.
- No client-side service-role access.
- No authorization based only on navigation visibility.
- No direct production database edits outside an approved, recorded procedure.
- No untested CSP, tracker, analytics SDK, monitoring vendor, schema/RLS change, or region change during this phase.
- No claim that backup, restoration, deployment reliability, accessibility, or cross-school isolation is verified without recorded execution evidence.
