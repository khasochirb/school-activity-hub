# Governance Approval Register

## Use and decision rule

This register is a production and pilot gate, not a list of suggestions. Do not replace `[DECISION REQUIRED]` with an assumption. Each resolved row requires a named owner, named approver, dated decision, evidence location, conditions, and review/expiry date where applicable. Product code and technical tests do not constitute safeguarding, privacy, legal, ethics, or operational approval.

| ID | Required decision | Decision | Accountable owner | Approver | Decision date | Evidence / conditions / review date | Status |
|---|---|---|---|---|---|---|---|
| G-01 | Primary safeguarding lead | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-02 | Backup safeguarding lead | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-03 | Monitored operating hours | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-04 | Safeguarding response target | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-05 | Verified emergency instructions | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Record verified local wording and source; do not enter an unverified number. | `[DECISION REQUIRED]` |
| G-06 | Offline reporting destination | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-07 | Data controller | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-08 | Data processors | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Include contracts, sub-processors, instructions, and locations as verified facts. | `[DECISION REQUIRED]` |
| G-09 | Privacy contact | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-10 | Lawful basis by operational purpose | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-11 | Consent and assent requirements | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Separate operational access from optional research participation. | `[DECISION REQUIRED]` |
| G-12 | Record-specific retention periods | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Include reports, requests, audit, backups, and closeout. | `[DECISION REQUIRED]` |
| G-13 | Deletion exceptions and legal/operational holds | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-14 | Secure export delivery procedure | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Include identity/authority verification and recipient confirmation. | `[DECISION REQUIRED]` |
| G-15 | Data-rights processor eligibility | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Define which school admins may process requests and required training/conflict handling. | `[DECISION REQUIRED]` |
| G-16 | Incident-response owner and backup | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-17 | Research data custodian | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-18 | Research withdrawal procedure | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Include source data, derived datasets, publications, and exceptions. | `[DECISION REQUIRED]` |
| G-19 | Ethics and legal approval or explicit no-research decision | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` |
| G-20 | Production deployment approver | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Approval is for the identified revision/migration/change window only. | `[DECISION REQUIRED]` |
| G-21 | Pilot go-live approver | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | `[DECISION REQUIRED]` | Must review remaining blockers after technical deployment succeeds. | `[DECISION REQUIRED]` |

## Supporting production gates

These are required evidence but do not replace the named governance decisions above:

- Earlier screenshot credential exposure has been assessed and affected credential categories rotated: `[DECISION REQUIRED]`.
- Current backup/PITR capability and recovery ownership have been verified: `[DECISION REQUIRED]`.
- Production and staging projects, credentials, and data are separated: `[DECISION REQUIRED]`.
- Synthetic staging rehearsal, preflight, postflight, and rollback rehearsal are complete: `[DECISION REQUIRED]`.
- Staff training and safeguarding/privacy workflow rehearsal are complete: `[DECISION REQUIRED]`.

## Approval statement

Approval of the technical migration package does not authorize real-student onboarding. Production deployment and pilot go-live are separate decisions. Any unresolved blocker in `GO_NO_GO_CHECKLIST.md` defaults the launch decision to **No-Go** unless an accountable authority records a lawful, safer alternative and its evidence.
