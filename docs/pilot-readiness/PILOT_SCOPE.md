# School Activity Hub Pilot Scope

## Document status

- Phase: Phase 1 - scope confirmation, governance, and repository audit
- Status: Draft for NDYP and school review
- Evidence date: 2026-07-17
- Production-student onboarding: Not authorized by this document

## Pilot mission

School Activity Hub should help students discover and attend school-approved, real-world activities. The product is a bridge to in-person participation. Success is meaningful participation and repeat attendance, not screen time, clicks, page views, or daily active use.

## Target population

- One Mongolian school of approximately 250-300 students.
- Proposed school: Selenge aimag 4th school `[DECISION REQUIRED]`.
- Included grade levels and any age-specific exclusions: `[DECISION REQUIRED]`.
- Participation eligibility, accommodations, and non-digital access rules: `[DECISION REQUIRED]`.

## Expected duration

- Intended duration: one academic year.
- Exact start date, end date, onboarding window, review points, and closeout period: `[DECISION REQUIRED]`.
- The launch date must remain conditional on the go/no-go checklist.

## Primary users

- Students: discover approved activities, join clubs, register for events, submit and support club ideas, review permission information, and confirm attendance.
- Teachers: manage the school roster and invite codes, clubs, events, approvals, attendance, announcements, and operational reports within their school.
- School administrators: perform teacher functions plus staff accounts, school settings, and school-network administration for their school.

## Supporting users

- Platform administrators: manage schools, platform administrators, school connections, and platform audit records. This role is separate from school roles and does not automatically grant access to student-level school data.
- School executive sponsor: `[DECISION REQUIRED]`.
- Daily school coordinator: `[DECISION REQUIRED]`.
- Safeguarding lead and backup: `[DECISION REQUIRED]`.
- NDYP product, support, privacy, security, evaluation, and platform-maintenance owners: `[DECISION REQUIRED]`.
- Parents or guardians: receive approved information and provide permission where required; the repository does not contain a parent account workflow.

## Operational outcomes

1. Eligible students receive verified, school-issued access rather than open self-registration.
2. Students can find accurate, approved activities suitable for their school.
3. Students can register and cancel without staff re-entering ordinary transactions.
4. Staff can manage clubs, event review, capacity, permission status, and attendance.
5. The school can identify participation, attendance, and operational follow-up needs without exposing student data publicly.
6. Students without suitable devices or connectivity have an equivalent route to information, registration, cancellation, and attendance `[DECISION REQUIRED]`.

## Secondary research outcomes

Research is not automatically authorized by operational deployment. Any research use must have a separately approved purpose, lawful/ethical route, consent or assent model, data custodian, minimization plan, small-cell protections, retention schedule, and publication plan.

Possible questions, subject to approval, include:

- Whether students attend at least one approved activity.
- Whether students return for additional activities.
- Whether participation differs by grade or activity category without identifying small groups.
- Whether activity supply, registration barriers, or attendance operations limit participation.

The platform must not infer loneliness, personality, friendships, mental-health status, or risk from browsing or participation behavior.

## Confirmed repository facts

- The application uses Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/RLS, and Vercel configuration.
- School roles are `student`, `teacher`, and `school_admin`; platform authorization uses a separate `platform_admins` table.
- Student accounts are created through roster-linked, one-time invite codes rather than unrestricted public signup.
- School-owned records carry `school_id`, and the schema includes RLS policies and school-scoped server checks.
- The application includes English and Mongolian dictionaries, a locale cookie, dark mode, and mobile navigation.
- Current workflows include students, invite codes, clubs, club ideas/requests, events, approvals, registration, QR attendance, announcements, reports, school settings, school connections, and platform administration.
- Vercel is configured for the Seoul region (`icn1`). Live Supabase region and production deployment behavior cannot be independently verified from this repository.
- The schema file includes fake demonstration seed data and explicitly notes that it must be removed or replaced before production use.
- No automated test suite, backup/restore runbook, privacy notice, safeguarding workflow, or production incident-response runbook was found.

## Assumptions requiring validation

- The school can appoint and train enough staff to approve activities and operate attendance.
- The school can provide an adequate supply of approved, accurate activities.
- Students and staff have sufficient device and connectivity access, or a workable non-digital alternative will be provided.
- Seoul hosting and any international transfer are lawful and acceptable for the school and NDYP.
- Existing Supabase/Vercel projects are production configured, monitored, backed up, and recoverable.
- The repository's role and RLS controls behave as intended in the live environment.
- The school can provide a local safeguarding referral pathway and emergency route outside the platform.

## Unresolved decisions

All items below require explicit approval; none is settled by the codebase:

- Exact school, grades, dates, sponsor, coordinator, safeguarding leads, support owner, and activity inventory owner.
- Data controller, processors, legal/ethics review route, operational lawful basis, research consent/assent model, data custodian, retention, and international-transfer approach.
- Staff MFA, support hours, incident-response targets, backup/restore owner, and production/staging separation.
- Student device model, non-digital participation process, staff-assisted registration process, and attendance fallback.
- Pilot budget, platform/software/data ownership, partnership closeout, and research publication intention.
- Numerical success thresholds and pause/stop thresholds.

See `DECISION_REGISTER.md` for the controlled decision list.

## Out of scope and permanent boundaries

The pilot excludes:

- Student direct messaging.
- Public student profiles or public membership lists.
- Public posting feeds, comments, reactions, followers, or social matching.
- Streaks, points, badges, leaderboards, popularity ranking, or engagement optimization.
- Student photo or video uploads.
- Advertising or sponsored ranking.
- Mental-health diagnosis, automated risk scoring, or sensitive-data-based AI recommendations.
- Interpretation of browsing behavior as loneliness, personality, friendship, or mental-health status.
- Emergency response or counselling through the platform.
- Parent accounts, signatures, document uploads, GPS, face recognition, or student tracking.

Waitlists, automated reminders, and research dashboards are not pilot commitments unless separately approved and added through change control.

## Definition of pilot success

The pilot succeeds only if all of the following are true:

1. No unresolved critical security, privacy, safeguarding, or school-isolation defect exists.
2. Students can access an adequate set of accurate, approved activities through digital and non-digital routes.
3. Registration, cancellation, permission tracking, and attendance are operationally reliable.
4. Staff can run the workflow within agreed capacity and support expectations.
5. Participation and repeat-attendance outcomes can be measured with approved definitions and sufficiently complete data.
6. Student and parent notices, data rights, retention, incident response, and safeguarding pathways operate as approved.
7. Quantitative targets for participation, repeat attendance, data completeness, support response, and staff workload are met: `[DECISION REQUIRED]`.
8. Student benefit and safety evidence outweigh implementation burden and foreseeable harm.

## Definition of pilot failure or pause

Launch must pause, or an active pilot must be suspended, when any of the following occurs:

- A critical authorization or cross-school isolation defect is found.
- A safeguarding report cannot be routed promptly to the assigned school lead and backup.
- Required privacy, consent, legal, or data-transfer approval is absent or withdrawn.
- A material incident exceeds the approved response capability.
- Attendance or registration data is too incomplete or unreliable to support operations or evaluation.
- Activity listings are insufficient, inaccurate, unsafe, or omit essential cost, transport, accessibility, or safeguarding information.
- Students are excluded because an approved non-digital route is unavailable.
- Staff capacity, training, support coverage, backups, restoration, or monitoring are inadequate.
- The product drifts toward prohibited engagement, social, ranking, advertising, or sensitive-inference features.
- Approved pause thresholds are reached: `[DECISION REQUIRED]`.

Pausing does not imply blame. It is a safety control while the responsible owners investigate, communicate, remediate, and decide whether restart is appropriate.
