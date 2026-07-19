# Supabase database tests

`run-phase3c-local.ps1` validates the historical Phase 3A foundation, the additive Phase 4A and Phase 4B1 event-information migrations, and the append-only Phase 3 safety simplification in an isolated local Supabase stack.

Safety properties:

- The nested project uses the unique project ID `phase3c-safeguarding-validation` and localhost-only ports in the `4702x` range.
- Its migrations and seed processing are disabled. The runner applies the historical test fixture and the reviewed Phase 3A, Phase 4A, Phase 4B1, and `202607180003` correction explicitly.
- The runner refuses to proceed if a remote project-reference marker exists, the disposable-stack sentinel is missing, or the configured database port is not `47022`.
- It never invokes `supabase link`, `supabase db push`, or a command with `--linked`.
- `fixtures/pre_phase_3a_schema.sql` is a test-only historical snapshot. It is outside `supabase/migrations` and cannot be deployed as a production migration.
- The historical snapshot does not record legacy Data API grants. `fixtures/pre_phase_3a_runtime_grants.sql` reconstructs only the minimum pre-existing authenticated reads/updates needed to exercise the profiles and event RLS policies; those policies remain active. This test-only grant context is not proof of live production grants.
- Phase 4A checks cover same-school active staff assignment, cross-school/student/inactive rejection, nullable legacy events, experience-level states, text bounds, unauthorized updates, and unchanged registration/attendance policy presence.
- Phase 4B1 checks cover exact cost-state constraints, bounded and trimmed materials/commitment text, nullable legacy events, unauthorized updates, privacy separation, and unchanged registration/attendance policy presence.
- The safety-simplification preflight must return `PASS` before the correction runs. The postflight must return `PASS` afterward; both tolerate missing Supabase CLI migration history.
- Safety-only database tests cover authenticated submission, safe receipts, direct-narrative denial, same/cross-school access, non-designated and platform-admin denial, stale designations, the three-person response-team cap and replacement, exact function grants, trigger operation, status-only audit metadata, and removal of digital data-rights objects.
- Semantic catalog comparison proves the migrated result matches `supabase/schema.sql`, including the absence of the removed request table/functions/policies and preservation of both event-information phases.
- No production credentials, environment files, or real records are used.

Run from the repository root in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/run-phase3c-local.ps1
```

The stack is stopped and its test volumes are deleted after the run unless `-KeepStack` is supplied. The full original migration chain remains separate technical debt because the repository does not contain its initial production baseline migration.
