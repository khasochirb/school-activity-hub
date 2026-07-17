-- TEST-ONLY COMPATIBILITY GRANT. Never move this file into supabase/migrations.
-- The historical schema snapshot does not record pre-existing Data API grants.
-- Phase 3A's designation policy must inspect eligible same-school profiles, and
-- the existing profiles RLS policy still limits rows to self and school staff.
grant select on table public.profiles to authenticated;
