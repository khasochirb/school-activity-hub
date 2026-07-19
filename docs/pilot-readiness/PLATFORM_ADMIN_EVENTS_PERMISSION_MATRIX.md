# Platform-admin Events permission matrix

This phase implements the product policy that an active `platform_admins` user is a global super-administrator, but it applies that policy only to the existing Events domain. Platform authorization is derived from the authenticated user and `platform_admins`; it does not require a `profiles` row or school membership. School-scoped writes require an explicit, validated active school.

| Capability | Student | Teacher | School admin | Platform admin |
| --- | --- | --- | --- | --- |
| View own-school approved events | Yes | Yes | Yes | Yes, for every school |
| View shared connected-school approved events | Existing rules | Existing rules | Existing rules | Yes, as part of global Events access |
| View draft/pending/rejected/canceled events | Club-leader rules only | Own school | Own school | Every school |
| Create event | Club-leader pending flow | Own school, existing rules | Own school, existing rules | Any explicitly selected active school |
| Assign responsible adult | No | Existing self-assignment rule | Active same-school teacher/admin | Active teacher/admin from selected event school |
| Edit safety, decision, and practical event details | No | Own school | Own school | Every school |
| Approve or reject event | No | Own school | Own school | Every school |
| Cancel event | No | Own school | Own school | Every school |
| Manage event sharing | No | Event owner school | Event owner school | Every event; approved school connections still required |
| View attendance and check-in management | Own registration only | Own-school events | Own-school events | Every event |
| Update attendee permission state | No | Own-school events | Own-school events | Every event |
| Browser service-role access | No | No | No | No |

## Authorization boundaries

- UI visibility is not authorization. Event pages and actions derive the actor on the server.
- Platform event queries and mutations use the signed-in Supabase session for the primary Events operation, so scoped RLS policies independently verify `current_user_is_platform_admin()`.
- Ordinary profiles retain their existing school and role checks. No ordinary user receives a cross-school policy.
- Platform event mutations write safe entries to `platform_audit_logs`. Metadata contains identifiers and outcome only, not descriptions, accessibility notes, materials, credentials, tokens, or private staff details.
- Responsible-adult eligibility remains enforced by the Phase 4A database trigger and a server-side active-role/school check.

## Remaining platform-admin audits

Global platform policy is not yet implemented or claimed complete for students, staff, invite codes, clubs, club requests, announcements, reports, school settings, school connections, safety reporting, or attendance capabilities outside the existing event attendance pages. Each module needs a separate data-minimization, server-action, and RLS review before expansion.
