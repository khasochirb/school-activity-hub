# Activity information Phase 4B1

Status: implemented locally; the broader activity-information standard remains incomplete.

## Implemented event fields

| Concept | Storage | Legacy display |
|---|---|---|
| Cost type | Nullable `event_cost_type`: `free`, `paid`, or `variable` | Cost not specified |
| Paid amount | Nullable exact `numeric(12,2)` with explicit `MNT` currency | Cost not specified |
| Cost notes | Nullable, trimmed text up to 500 characters | Omitted when absent |
| Required materials | Nullable, trimmed text up to 1,000 characters | Required materials not specified |
| Expected commitment | Nullable, trimmed text up to 500 characters | Expected commitment not specified |

Existing events keep all Phase 4B1 fields null. They are not silently classified as free.

## Cost representation

PostgreSQL `numeric(12,2)` stores paid amounts exactly; floating-point and PostgreSQL `money` are not used. Paid events require a positive amount and the explicitly supported `MNT` currency. Free events cannot carry an amount or currency. Variable-cost events carry no fixed amount and require a concise explanation. This supports a later free/paid/variable filter without introducing payment processing or student financial records.

## Validation and authorization

The shared server parser trims optional text, converts empty strings to null, checks the three cost states, validates exact positive decimal amounts, accepts only `MNT`, and enforces text limits. Database constraints independently enforce the same cost relationships and trimmed bounded text.

Creation retains the existing school-staff/club-leader authorization. Editing remains limited to same-school teachers and school admins through the existing event RLS and an independent server-action role/school check. Phase 4A responsible-adult validation is unchanged.

## Privacy and equity guardrail

Cost and materials describe the activity. Students are not required to publicly disclose their financial circumstances, disability, or whether they own the required materials.

Phase 4B1 adds no affordability, financial-status, equipment-ownership, payment, financial-aid, or assistance-application data. Materials and commitment are staff-authored event information and do not affect registration or attendance.

## Interfaces

- Event creation and same-school staff editing contain a compact conditional Practical details section.
- Event cards show only a concise cost indicator.
- Quick view and event detail show full cost, materials, commitment, and neutral fallbacks.
- Approval review exposes the information within the existing details disclosure.
- Dashboard event quick view receives the information without lengthening its compact upcoming-event list.
- Month and week cells remain unchanged and compact.

## Deferred

Phase 4B1 does not add transportation, photography, supervision details, cancellation policies, recurrence, completeness scoring, publishing warnings, expiration/review dates, new filters, printable pages, staff-assisted registration, kiosk mode, equipment lending, payment processing, or financial-aid workflows. Club listings are unchanged.

The append-only migration `202607180002_add_event_practical_details.sql` must be applied through the controlled migration process before compatible application code is deployed.
