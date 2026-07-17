# Safeguarding Workflow Foundation

## Status and limits

- Phase: Phase 3A - safeguarding, privacy, and data-rights foundations
- Evidence date: 2026-07-17
- Implementation status: Local code and migration prepared; migration not applied
- Policy approval status: `[DECISION REQUIRED]`
- Production-student use: Not authorized by this document or the code

School Activity Hub is not continuously monitored and is not an emergency or counselling service. If there is immediate danger, the user interface directs a student to a trusted adult, the school office, or the school's verified local emergency process. It intentionally contains no unverified phone number.

The application provides minimal receipt and workflow metadata. Detailed case notes, investigations, evidence, referrals, and clinical information must remain in the school's separately approved offline/restricted system.

## Required operating decisions

The workflow must not be treated as operational until all of the following are approved, recorded, tested, and communicated:

- Safeguarding lead identity: `[DECISION REQUIRED]`
- Safeguarding backup identity: `[DECISION REQUIRED]`
- Monitored hours and absence coverage: `[DECISION REQUIRED]`
- Definition and target for same-day acknowledgment/response: `[DECISION REQUIRED]`
- Verified local emergency instructions: `[DECISION REQUIRED]`
- Offline/in-person reporting destination and handoff owner: `[DECISION REQUIRED]`
- Referral authority, external destination, and evidence-handling procedure: `[DECISION REQUIRED]`
- Record retention, legal hold, access review, and deletion rules: `[DECISION REQUIRED]`
- Student/guardian notice and confidentiality-limit approval: `[DECISION REQUIRED]`
- Training, rehearsal, and escalation owner: `[DECISION REQUIRED]`

## Existing structures reused

- `profiles.id` remains the authenticated user/profile key and references `auth.users.id`.
- `profiles.school_id`, active profile status, and the existing current-profile SQL helpers remain the school-membership boundary.
- Existing roles remain `student`, `teacher`, and `school_admin`; no safeguarding role was added.
- Existing `events(id, school_id)` and `clubs(id, school_id)` composite keys provide optional, same-school activity context.
- Existing server-only Supabase clients, locale helpers, safe error normalization, page components, and form action patterns are reused.
- The general `platform_audit_logs` stream is not used for report events, preventing platform audit viewers from inferring report content or volume.

## New data model

### `safeguarding_staff_designations`

School-level access designation, not a role. It records the designated staff profile, school, original assigning profile/time, current active/inactive status, latest status actor/time, and deactivation time. The target profile must belong to the same school. Rows are deactivated rather than deleted.

### `safety_reports`

Confidential report record containing:

- Same-school authenticated reporter.
- Optional same-school event or club, never both.
- One broad category.
- Student/staff-provided description of at most 2,000 characters.
- Contact-request flag.
- Restricted status and receipt/closure timestamps.

The table intentionally has no diagnosis, risk score, friendship graph, location stream, upload, media, structured names of other students, or case-note field.

### `restricted_workflow_audit_events`

Separate status-only audit stream for safeguarding designations, report workflow changes, and data-rights status changes. Database triggers write events so ordinary clients cannot forge or edit history. Metadata is limited to previous/new statuses. It contains no report description, request details, response text, exported data, passwords, invite codes, or service credentials.

## Reporter-safe projection

Reporters do not receive direct `SELECT` access to `safety_reports`. The security-definer function `get_my_safety_report_receipts()` returns only:

- Report ID.
- Broad category.
- Workflow status.
- Contact-request flag.
- Submitted, acknowledged, and closed timestamps.

It filters by `auth.uid()` and an active matching school profile. It never returns the description, staff identity, audit history, or another reporter's row.

## Access matrix

| Actor | Submit | Read narrative | Update workflow | Read own safe receipt | Read restricted audit |
|---|---:|---:|---:|---:|---:|
| Active student | Own school/identity | No | No | Own only | No |
| Active teacher, not designated | Own school/identity | No | No | Own only | No |
| Active school admin, not designated | Own school/identity | No | No | Own only | Designation events only |
| Active designated safeguarding staff | Own school/identity | Same-school only | Same-school only | Own only | Same-school report events |
| Platform admin only | Own school/identity through ordinary profile | No automatic access | No | Own only | No |
| Unauthenticated user | No | No | No | No | No |

School admins may technically assign/deactivate same-school safeguarding designations. Whether that authority must be narrower or require a second approver is `[DECISION REQUIRED]`. A school admin gains narrative access only after an active designation exists.

## Workflow and allowed transitions

1. Authenticated reporter submits a report in `submitted` state.
2. Designated staff acknowledge it: `submitted -> acknowledged`.
3. Designated staff may set `acknowledged -> in_review`.
4. Designated staff may record an approved external/offline handoff: `acknowledged|in_review -> external_referral`.
5. Designated staff may close it: `acknowledged|in_review|external_referral -> closed`.
6. Closed records cannot be reopened or deleted through the normal UI in this phase.

Database triggers preserve report identity/content and set acknowledgment, referral, closure, and update timestamps. Direct clients cannot rewrite the narrative or reporter after submission.

## Routes and server actions

| Route | Audience | Purpose |
|---|---|---|
| `/safety` | All active authenticated profiles | Safety disclaimer, confidentiality explanation, offline option, and role-aware entry points |
| `/safety/report` | All active authenticated profiles | Minimal confidential submission |
| `/safety/my-reports` | All active authenticated profiles | Own reporter-safe receipts through the restricted RPC |
| `/safety/reports` | Active designated same-school safeguarding staff | Restricted narrative inbox and workflow actions |
| `/safety/designations` | Active same-school school admins | Assign/deactivate safeguarding designations |

Server actions independently re-check active profile, school, designation, or school-admin status. Client-supplied school IDs are not accepted. Every safety/privacy navigation link uses disabled prefetch.

## Audit events

Recorded in the restricted stream:

- `safeguarding.designation.added`
- `safeguarding.designation.reactivated`
- `safeguarding.designation.deactivated`
- `safety_report.submitted`
- `safety_report.acknowledged`
- `safety_report.status_changed`
- `safety_report.external_referral`
- `safety_report.closed`

Excluded from all audit metadata:

- Narrative/description.
- Names in free text.
- Medical or mental-health information.
- Related event/club title.
- Contact-request value.
- Exported data or case notes.

## Retention assumption

No automatic report deletion is implemented. The technical default is preservation until a controller-approved, record-specific retention and legal-hold schedule exists. This is a conservative implementation assumption, not approval to keep reports indefinitely. Retention schedule and deletion authority remain `[DECISION REQUIRED]`.

## Manual validation gate

Use only synthetic profiles in an isolated non-production project after migration review and authorized local application:

1. Create active users in Schools A and B for student, teacher, school admin, designated staff, and platform admin scenarios.
2. Verify each matrix row through direct PostgREST/Supabase calls and browser routes, not navigation visibility alone.
3. Use known School B report IDs in School A calls; expect no row and no mutation.
4. Verify a non-designated school admin receives no narrative before designation and receives same-school access only after explicit designation.
5. Verify platform-admin status alone does not change report access.
6. Inspect browser RSC payloads and logs for narrative leakage.
7. Inspect `restricted_workflow_audit_events.metadata`; confirm only status keys exist.
8. Deactivate a designation while its session remains active; access must fail immediately.
9. Complete bilingual, mobile, keyboard, dark/light/system, failure, and offline-route comprehension tests.

The drill, response timing, local handoff, emergency instruction, and staff training results require named school sign-off before launch.
