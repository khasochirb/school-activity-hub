# Simplified Safety Report Workflow

## Scope

This phase keeps one small, confidential school safety-report workflow. It does not create a case-management system, emergency service, counselling service, diagnosis tool, risk score, chat, upload area, or narrative export.

The retained routes are:

- `/safety`
- `/safety/report`
- `/safety/my-reports`
- `/safety/reports`
- `/safety/designations`

The digital data-rights request portal is removed. The informational `/privacy` page remains, and privacy requests are handled manually through the participating school's approved process.

## Safety response team

- `safeguarding_staff_designations` is the authorization boundary.
- A school admin may designate at most three active responders for one school.
- A responder must have an active same-school `teacher` or `school_admin` profile.
- A school psychologist uses an existing eligible staff account; no psychologist role is introduced.
- Students, inactive profiles, role-changed profiles, and cross-school profiles are ineligible.
- Inactive or stale designations do not grant report access and do not consume an eligible active slot.
- School admins manage the team but cannot read report narratives unless separately designated.
- Platform-admin membership does not grant report access.

The database serializes activations per school with an advisory transaction lock before counting eligible active responders. This is the authoritative concurrency boundary. The server action repeats the eligibility and eligible-count checks for earlier user feedback.

## Report and review flow

The visible workflow has three states:

1. Submitted
2. Being reviewed
3. Closed

New transitions use stored values `submitted -> in_review -> closed`. The older `acknowledged` and `external_referral` values remain valid in storage so existing rows are not destructively rewritten; the interface groups them under Being reviewed and permits a compatible move to `closed`.

Any active authenticated school user can submit for their own school. A submission trigger resets workflow-controlled fields to `submitted`. Reporters cannot directly select `safety_reports`, update workflow state, delete reports, or see another reporter's data. `get_my_safety_report_receipts()` returns only the reporter's ID, category, status, contact flag, and timestamps.

Only an active designated same-school responder may read a narrative or change its workflow state. No role may delete safety reports through the authenticated API. There is no bulk narrative export.

## Safety notice

The report surfaces state:

- This is not an emergency service.
- Urgent concerns should be reported directly to school staff or the appropriate local emergency process.
- Only the designated school safety response team can review the report.

The Mongolian dictionary carries the equivalent approved meaning. The product does not invent a phone number or named local contact.

## Restricted audit

`restricted_workflow_audit_events` remains append-only for designation and report workflow metadata. Trigger-generated metadata contains only previous/new status. It must never contain narratives, case notes, passwords, invite codes, exports, or service credentials.

Authenticated users cannot directly insert, update, or delete audit events. Report audit visibility follows active same-school designation; designation audit visibility remains school-admin scoped.

## Privacy handling

There is no digital privacy-request intake, tracker, processor, or automated deletion/export promise in this phase. A person must contact the participating school through its approved manual process. The school remains responsible for identity/authority verification, lawful handling, secure delivery, retention exceptions, response timing, and escalation outside this application.

## Deliberate exclusions

- anonymous reporting
- emergency dispatch
- diagnosis, risk scoring, or AI assessment
- chat or comments
- attachments or evidence uploads
- bulk report/narrative export
- parent/guardian workflow
- digital privacy/data-rights requests
- automatic platform-admin access

Any expansion requires a separate reviewed phase with school safeguarding, privacy, security, and operational approval.

## Database deployment artifacts

- Historical foundation: `202607170001_add_safeguarding_privacy_foundations.sql` (do not edit or reapply as a correction)
- Phase 4A: `202607180001_add_event_decision_information.sql`
- Phase 4B1: `202607180002_add_event_practical_details.sql`
- Append-only correction: `202607180003_simplify_safety_reporting.sql`
- Read-only preflight: `phase3-safety-simplification-preflight.sql`
- Read-only postflight: `phase3-safety-simplification-postflight.sql`

The corrective migration aborts if the removed request table or its audit branch contains rows, avoids broad `CASCADE`, preserves all safety and Phase 4 objects, and explicitly resets function privileges.
