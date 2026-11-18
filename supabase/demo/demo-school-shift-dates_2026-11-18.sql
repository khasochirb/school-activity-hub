-- One-off, run by hand in the Supabase SQL editor (18-Nov-2026).
-- The demo school's activities were seeded for September–November, so by now
-- "recent attendance" is weeks old, only two activities are upcoming, and the
-- one waiting for approval (the drone day) is already in the past. This moves
-- every activity date in the DEMO school only forward by 35 days (5 weeks, so
-- weekdays stay the same), with the matching registration and check-in times,
-- keeping the story consistent: what happened still happened, just later.
-- Touches only rows of the school flagged is_demo with slug 'demo'.

do $$
declare
  demo_id uuid;
  shift interval := interval '35 days';
begin
  select id into demo_id from public.schools where slug = 'demo' and is_demo;
  if demo_id is null then
    raise notice 'Demo school not found: nothing changed.';
    return;
  end if;

  update public.events
  set starts_at = starts_at + shift,
      ends_at = ends_at + shift,
      submitted_at = submitted_at + shift,
      approved_at = approved_at + shift
  where school_id = demo_id;

  update public.event_attendees
  set registered_at = registered_at + shift,
      checked_in_at = checked_in_at + shift
  where school_id = demo_id;

  update public.attendance_checkins
  set checked_in_at = checked_in_at + shift
  where school_id = demo_id;
end $$;

select e.title, e.status, to_char(e.starts_at at time zone 'Asia/Ulaanbaatar', 'YYYY-MM-DD HH24:MI') as starts
from public.events e join public.schools s on s.id = e.school_id
where s.slug = 'demo'
order by e.starts_at;
