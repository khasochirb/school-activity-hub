-- One-off, run by hand in the Supabase SQL editor after migration 202611170003.
-- Splits the demo school in two (decision 17-Nov-2026):
--   * the current record (slug neb-2, made-up students, clubs, activities)
--     becomes «Демо сургууль» at /s/demo, flagged is_demo so it never counts;
--   * a fresh, empty record «Нийслэлийн ерөнхий боловсролын 2 дугаар сургууль»
--     takes the address /s/neb-2 for the real pilot;
--   * the 24 site pages (with the text from the school's Google Site) move to it.
-- Nothing is deleted. Safe to run twice: each step checks what is already done.

do $$
declare
  demo_id uuid;
  real_id uuid;
begin
  select id into demo_id from public.schools where slug in ('neb-2', 'demo') and is_demo = false
    and exists (select 1 from public.student_rosters r where r.school_id = schools.id)
    order by created_at limit 1;

  if demo_id is not null then
    update public.schools
    set name = 'Демо сургууль', slug = 'demo', is_demo = true, updated_at = now()
    where id = demo_id;
  else
    select id into demo_id from public.schools where slug = 'demo' and is_demo;
  end if;

  select id into real_id from public.schools where slug = 'neb-2';

  if real_id is null then
    insert into public.schools (name, slug, province, timezone, status)
    values ('Нийслэлийн ерөнхий боловсролын 2 дугаар сургууль', 'neb-2', 'Улаанбаатар', 'Asia/Ulaanbaatar', 'active')
    returning id into real_id;
  end if;

  update public.school_pages
  set school_id = real_id, updated_at = now()
  where school_id = demo_id
    and id in (select md5('sah-demo-page-' || i)::uuid from generate_series(1, 24) as i);
end $$;

select s.slug, s.name, s.is_demo, s.status,
  (select count(*) from public.school_pages p where p.school_id = s.id) as pages,
  (select count(*) from public.student_rosters r where r.school_id = s.id) as rosters,
  (select count(*) from public.clubs c where c.school_id = s.id) as clubs
from public.schools s
where s.slug in ('neb-2', 'demo')
order by s.slug;
