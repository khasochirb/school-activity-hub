# Pilot Go/No-Go Checklist

## Decision rule

Real students must not be onboarded while any **Blocker** is unresolved, any required approval is missing, or any critical security/safeguarding defect remains open. Code completion does not constitute school, legal, ethics, privacy, or operational approval.

Allowed statuses:

- **Not started**
- **In progress**
- **Ready for review**
- **Approved**
- **Blocked**
- **Not applicable**

Only the named approval owner may mark a policy or operational item **Approved**. Evidence links, approval date, approver, and review/expiry date should be added when status changes.

## Ten highest-risk blockers

| Rank | Blocker | Current status | Why it blocks real-student onboarding | Exit evidence |
|---:|---|---|---|---|
| 1 | Child safeguarding ownership and response | In progress | A small local confidential route, exact safety notice, maximum three-person response team, strict RLS, safe receipts, and status-only audit exist. The safety-only preflight, correction, postflight, and 44 database assertions passed in the disposable local harness, but shared-test/production application and the named team, monitored hours, verified referral, response target, training, and approval remain unresolved. | Approved safeguarding plan; named trained response team and backup coverage; controlled shared-test and production change; referral verification; reporting and escalation drill. |
| 2 | Authorization and school-isolation assurance | In progress | The simplified safety boundary passed 44 local PostgreSQL assertions across two synthetic schools, including inactive/role-changed designations, the three-person cap/replacement, exact grants, and platform/anonymous denial. Broader route/action/RLS coverage for existing school workflows, shared events, and direct URLs remains Not run. | Passing role/action/RLS/direct-URL tests across two schools, inactive users, shared events, and platform roles. |
| 3 | Privacy and data governance | In progress | The digital data-rights workflow is removed. `/privacy` is informational and directs requests to the participating school's manual process without automated legal promises. Controller/processors, lawful basis, contacts, approved notices, identity verification, response procedure, retention, secure delivery, deletion exceptions, and transfer review remain unresolved. | Approved privacy assessment and notices; named manual request owner/contact; documented identity, authority, retention, correction/export/deletion, secure delivery, escalation, and closeout procedures. |
| 4 | Operational and research separation | In progress | The UI and governance draft state that operations and research are separate, and no survey/consent data was added; custodian, ethics/legal route, consent/assent, linkage, storage, withdrawal, suppression, and deletion remain unresolved. | Approved protocol; separate consent; access/linkage boundary; minimization/suppression rules; no research before approval. |
| 5 | Incident response and support escalation | Not started | No production incident runbook, severity model, notification path, response targets, support hours, or drill evidence exists. | Approved runbook, contact tree, targets, monitoring alerts, and completed tabletop exercise. |
| 6 | Attendance data quality and fallback | Not started | QR exists, but no complete manual fallback, reconciliation/completeness process, or approved repeat-attendance definition exists. | Tested QR and manual paths; reconciliation/no-show rules; quality dashboard/check; metric dictionary. |
| 7 | Activity supply and listing quality | Not started | Inventory owner and sufficient approved supply are unknown; listings lack accessibility, cost, transport, beginner, and safeguarding-contact information. | Approved inventory threshold; named owner; complete reviewed listings; sampling/refresh procedure. |
| 8 | Accessible and offline participation | Not started | Accessibility testing and equivalent non-digital information/registration/attendance routes are absent. | Accessibility review and user test; printable/offline materials; staff-assisted process; connectivity drill. |
| 9 | Staff capacity, account security, and support | Not started | Training, coverage, staff MFA, workload, support ownership, and backup staffing are unresolved. | Trained roster; MFA/recovery tested; support schedule; workload/capacity sign-off; coordinator and backups assigned. |
| 10 | Evaluation readiness | Not started | Baseline, success thresholds, data definitions, missingness, small-cell suppression, and evaluation approval are absent. | Approved baseline/evaluation protocol, metric dictionary, thresholds, analysis plan, and research approvals where applicable. |

## Governance and partnership

| Requirement | Priority | Status | Evidence/notes required before approval |
|---|---|---|---|
| Signed school-NDYP agreement | Blocker | Not started | Scope, responsibilities, safeguarding, privacy, support, ownership, costs, suspension, closeout, and signatures. |
| Exact school and grades confirmed | Blocker | Not started | Selenge aimag 4th school remains `[DECISION REQUIRED]`; document grades, population, exclusions, and authority. |
| Pilot dates and review gates confirmed | Required | Not started | Start/end, onboarding, holidays, mid-point, pause review, closeout, and decision dates. |
| Executive sponsor assigned | Blocker | Not started | Named authority, delegated decision powers, contact, and backup. |
| Daily school coordinator assigned | Blocker | Not started | Named operator, workload allocation, backup, support route, and escalation authority. |
| Activity inventory owner assigned | Blocker | Not started | Owner for supply, listing completeness, review frequency, cancellations, and corrections. |
| Pilot budget approved | Required | Not started | Hosting, devices/connectivity, training, support, accessibility, evaluation, contingency, and ownership. |
| Software/data ownership and closeout terms approved | Blocker | Not started | IP, controller/custodian roles, exports, deletion, retention, handover, and end-of-partnership verification. |

## Safeguarding

| Requirement | Priority | Status | Evidence/notes required before approval |
|---|---|---|---|
| Safeguarding lead and backup assigned | Blocker | Not started | Names, training, coverage, restricted contacts, conflicts, and absence process. |
| Local referral pathway verified | Blocker | Not started | Current contacts, hours, eligibility, emergency alternatives, and dated verification. |
| Confidential reporting route approved | Blocker | In progress | Local bilingual route, confidential-not-anonymous statement, restricted access, safe receipt, and in-person option are implemented but unapplied/unapproved; acknowledgment, escalation, and retention decisions remain open. |
| Restricted safeguarding workflow approved | Blocker | In progress | Minimal status transitions and restricted audit are implemented; local Phase 3C RLS/RPC/trigger/audit tests passed. Investigation/evidence/referral/appeal procedures, owners, browser tests, production application, and approval remain open. |
| Emergency and counselling disclaimer approved | Blocker | In progress | Bilingual no-monitoring/no-emergency wording exists without invented contacts; verified local emergency/referral wording and school approval remain open. |
| Account restriction and listing-unpublish process approved | Blocker | Not started | Authorized roles, triggers, response time, evidence preservation, review, restoration, and communication. |
| Activity safeguarding information complete | Blocker | Not started | Supervision/contact, risk, permission, accessibility, cost, transport, suitability, and update owner. |
| Safeguarding drill completed | Blocker | Not started | Scenario, participants, response times, gaps, remediation, and sign-off. |

## Privacy, consent, and data governance

| Requirement | Priority | Status | Evidence/notes required before approval |
|---|---|---|---|
| Data controller documented | Blocker | Not started | Legal entity, contact, authority, responsibilities, and approval. |
| Data processors documented | Blocker | Not started | Supabase, Vercel, NDYP/contractors as applicable; contracts, sub-processors, locations, and instructions. |
| Hosting and cross-border transfer reviewed | Blocker | In progress | Repository confirms Seoul Vercel configuration; live Supabase region, legal transfer mechanism, contracts, risks, and school approval remain unverified. |
| Privacy assessment completed | Blocker | Not started | Data map, purposes, lawful basis, risks, mitigations, consultation, residual-risk acceptance, and review date. |
| Student notice approved | Blocker | Not started | Bilingual, age-appropriate purpose, data, access, sharing, retention, rights, contacts, safety, and research distinction. |
| Parent/guardian information approved | Blocker | Not started | Age/grade applicability, permission/consent distinction, channels, language/accessibility, questions, and offline access. |
| Staff notice and acceptable-use guidance approved | Required | Not started | Administrative access, logging, exports, secure devices, incident reporting, retention, and prohibited use. |
| Operational lawful basis approved | Blocker | Not started | Specific purpose and basis, authority, necessity, alternatives, and legal/school approval. |
| Operational versus research consent separated | Blocker | In progress | Draft bilingual notice and architecture document separate operations from future optional research; no survey/consent storage exists. Consent/assent, custody, linkage, withdrawal, ethics/legal approval, and tests remain open. |
| Data access/correction/export/deletion procedure tested | Blocker | In progress | Local authenticated intake/status/audit RLS tests passed across two synthetic schools, including same-school admin processing and cross-school/platform/anonymous denial. There is no automatic deletion/export; identity verification, deadlines, secure delivery, execution, exception handling, browser tests, production application, and approval remain open. |
| Retention and deletion schedule approved | Blocker | Not started | Record-level periods, legal hold, archive, deletion/anonymization, backups, audit logs, and partnership closeout. |
| Operational/research data separation approved | Blocker | Not started | Access groups, source-to-dataset process, pseudonymization, release approval, storage, deletion, and audit. |
| Small-cell suppression rule approved | Blocker for research | Not started | Threshold, complementary suppression, longitudinal handling, exceptions, and publication review. |
| No unapproved third-party tracking | Blocker | Ready for review | Source/dependency audit found no app analytics or advertising SDK; verify production hosting logs, cookies, and external services. |

## Security, identity, and technical operations

| Requirement | Priority | Status | Evidence/notes required before approval |
|---|---|---|---|
| Verified-school onboarding procedure approved | Blocker | Not started | Institution/admin verification, bootstrap, renewal, suspension, and audit. |
| Account and permission tests passed | Blocker | In progress | Dependency-free repository tests pass. The simplified safety boundary also passed 44 local PostgreSQL assertions plus the Phase 4A/4B1 database suites and catalog comparison. Existing student/teacher/admin/platform routes, actions, shared events, and other two-school RLS tests in `TECHNICAL_TEST_MATRIX.md` remain Not run. |
| Connected-school event isolation tests passed | Blocker | Not started | Listing, registration, attendance visibility, sharing/unsharing, connection status, and cross-school writes. |
| Invite-code security tests passed | Blocker | Not started | Hashing, one-time use, expiry, revocation, concurrency, cleanup, enumeration, and logs. |
| Staff and platform-admin MFA approved and tested | Blocker | Not started | Enrollment, enforcement, recovery, backup method, lost device, new staff, and removal. |
| Service-role usage review completed | Blocker | Ready for review | Repository places admin client server-side; enumerate all calls and prove preceding authorization and redaction. |
| Repository secret and client/server boundary checks passed | Blocker | Ready for review | Automated checks confirm only placeholder `.env.example` is tracked, `.env.local` is ignored, the service-role variable is confined to the server-only admin module, and current client modules do not import privileged helpers. Provider configuration and history still require review. |
| Safe baseline response headers verified in deployment | Required | In progress | Repository now configures content-type sniffing prevention, strict referrer handling, same-origin framing protection, and a conservative permissions policy. Production/preview response capture remains Not run; no CSP was introduced. |
| Monitoring and error reporting operational | Blocker | Not started | Uptime, server errors, job/action failures, alert owner, redaction, severity, dashboards, and escalation. |
| Incident-response procedure approved | Blocker | Not started | Security/privacy/safeguarding/service incidents, response targets, contacts, evidence, notifications, and exercises. |
| Backups and restoration tested | Blocker | Not started | Live settings, scope, encryption, retention, RPO/RTO, owner, restore environment, and dated successful test. |
| Staging and production separated | Blocker | Not started | Separate projects/credentials/data; preview gates; synthetic data; no real students in staging; seed control. |
| Fake production data removed/controlled | Blocker | Not started | Canonical schema includes demo seed data; document migration/seed process and verify production contents. |
| Automated tests and CI gates operational | Blocker | In progress | Ten static security-boundary tests run with Node's built-in test runner, and the local-only Phase 3C harness runs 63 real PostgreSQL RLS/RPC assertions plus a semantic schema comparison. Broader integration/E2E/accessibility suites and enforced CI gates remain absent. |
| Vercel production reliability reviewed | Blocker | Not started | Protected deployment, environment mapping, health check, rollback, preview approval, domains/TLS, logs, and owner. |
| Seoul-region configuration verified end to end | Required | In progress | `vercel.json` confirms `icn1`; verify live Vercel/Supabase, latency, transfer approval, and contingency. |

## Activity operations and inclusion

| Requirement | Priority | Status | Evidence/notes required before approval |
|---|---|---|---|
| Adequate approved activity supply | Blocker | Not started | Minimum number, category/grade coverage, schedule coverage, capacity, owner, and approval sampling. |
| Complete activity listing standard | Blocker | Not started | Required title, description, date/time, location, organizer, capacity, accessibility, cost, transport, suitability, risk, permission, contact. |
| Approval workflow and turnaround target | Required | In progress | Code supports approve/reject and timestamps; revision route, reason standard, owner, and target are unresolved. |
| Registration/cancellation policy approved | Required | In progress | Code exists; define deadlines, full events, canceled events, student/staff roles, shared events, and communications. |
| Capacity concurrency tested | Blocker | Not started | Demonstrate no oversubscription or approve transactional remediation. |
| Staff-assisted registration available | Blocker | Not started | Approved authority, UI/action, student confirmation, correction, audit, and training. |
| Manual attendance fallback available | Blocker | Not started | Protected staff flow, duplicate handling, method/reason, correction, reconciliation, and audit. |
| Attendance completeness procedure approved | Blocker | Not started | Expected attendees, no-show/canceled semantics, reconciliation owner/deadline, missingness, and correction. |
| Accessible non-digital route available | Blocker | Not started | Printable information, registration/cancel method, permission process, attendance fallback, privacy, and response time. |
| Accessibility review completed | Blocker | Not started | Keyboard, screen reader, contrast, zoom, mobile, bilingual content, cognitive clarity, and user testing. |
| Low-bandwidth/device test passed | Blocker | Not started | Representative devices/networks, page/action timings, failure/retry behavior, data use, and fallback. |
| Staff training completed | Blocker | Not started | Roster/invites, approvals, privacy, safeguarding, exports, attendance, incidents, MFA, support, and exercises. |
| Support and escalation process working | Blocker | Not started | Hours, channels, response targets, owners/backups, ticket handling, urgent escalation, and pilot rehearsal. |

## Evaluation and launch control

| Requirement | Priority | Status | Evidence/notes required before approval |
|---|---|---|---|
| Pilot success and pause thresholds approved | Blocker | Not started | Participation, repeat attendance, data completeness, supply, support, safety, inclusion, and staff workload thresholds. |
| Baseline/evaluation protocol approved | Blocker | Not started | Questions, measures, denominators, baseline, missingness, analysis, consent, custody, reporting, and review route. |
| Ethical metric dictionary approved | Blocker | Not started | Real-world participation metrics only; no screen-time optimization, popularity, or sensitive inference. |
| Repeat-attendance definition approved | Required | Not started | Cohort, period, event eligibility, canceled/no-show treatment, and data-quality threshold. |
| Approval-turnaround definition approved | Useful | Not started | Start/stop clock, pauses, exclusions, target, aggregation, and non-punitive use. |
| Reports validated against source records | Blocker | Not started | Counts, attendance rate, cross-school registration, inactive/canceled records, exports, and manual samples. |
| Research publication route approved or excluded | Blocker for research | Not started | Intended outputs, authorship, ethics/legal review, suppression, school review, withdrawal, and closeout. |
| Controlled launch rehearsal passed | Blocker | Not started | Synthetic accounts across roles, activity approval, registration, fallback attendance, incident, support, rollback, and closeout. |
| No unresolved critical defect | Blocker | Not started | Signed defect review covering security, safeguarding, privacy, data quality, accessibility, and operations. |
| Final go/no-go meeting completed | Blocker | Not started | Named decision makers, evidence pack, dissent/conditions, decision, date, and next review. |

## Phase 3D controlled production gate

| Gate | Priority | Status | Required evidence |
|---|---|---|---|
| Independent Phase 3A migration review | Blocker | Ready for review | Reviewer confirms additive scope, exact grants/RLS, safe definer functions, composite school FKs, no platform bypass, and application compatibility. |
| Named safeguarding/privacy governance approvals | Blocker | Not started | Completed `GOVERNANCE_APPROVAL_REGISTER.md` with names, dates, evidence, conditions, and review dates. |
| Screenshot-exposed credential rotation | Blocker | Not started | Authorized owner records affected credential categories, rotation date, invalidation, and synthetic verification without recording values. |
| Backup/PITR verified | Blocker | Not started | Provider evidence, scope, owner, date, approved RPO/RTO, and recovery responsibility. |
| Production identity and read-only preflight | Blocker | Not run | Two-person project identity check, prerequisite rows PASS, and final decision PASS. `ALREADY PRESENT` requires postflight/investigation; partial state is a stop. |
| Reviewed migration applied atomically | Blocker | Not run | Change record, exact revision and Phase 3A SQL SHA-256, execution date, approver, operator/verifier, transaction result, and controlled SQL record. Do not require or repair CLI history. |
| Read-only postflight | Blocker | Not run | Final decision and all actual-object checks PASS before application deployment; migration history may be informationally `NOT TRACKED`. |
| Synthetic RLS/RPC smoke test | Blocker | Not run | Same/cross-school, designated/non-designated, platform-only, anonymous, grant, receipt, and audit tests pass without sensitive evidence. |
| Compatible application deployment and smoke test | Blocker | Not run | Route/auth/bilingual/mobile/accessibility/error/audit checks pass for the approved deployment; rollback target remains available. |
| Monitoring and deployment record | Blocker | Not run | Named monitoring owner reviews errors/audit behavior and completes the deployment record. |
| Original baseline migration reconstructed | Technical debt | Blocked | Reviewed canonical historical baseline and clean-reset migration-chain validation. This debt is not resolved by the recovered Phase 3C fixture. |
| Supabase CLI migration-history governance | Technical debt | Blocked | Production has no reported `schema_migrations` relation. Reconcile the historical baseline before any future CLI history adoption; do not use `db push`, repair, or manual history rows for Phase 3A. |

**Current Phase 3D launch result:** **No-Go for production execution and real-student onboarding** until the human approval and execution gates above are completed. The package may proceed to human governance approval review.

## Sign-off record

- School executive sponsor: `[DECISION REQUIRED]`
- School safeguarding lead: `[DECISION REQUIRED]`
- School privacy/data authority: `[DECISION REQUIRED]`
- NDYP accountable owner: `[DECISION REQUIRED]`
- Technical/security reviewer: `[DECISION REQUIRED]`
- Legal/ethics reviewer where applicable: `[DECISION REQUIRED]`
- Decision and date: `[DECISION REQUIRED]`
