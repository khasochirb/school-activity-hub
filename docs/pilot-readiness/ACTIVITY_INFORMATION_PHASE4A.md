# Activity Information Phase 4A

## Status

Phase 4A implements the first limited event-information batch. It does not complete the broader activity-listing standard in `PHASED_BACKLOG.md`.

Deployment requires applying `202607180001_add_event_decision_information.sql` before deploying the compatible application revision. The migration is additive and was not applied to production during implementation.

## Implemented event fields

| Field | Representation | Legacy behavior |
|---|---|---|
| Responsible adult | Nullable `responsible_staff_id` with a school-aware foreign key to `profiles(id, school_id)` | “Responsible adult not specified” |
| Eligibility and grade information | Nullable, trimmed text up to 500 characters | “Eligibility not specified” |
| Experience level | Nullable `event_experience_level`: `beginner_friendly` or `prior_experience_recommended` | “Experience level not specified” |
| Accessibility information | Nullable, trimmed text up to 2,000 characters | “Accessibility information not provided” |

Eligibility is text rather than numeric minimum/maximum grades because `student_rosters.grade_level` is currently free-form text. Numeric ordering would create an unreliable relationship and is intentionally not introduced.

## Responsible-adult authorization

- The database uses `(responsible_staff_id, school_id)` to prevent cross-school assignment.
- A trigger accepts only an active `teacher` or `school_admin` from the event school when responsibility is assigned.
- Server actions independently re-read school, role, and status instead of trusting browser fields.
- School admins may select active staff in their school.
- Teachers may assign themselves; they may preserve an existing assignment but cannot choose arbitrary staff.
- Club leaders may suggest eligibility, experience, and accessibility information on pending events. Staff assign the responsible adult during review.
- Student-facing views receive staff name and school role only, never email or other private profile information.

## Accessibility privacy guardrail

Accessibility information describes the activity and environment. Students are not required to disclose a disability publicly.

The field is staff-authored event information. Phase 4A adds no student disability field, profile or roster accessibility data, accessibility filter, registration condition, or disclosure prompt.

## Interfaces

- Event creation groups the four fields under “Who can attend and what to expect.”
- Event detail displays full information and provides same-page staff editing.
- List cards show compact experience and eligibility indicators where information exists.
- The shared event quick view shows all four fields, including neutral legacy fallbacks.
- Month and week calendar cells remain compact and expose the new information through the existing quick view.
- The approval queue includes the submitted information for staff review.

## Deferred

Phase 4A does not add cost, materials/equipment, commitment, transportation, photography, supervision details beyond the responsible adult, cancellation details, listing completeness scoring, expiration/refresh ownership, printing, kiosk mode, or new filters. It does not change event approval, registration, attendance, permission, sharing, routing, or school-isolation behavior.
