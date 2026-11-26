-- Creating an event failed with "permission denied for function
-- event_poster_path_is_valid" (42501) for every signed-in user.
--
-- 202608130008_add_event_posters revoked EXECUTE on that function from
-- authenticated, but the events_poster_path_valid CHECK constraint calls it,
-- and Postgres checks EXECUTE on every function in a constraint when a row is
-- inserted or updated, even when poster_path is null. So staff could not
-- create or edit events through the app at all.
--
-- The function only checks the shape of a text path (immutable, no table
-- access, not security definer), so allowing signed-in users to run it
-- exposes nothing.

grant execute on function public.event_poster_path_is_valid(text, uuid, uuid) to authenticated;
