-- Schools were created with America/Vancouver, the template's default, because
-- neither /setup nor the platform admin form asked for a timezone. The events
-- calendar and news group items by the school's local day, so Mongolian schools
-- saw days split about 16 hours off.
--
-- New schools default to Ulaanbaatar. Existing schools still on Vancouver move
-- to Ulaanbaatar, except the seeded demo school, which is set in Canada.

alter table public.schools
  alter column timezone set default 'Asia/Ulaanbaatar';

update public.schools
set timezone = 'Asia/Ulaanbaatar'
where timezone = 'America/Vancouver'
  and id <> '00000000-0000-4000-8000-000000000001';
