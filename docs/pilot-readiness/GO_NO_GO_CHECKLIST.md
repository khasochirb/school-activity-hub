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
| 1 | Child safeguarding ownership and response | Not started | No named lead/backup, confidential route, restricted workflow, verified referral pathway, or emergency disclaimer/process is documented. | Approved safeguarding plan; named trained lead and backup; referral verification; reporting and escalation drill. |
| 2 | Authorization and school-isolation assurance | Not started | Role/RLS/server checks exist, but no automated permission or cross-school adversarial suite demonstrates them. | Passing role/action/RLS/direct-URL tests across two schools, inactive users, shared events, and platform roles. |
| 3 | Privacy and data governance | Not started | No approved controller/processor record, privacy assessment, notices, rights process, retention schedule, or transfer review exists. | Approved privacy assessment and records; published notices; tested rights and retention procedures. |
| 4 | Operational and research separation | Not started | Operational access, research consent/assent, research custody, small-cell rules, and dataset separation are unresolved. | Approved protocol; separate consent; access boundary; minimization/suppression rules; no research before approval. |
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
| Confidential reporting route approved | Blocker | Not started | Platform or off-platform route, privacy statement, access list, acknowledgement, escalation, and deletion/retention. |
| Restricted safeguarding workflow approved | Blocker | Not started | Triage, evidence, referral, case access, audit, closure, appeal, and school/NDYP boundaries. |
| Emergency and counselling disclaimer approved | Blocker | Not started | Clear bilingual wording and approved local emergency/referral directions. |
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
| Operational versus research consent separated | Blocker | Not started | Declining research cannot remove operational access; separate records, notices, withdrawal, custody, and approvals. |
| Data access/correction/export/deletion procedure tested | Blocker | Not started | Request intake, identity verification, deadlines, exceptions, secure response, execution, and audit evidence. |
| Retention and deletion schedule approved | Blocker | Not started | Record-level periods, legal hold, archive, deletion/anonymization, backups, audit logs, and partnership closeout. |
| Operational/research data separation approved | Blocker | Not started | Access groups, source-to-dataset process, pseudonymization, release approval, storage, deletion, and audit. |
| Small-cell suppression rule approved | Blocker for research | Not started | Threshold, complementary suppression, longitudinal handling, exceptions, and publication review. |
| No unapproved third-party tracking | Blocker | Ready for review | Source/dependency audit found no app analytics or advertising SDK; verify production hosting logs, cookies, and external services. |

## Security, identity, and technical operations

| Requirement | Priority | Status | Evidence/notes required before approval |
|---|---|---|---|
| Verified-school onboarding procedure approved | Blocker | Not started | Institution/admin verification, bootstrap, renewal, suspension, and audit. |
| Account and permission tests passed | Blocker | Not started | Student/teacher/admin/platform/inactive/unauthenticated role matrix; direct actions; two-school isolation. |
| Connected-school event isolation tests passed | Blocker | Not started | Listing, registration, attendance visibility, sharing/unsharing, connection status, and cross-school writes. |
| Invite-code security tests passed | Blocker | Not started | Hashing, one-time use, expiry, revocation, concurrency, cleanup, enumeration, and logs. |
| Staff and platform-admin MFA approved and tested | Blocker | Not started | Enrollment, enforcement, recovery, backup method, lost device, new staff, and removal. |
| Service-role usage review completed | Blocker | Ready for review | Repository places admin client server-side; enumerate all calls and prove preceding authorization and redaction. |
| Monitoring and error reporting operational | Blocker | Not started | Uptime, server errors, job/action failures, alert owner, redaction, severity, dashboards, and escalation. |
| Incident-response procedure approved | Blocker | Not started | Security/privacy/safeguarding/service incidents, response targets, contacts, evidence, notifications, and exercises. |
| Backups and restoration tested | Blocker | Not started | Live settings, scope, encryption, retention, RPO/RTO, owner, restore environment, and dated successful test. |
| Staging and production separated | Blocker | Not started | Separate projects/credentials/data; preview gates; synthetic data; no real students in staging; seed control. |
| Fake production data removed/controlled | Blocker | Not started | Canonical schema includes demo seed data; document migration/seed process and verify production contents. |
| Automated tests and CI gates operational | Blocker | Not started | Unit/integration/E2E/RLS/accessibility/build/lint gates with safe fixtures. |
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

## Sign-off record

- School executive sponsor: `[DECISION REQUIRED]`
- School safeguarding lead: `[DECISION REQUIRED]`
- School privacy/data authority: `[DECISION REQUIRED]`
- NDYP accountable owner: `[DECISION REQUIRED]`
- Technical/security reviewer: `[DECISION REQUIRED]`
- Legal/ethics reviewer where applicable: `[DECISION REQUIRED]`
- Decision and date: `[DECISION REQUIRED]`

