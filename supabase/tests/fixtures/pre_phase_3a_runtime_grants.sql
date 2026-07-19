-- TEST-ONLY COMPATIBILITY GRANT. Never move this file into supabase/migrations.
-- The historical schema snapshot does not record pre-existing Data API grants.
-- Phase 3A's designation policy must inspect eligible same-school profiles, and
-- the existing profiles RLS policy still limits rows to self and school staff.
grant select on table public.profiles to authenticated;

-- Phase 4A exercises the existing event-update policies as authenticated users.
-- The historical schema snapshot also omitted these pre-existing Data API grants,
-- including the shared-event relation read by the event visibility policy.
grant select, update on table public.events to authenticated;
grant select on table public.event_school_shares to authenticated;
