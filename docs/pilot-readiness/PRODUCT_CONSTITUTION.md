# School Activity Hub Product Constitution

## Purpose

School Activity Hub exists to help students discover and attend school-approved, real-world activities. It should reduce practical barriers between a student and meaningful in-person participation while giving school staff proportionate oversight.

## Bridge-to-in-person principle

Every material product decision should be tested against one question: does this help a student safely discover, prepare for, attend, or return to an approved real-world activity?

The product must not optimize for time in app, page views, repeated checking, popularity, or social status. Digital interaction is a means to participation, not the outcome.

## Prohibited features

The following are outside the product boundary:

- Student direct messaging.
- Public student profiles.
- Public posting feeds.
- Comments or reactions.
- Friend, dating, or relationship matching.
- Public membership lists.
- Follower counts.
- Streaks, points, badges, leaderboards, or competitive engagement mechanics.
- Popularity ranking of students, clubs, or activities.
- Student photo or video uploads during the pilot.
- Advertising, sponsored ranking, or sponsor influence over recommendation order.
- Mental-health diagnosis or counselling claims.
- Automated risk scoring.
- AI recommendations based on sensitive personal data.
- Inferring loneliness, personality, friendship, mental-health status, or vulnerability from browsing or participation behavior.
- Presenting the platform as an emergency or counselling service.
- Treating navigation visibility as authorization.

## Permitted features

Subject to role checks, school isolation, privacy, and safeguarding approval, the product may support:

- Verified school and student access.
- School-managed student rosters and one-time invite codes.
- Approved activity and club discovery.
- Student club ideas and support signals, with final staff decision.
- Event submission, staff approval or rejection, registration, cancellation, permission tracking, and attendance.
- Practical announcements and school operational reporting.
- School administration, school connections, and tightly controlled platform administration.
- Aggregate evaluation designed around real-world participation and repeat attendance.
- Accessible and non-digital alternatives.

## Data-minimization principles

1. Collect only information required for eligibility, safety, participation, operations, or separately approved evaluation.
2. Keep school-owned data scoped to its school and expose the minimum columns required for each role and screen.
3. Do not expose student rosters, memberships, attendance, invite codes, or reports publicly or to connected schools.
4. Store invite codes only in hashed form after one-time display.
5. Do not place passwords, service keys, invite codes, private student details, or full attendance records in logs.
6. Prefer aggregate measures; suppress or combine small groups where re-identification is possible.
7. Define access, correction, export, deletion, retention, archival, and partnership-closeout procedures before real-student onboarding.
8. Keep operational and research data uses logically and procedurally separated.

## Safeguarding principles

- The school retains responsibility for activity approval, supervision, local referral, and emergency response.
- A named safeguarding lead and backup, restricted reporting pathway, response targets, and escalation process must exist before launch.
- Activity listings must include enough information for safe and inclusive decisions, including accessibility, cost, transport, suitability, permissions, risk, and a safeguarding contact where required.
- Safety reports must never become public content or a student-to-student communication channel.
- Access restriction, listing unpublishing, and evidence-preserving review must follow an approved restricted workflow.
- The product must clearly state that it is not an emergency or counselling service and direct urgent concerns to approved local services.
- A non-digital participation route must exist for students who cannot safely or reliably use the application.

## Research boundaries

- Operational access does not imply research participation.
- Research requires a separately approved question, lawful/ethical review route, consent or assent model, data custodian, minimization plan, retention period, and publication plan.
- Declining research must not remove ordinary platform or activity access.
- Product logs must not be repurposed as research data without approval and notice.
- Evaluation should focus on approved activity supply, participation, attendance, repeat attendance, inclusion, and operational quality, not screen engagement.
- Research outputs must use small-cell suppression and avoid singling out students, teachers, clubs, grades, or schools.

## Sponsor boundaries

- Sponsors may not receive identifiable student data, private attendance records, invite codes, or individual-level behavioral data.
- Sponsorship may not influence activity ranking, access, approval, or recommendation visibility.
- Advertising and sponsored placement are prohibited.
- Sponsor reporting must use approved aggregate measures with small-cell protection.
- Funding conditions must not override school safeguarding, privacy, research, accessibility, or pause decisions.

## Authorization rule

Authorization must be enforced by server-side role and school checks and by appropriately scoped database policies. Hiding a link or button is never sufficient. Platform administration must remain separate from school roles and must not silently grant access to private school or student data.

## Change control

Any proposed change must document purpose, affected users, safety/privacy impact, data changes, authorization model, evidence required, rollback approach, and approval owner before implementation.

Any future proposal for chat, public profiles, feeds, comments, reactions, matching, public membership, ranking, sensitive recommendations, mental-health inference, advertising, or student media upload requires a new governance, privacy, security, and safeguarding review. It cannot be approved as a routine feature request or pilot optimization.

Changes that affect consent, data categories, school isolation, retention, safeguarding, or research require explicit NDYP and school approval and, where applicable, legal or ethics approval.

## Review and enforcement

- Document owner: `[DECISION REQUIRED]`.
- School approver: `[DECISION REQUIRED]`.
- NDYP approver: `[DECISION REQUIRED]`.
- Review frequency: `[DECISION REQUIRED]` and after every material incident or scope change.
- A violation of a permanent boundary is a launch blocker and may trigger pilot pause.
