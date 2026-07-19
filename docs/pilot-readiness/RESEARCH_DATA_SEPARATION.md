# Operational and Research Data Separation

## Current rule

School Activity Hub is operational-only in Phase 3A. No research survey, research-consent record, study answer, study cohort, research export, or operational-to-research linkage is implemented in the application.

Operational account use does not imply research participation. Declining or withdrawing from future optional research must not remove platform access, club access, event eligibility, attendance, support, or any school service.

## Decisions required before any research data exists

- Research purpose and approved questions: `[DECISION REQUIRED]`
- Research custodian and backup: `[DECISION REQUIRED]`
- Legal/ethics approval and renewal route: `[DECISION REQUIRED]`
- Consent, guardian consent, and student assent model by age/grade: `[DECISION REQUIRED]`
- Withdrawal scope and effective point: `[DECISION REQUIRED]`
- Operational controller/processors and research controller/processors: `[DECISION REQUIRED]`
- Separately approved survey system and hosting: `[DECISION REQUIRED]`
- Linkage-key custodian and access approvers: `[DECISION REQUIRED]`
- Research access group and release approval: `[DECISION REQUIRED]`
- Small-cell suppression and publication review: `[DECISION REQUIRED]`
- Retention/deletion schedule for survey, linkage, extracts, analysis, and backups: `[DECISION REQUIRED]`

If these decisions and approvals do not exist, no research dataset may be created.

## Required future architecture

Any approved future research workflow must use logical and procedural separation:

1. **Operational user ID** remains in the operational production system for school activities.
2. **Separate random study ID** is generated in the approved research environment and contains no school/user meaning.
3. **Separately stored linkage key** maps operational ID to study ID, encrypted/restricted to a named custodian and never included in ordinary analysis extracts.
4. **Separately approved survey system** stores consent/assent and answers; the operational application does not store survey answers.
5. **Limited evaluation access** grants approved researchers the minimum pseudonymized dataset, not production access or student lookup.
6. **Controlled release record** documents purpose, fields, population, transformations, suppression, recipient, approval, date, version, and deletion date.
7. **Defined deletion schedule** covers linkage keys, raw answers, extracts, working files, results, backups, withdrawals, and partnership closeout.

## Prohibited research uses

- No diagnosis of loneliness, mental health, personality, friendships, or vulnerability.
- No automated risk scoring or sensitive-data AI inference.
- No use of clicks, browsing, registration, club support, or attendance as a proxy for an unapproved psychological trait.
- No public or sponsor access to identifiable student data.
- No small-cell publication or ranking of students, grades, teachers, clubs, or schools.
- No reuse of operational logs as research data without approved purpose, notice, minimization, and consent/lawful route.
- No disadvantage, reduced activity access, or coercive prompt for declining research.

## Phase 3A workflow boundary

The `research_withdrawal` data-rights request type is an intake signal only. It does not prove that research exists, does not alter operational access, and does not automatically delete a future linkage. An authorized privacy owner must verify whether any approved research system/linkage exists and route the request to the approved research custodian.

The UI explicitly explains the operational/research separation. It contains no research opt-in toggle because a toggle without an approved protocol, notice, comprehension process, age rules, custodian, and storage boundary would create false consent.

## Future acceptance gate

Before implementing research features, reviewers must approve and test:

- Bilingual age-appropriate information and consent/assent materials.
- An independent decline/withdraw path with unchanged operational access.
- Study-ID generation and linkage separation.
- Direct production-access prohibition for researchers.
- Field-level minimization and small-cell controls.
- Release logging, access reviews, incident handling, and secure deletion.
- Synthetic end-to-end withdrawal and closeout rehearsal.

Research remains disabled until the decision register and go/no-go checklist contain named approvals and evidence.
