# Privacy and Data-Rights Foundation

## Status

- Phase: Phase 3A
- Evidence date: 2026-07-17
- Implementation: Local workflow and migration prepared; not applied
- Controller/legal approval: `[DECISION REQUIRED]`
- Production-student onboarding: Not authorized

This foundation provides authenticated intake and status tracking. It does not establish a lawful basis, legal deadline, identity-verification standard, retention schedule, or approved export-delivery method.

## Decisions that remain open

- Data controller: `[DECISION REQUIRED]`
- Processors and sub-processors: `[DECISION REQUIRED]`
- Operational lawful basis by purpose: `[DECISION REQUIRED]`
- Privacy contact and backup: `[DECISION REQUIRED]`
- Authorized school privacy administrator(s): `[DECISION REQUIRED]`
- Identity and guardian-authority verification procedure: `[DECISION REQUIRED]`
- Response targets or legally required deadlines: `[DECISION REQUIRED]`
- Record-specific retention schedule: `[DECISION REQUIRED]`
- Secure export preparation and delivery method: `[DECISION REQUIRED]`
- Correction authority and source-of-truth procedure: `[DECISION REQUIRED]`
- Deletion/deactivation exceptions for safeguarding, legal, attendance, audit, backup, and research records: `[DECISION REQUIRED]`
- Review/appeal and partnership-closeout procedure: `[DECISION REQUIRED]`
- Hosting, processor, and international-transfer approval: `[DECISION REQUIRED]`

## Operational data explained in the UI

The bilingual `/privacy` page describes these categories at a high level:

- Verified account, school, profile, role, roster, and access records.
- Clubs, events, registration, permissions, attendance, announcements, and reports needed to operate school activities.
- Restricted safeguarding or data-rights records only when the user chooses those workflows.
- Server/provider records needed for security and reliability, subject to the unapproved data map and processor review.

It also states:

- Student data is not sold or used for advertising.
- Platform activity is separate from optional research.
- Clicks are not used to diagnose loneliness, mental health, personality, friendship, or vulnerability.
- Safeguarding confidentiality has approved safety/legal limits.
- A request does not automatically delete records.
- Sensitive exports are not placed in an ordinary database field or emailed automatically.

The privacy contact and controller remain visibly `[DECISION REQUIRED]`; the code does not invent an approved contact.

## Data model

`data_rights_requests` records:

- Authenticated requester and school.
- Request type.
- Optional concise details (maximum 2,000 characters).
- Workflow status.
- Optional concise response summary (maximum 1,000 characters).
- Handling profile and status/acknowledgment/resolution timestamps.

It stores no export payload, attachment, identity document, password, invite code, safeguarding narrative, or automatic email-delivery destination.

Supported request types:

- `access`
- `correction`
- `export`
- `deletion_or_deactivation`
- `research_withdrawal`

Supported statuses:

- `submitted`
- `acknowledged`
- `under_review`
- `action_required`
- `completed`
- `denied_with_reason`
- `withdrawn`

## Authorization model

| Actor | Submit | Read | Withdraw | Process |
|---|---:|---:|---:|---:|
| Active authenticated user | Own school/identity | Own requests only | Own unresolved request | No |
| Teacher | Own request | Own requests only | Own unresolved request | No |
| School admin | Own request | Own plus same-school requests | Own unresolved request | Same-school unresolved requests |
| Platform admin only | Own request through ordinary profile | Own requests only | Own unresolved request | No automatic access |
| Unauthenticated | No | No | No | No |

For this technical phase, active `school_admin` is the narrowest existing role used for same-school processing; teacher access was not broadened and platform authorization does not count. The school must formally name who may use that capability and whether a separate future designation is required: `[DECISION REQUIRED]`.

RLS and immutable-field triggers enforce the matrix. A requester cannot change submitted details or a staff response. A school admin cannot process a request from another school. Terminal requests cannot be reopened through the normal workflow.

## Request handling procedure

1. The requester submits the closest request type and minimum necessary detail.
2. An authorized person independently verifies identity and, where relevant, guardian authority using the approved process `[DECISION REQUIRED]`.
3. The handler identifies systems, copies, exports, audit records, safeguarding/legal constraints, backups, and any research linkage in scope.
4. The handler acknowledges and reviews the request without promising an unapproved deadline.
5. Any correction is reconciled with the authoritative school record and audited.
6. Any export is prepared outside the ordinary response-summary field and delivered through the approved secure method `[DECISION REQUIRED]`.
7. Any deletion/deactivation is reviewed against the approved exceptions and backup process; it is never automatic.
8. A denied request receives a concise safe reason and the approved review/appeal route `[DECISION REQUIRED]`.
9. The handler records completion/denial status and time. Detailed exported data is never placed in logs or workflow metadata.

## Restricted audit

Database triggers record submission, status change, and withdrawal in `restricted_workflow_audit_events`. Same-school school admins may view data-rights audit events; platform audit viewers and other schools may not. Metadata contains only prior/new status.

## Retention and deletion assumption

The workflow records are not automatically deleted. That prevents a request or administrator click from destroying safeguarding, legal, attendance, or audit evidence before review. It does not authorize indefinite retention. D-14 and D-20 must define record-level periods, legal holds, backups, derived data, exports, research copies, deletion evidence, and partnership closeout.

## Required manual tests

Use synthetic accounts and data only:

1. Each role submits and reads only its own request.
2. A School A user cannot read/update a known School B request ID.
3. A teacher cannot browse or process same-school requests.
4. A school admin can process only same-school unresolved requests.
5. Platform-admin status alone adds no request access.
6. A requester can withdraw an unresolved request but cannot edit details, response, handler, or another request.
7. Denial without a reason fails; no response field accepts more than its limit.
8. No request automatically alters profiles, rosters, attendance, audit, Auth, or research records.
9. RSC payloads, server logs, platform audit logs, and browser errors contain no request detail or export.
10. English/Mongolian copy, mobile layout, keyboard access, error states, and theme behavior are reviewed by appropriate users.
