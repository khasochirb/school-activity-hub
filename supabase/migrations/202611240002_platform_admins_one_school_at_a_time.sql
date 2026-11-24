-- Second half of the school switcher (see 202611240001): platform admins no
-- longer read or change every school's events, attendance, event shares and
-- event clubs from the school pages. They work in the school they switched to,
-- as its school admin. The platform console reads with the service role and
-- is not affected.
--
-- Apply together with the deploy that ships the switcher: the code before it
-- still uses these rules for its all-schools views.

drop policy if exists "Platform admins can create attendance checkins" on public.attendance_checkins;
drop policy if exists "Platform admins can view attendance checkins" on public.attendance_checkins;
drop policy if exists "Platform admins can view event clubs" on public.clubs;
drop policy if exists "Platform admins can create event attendees" on public.event_attendees;
drop policy if exists "Platform admins can update event attendees" on public.event_attendees;
drop policy if exists "Platform admins can view event attendees" on public.event_attendees;
drop policy if exists "Platform admins can remove event shares" on public.event_school_shares;
drop policy if exists "Platform admins can view event shares" on public.event_school_shares;
drop policy if exists "Platform admins can create events" on public.events;
drop policy if exists "Platform admins can update all events" on public.events;
drop policy if exists "Platform admins can view all events" on public.events;

notify pgrst, 'reload schema';
