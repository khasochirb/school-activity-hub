-- One-off, run by hand in the Supabase SQL editor (18-Nov-2026).
-- After the split, the demo school («Демо сургууль», /s/demo) kept the made-up
-- students, clubs and activities, and the real School 2 (/s/neb-2) took the 24
-- site pages. For demos, the demo school needs a site too, so this copies
-- School 2's pages into it: same titles, slugs, text and order, new ids, same
-- parent structure. School 2's own pages are not touched. Safe to run twice:
-- pages whose slug already exists in the demo school are skipped.

with real as (
  select id from public.schools where slug = 'neb-2' and not is_demo
), demo as (
  select id from public.schools where slug = 'demo' and is_demo
), src as (
  select p.* from public.school_pages p join real on p.school_id = real.id
), mapped as (
  select src.id as old_id, gen_random_uuid() as new_id from src
  where not exists (
    select 1 from public.school_pages d, demo
    where d.school_id = demo.id and d.slug = src.slug
  )
), parents as (
  insert into public.school_pages (id, school_id, parent_id, slug, title, body, position, status)
  select m.new_id, demo.id, null, s.slug, s.title, s.body, s.position, s.status
  from src s join mapped m on m.old_id = s.id, demo
  where s.parent_id is null
  returning id
)
insert into public.school_pages (id, school_id, parent_id, slug, title, body, position, status)
select m.new_id, demo.id, pm.new_id, s.slug, s.title, s.body, s.position, s.status
from src s
join mapped m on m.old_id = s.id
join mapped pm on pm.old_id = s.parent_id,
demo
where s.parent_id is not null;

select s.slug, count(p.id) as pages, count(p.id) filter (where p.parent_id is null) as sections,
  count(p.id) filter (where length(p.body) > 0) as with_text
from public.schools s left join public.school_pages p on p.school_id = s.id
where s.slug in ('neb-2', 'demo')
group by s.slug order by s.slug;
