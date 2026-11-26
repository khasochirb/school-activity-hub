-- Demo schools: a school whose students, clubs and activities are made up for
-- showing the platform. Flagged schools stay fully usable, but platform-level
-- counts (the platform dashboard's school totals and the school sites console)
-- leave them out, so pilot figures never mix real and made-up data.

alter table public.schools
  add column if not exists is_demo boolean not null default false;
