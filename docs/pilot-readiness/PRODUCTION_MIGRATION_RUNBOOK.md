# Phase 3 Safety Simplification Deployment Runbook

## Status

- Local implementation only; no production execution is authorized by this document.
- The original Phase 3A migration was previously applied manually to the shared test database.
- Phase 4A and Phase 4B1 are locally implemented and must be present before this correction.
- Production has no confirmed Supabase CLI migration-history relation. Missing history is informational, not proof of migration state.
- The repository still lacks its original production baseline migration. Do not use `supabase db push`, migration repair, or manually created history rows.

## Reviewed artifacts

| Purpose | File |
|---|---|
| Safety-only read-only preflight | `supabase/production-readiness/phase3-safety-simplification-preflight.sql` |
| Append-only correction | `supabase/migrations/202607180003_simplify_safety_reporting.sql` |
| Safety-only read-only postflight | `supabase/production-readiness/phase3-safety-simplification-postflight.sql` |
| Canonical design | `docs/pilot-readiness/SIMPLIFIED_SAFETY_REPORT_WORKFLOW.md` |

The correction removes only the unused digital data-rights workflow after proving that its table and audit branch contain zero rows. It preserves `safeguarding_staff_designations`, `safety_reports`, `restricted_workflow_audit_events`, and all Phase 4A/4B1 event columns. It does not use broad schema drops or uncontrolled `CASCADE`.

## Required approvals

Before any shared-test execution, record:

1. approved target project/environment identity;
2. named approver, operator, and independent verifier;
3. execution date/window and stop authority;
4. SHA-256 checksum of all three reviewed SQL files;
5. confirmation that Phase 3A, Phase 4A, and Phase 4B1 are the intended preceding state;
6. current backup/PITR evidence for the shared test environment;
7. confirmation that no real student or confidential safety data exists in the prototype environment.

Production requires a separate named production approval, fresh backup evidence, staging/shared-test evidence, and pilot governance sign-off. Passing shared-test SQL is not production authorization.

## Exact shared-test SQL procedure

Use the Supabase SQL Editor for the approved shared **test** project. Do not combine these files or run selected fragments.

1. Manually verify the visible Supabase project is the approved shared test environment.
2. Run the complete contents of `phase3-safety-simplification-preflight.sql`.
3. Continue only when `Phase 3 safety simplification preflight decision` is `PASS`.
4. Confirm `data-rights table is empty` and `data-rights audit branch is empty` are both `PASS`.
5. Treat migration-history `NOT AVAILABLE` or `VERSION NOT RECORDED` as informational only. Do not create or repair history.
6. Stop on any `FAIL`, SQL error, nonzero row count, unexpected dependency, uncertain project identity, or `ALREADY PRESENT` result.
7. Independently verify the checksum of `202607180003_simplify_safety_reporting.sql`.
8. Run the complete corrective migration exactly once.
9. Run the complete contents of `phase3-safety-simplification-postflight.sql` immediately afterward.
10. Continue only when `Phase 3 safety simplification postflight decision` and every actual-object check are `PASS`.
11. Record checksums, execution date/time, approver, operator, verifier, project identity, preflight result, migration result, and postflight result. Do not record credentials or confidential row data.

If preflight returns `ALREADY PRESENT`, do not reapply the correction. Run postflight and reconcile the result with the deployment record.

## Preflight interpretation

The preflight is read-only and authoritative from actual schema state. It checks:

- all three retained safety tables and six safety functions exist;
- all ten Phase 4A and Phase 4B1 event columns already exist;
- the old request table, its two functions, three triggers, and five policies exist in the expected shape;
- the request table has zero rows;
- the restricted audit table has zero data-rights rows;
- the only foreign-key dependency is the reviewed restricted-audit reference;
- migration history, when available, is reported separately.

The correction must not run if any data-rights row exists. That stop condition protects data instead of silently deleting it.

## Postflight interpretation

The postflight is read-only and validates actual objects even when migration history is absent. It requires:

- the digital request table, functions, policies, triggers, and audit column are absent;
- all three safety tables remain with RLS enabled;
- anonymous and PUBLIC table/function access is absent;
- authenticated users have no safety-table delete or direct audit-write access;
- authenticated users can execute only `current_user_is_designated_safeguarding_staff(uuid)` and `get_my_safety_report_receipts()`;
- all four trigger functions remain non-callable by authenticated users while internal triggers remain enabled;
- the three-responder eligibility/concurrency guard exists;
- platform-admin status is not part of narrative authorization;
- audit metadata remains status-only;
- all ten Phase 4A/4B1 event columns remain.

## Synthetic smoke tests

After a passing postflight, use synthetic accounts only:

1. An active student submits an own-school report and receives only the seven-field safe receipt.
2. The reporter, another student, ordinary teacher, and non-designated school admin cannot select narratives.
3. An active designated same-school responder can read and move a report from Submitted to Being reviewed to Closed.
4. A designated responder cannot read another school's report.
5. Platform-admin membership alone grants no report or audit access.
6. Three eligible responders can be active; a fourth activation fails; deactivation permits a replacement.
7. Inactive and role-changed designated profiles receive no access.
8. Anonymous access, direct deletes, and direct audit writes fail.
9. Trigger-created audit metadata contains statuses only and no narrative.
10. Registration, attendance, Phase 4A, and Phase 4B1 event behavior still works.

Do not paste report narratives, student details, tokens, invite codes, or credentials into evidence.

## Stop and rollback

- **Before migration:** stop; no rollback is needed.
- **Migration SQL error:** do not retry. Confirm transaction behavior, preserve catalog-only evidence, and obtain database review.
- **Postflight failure:** stop application deployment and restrict the affected safety routes. Do not improvise drops.
- **Application failure:** restore the known-good application deployment; do not remove retained safety tables or erase evidence.
- **Unexpected request rows:** stop. Do not delete or export them through this runbook; escalate to the privacy/data owner for a separate reviewed plan.

No destructive rollback SQL is provided. Any future production action requires its own reviewed deployment record.
