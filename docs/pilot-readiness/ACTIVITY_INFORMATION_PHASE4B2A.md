# Phase 4B2A: Event supervision and schedule changes

## Scope

Phase 4B2A adds two optional, staff-managed event information fields:

- `supervision_information`: the supervision arrangements staff have actually confirmed.
- `schedule_change_notice`: a plain-language explanation of a cancellation, postponement, location change, time change, or similarly meaningful update.

Both fields are nullable for backward compatibility, trimmed, and limited to 1,000 characters. Blank form values are normalized to `null`. They do not contain staff contact details, student risk assessments, safeguarding narratives, or notification delivery state.

## Existing cancellation behavior

The existing `public.event_status` enum already contains `canceled`. The existing server action permits authorized event staff to move an approved event to `canceled`, with school scope for teachers and school admins and existing global Events-domain authority for active platform admins. Cancellation does not update `event_attendees`, cancel registrations, or change `attendance_checkins`.

Phase 4B2A does not create another cancellation state and does not change approval meanings. The structured event status, dates, times, and location remain authoritative. A schedule notice explains a change but never changes those values automatically.

## Authorization and privacy

- Existing staff event-creation authority may provide the fields when creating an event. Club leaders retain their pending-event creation flow but cannot submit these staff-authored fields.
- Existing school staff event-management authority may edit the fields for its own school.
- Active platform admins may edit them for an event in a selected valid school through the existing global Events-domain authority.
- Students cannot edit either field.
- The application derives authorization and school scope from the authenticated actor. It does not trust a browser-submitted school or role.
- Student-facing surfaces show supervision text only as entered. They never infer it from the creator or expose staff email, phone, or other private contact information.

## User experience

The create and detail forms use a compact bilingual section. Event cards, dashboards, and month/week calendar cells show only a text schedule-update indicator when a notice exists. Quick view, event detail, and approvals show the full notice; quick view and detail show a neutral supervision fallback when no arrangements were specified. Calendar exports include the notice in the description while preserving structured start, end, and location fields.

## Deployment order

The database migration must be applied before deploying compatible application code because centralized PostgREST selects include both new columns. A missing migration is classified as `schema_update_required` and produces a safe user-facing failure rather than an empty successful state.

Controlled procedure:

1. Record the target project identity, operator, approver, execution time, and SHA-256 checksum of `202607180005_add_event_supervision_schedule_updates.sql`.
2. Run `supabase/production-readiness/phase4b2a-preflight.sql` in the intended Supabase SQL Editor. Continue only on `PASS`; `ALREADY PRESENT` requires verification rather than reapplication, and `FAIL` blocks the change.
3. Apply only `supabase/migrations/202607180005_add_event_supervision_schedule_updates.sql` through the approved change-control process.
4. Run `supabase/production-readiness/phase4b2a-postflight.sql` and require `PASS`.
5. Run approved synthetic PostgREST select/create/edit checks for a teacher, school admin, platform admin, and student denial before deploying the application.
6. Deploy the compatible application revision and perform bilingual create, edit, quick-view, detail, calendar, registration, and attendance regression checks.

The scripts do not depend on Supabase CLI migration history. No migration-history rows should be created or repaired as part of this phase.

## Deferred work

Transportation, photography rules, safeguarding contacts, recurrence, email/push/SMS notifications, completeness scoring, publishing warnings, expiration dates, new filters, print views, assisted registration, kiosk mode, and club information fields remain deferred to later Phase 4B2B-4D decisions. This phase does not complete the broader activity-information program.
