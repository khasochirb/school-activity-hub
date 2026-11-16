-- Demo pages for the demo school's public site (/s/<slug>): the page structure of
-- the pilot school's own Google Site, titles only, read on 16-Nov-2026. Bodies
-- are left empty for the school to write. Run by hand in the Supabase SQL editor
-- after migration 202611160001. Safe to run twice. demo-school-cleanup.sql
-- removes these rows.

do $$
declare
  demo_school uuid;
  demo_admin uuid;
begin
  select p.school_id, p.id into demo_school, demo_admin
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = 'admin@demo-school.test'
  limit 1;

  if demo_school is null then
    raise notice 'Demo admin account not found: nothing inserted.';
    return;
  end if;

  insert into public.school_pages (id, school_id, parent_id, slug, title, position, status, created_by_profile_id)
  values
    (md5('sah-demo-page-1')::uuid, demo_school, null, 'bidnii-tukhai', 'Бидний тухай', 1, 'published', demo_admin),
    (md5('sah-demo-page-2')::uuid, demo_school, md5('sah-demo-page-1')::uuid, 'khamt-olon', 'Хамт олон', 1, 'published', demo_admin),
    (md5('sah-demo-page-3')::uuid, demo_school, md5('sah-demo-page-1')::uuid, 'tuukhen-tovchoon', 'Түүхэн товчоон', 2, 'published', demo_admin),
    (md5('sah-demo-page-4')::uuid, demo_school, md5('sah-demo-page-1')::uuid, 'surgalt-erkhlekh-tusgai-zuvshuurul', 'Сургалт эрхлэх тусгай зөвшөөрөл', 3, 'published', demo_admin),
    (md5('sah-demo-page-5')::uuid, demo_school, null, 'surguuliin-menejment', 'Сургуулийн менежмент', 2, 'published', demo_admin),
    (md5('sah-demo-page-6')::uuid, demo_school, md5('sah-demo-page-5')::uuid, 'baga-bolovsrol', 'Бага боловсрол', 1, 'published', demo_admin),
    (md5('sah-demo-page-7')::uuid, demo_school, md5('sah-demo-page-5')::uuid, 'suuri-bolovsrol', 'Суурь боловсрол', 2, 'published', demo_admin),
    (md5('sah-demo-page-8')::uuid, demo_school, md5('sah-demo-page-5')::uuid, 'akhlakh-bolovsrol', 'Ахлах боловсрол', 3, 'published', demo_admin),
    (md5('sah-demo-page-9')::uuid, demo_school, null, 'medee-medeelel', 'Мэдээ мэдээлэл', 3, 'published', demo_admin),
    (md5('sah-demo-page-10')::uuid, demo_school, md5('sah-demo-page-9')::uuid, 'surguuliin-butets', 'Сургуулийн бүтэц', 1, 'published', demo_admin),
    (md5('sah-demo-page-11')::uuid, demo_school, md5('sah-demo-page-9')::uuid, 'uil-ajillagaany-tuluvluguu', 'Үйл ажиллагааны төлөвлөгөө', 2, 'published', demo_admin),
    (md5('sah-demo-page-12')::uuid, demo_school, md5('sah-demo-page-9')::uuid, 'khamragdsan-tusult-ajil', 'Хамрагдсан төсөлт ажил', 3, 'published', demo_admin),
    (md5('sah-demo-page-13')::uuid, demo_school, md5('sah-demo-page-9')::uuid, 'yos-zuin-khoroo', 'Ёс зүйн хороо', 4, 'published', demo_admin),
    (md5('sah-demo-page-14')::uuid, demo_school, md5('sah-demo-page-9')::uuid, 'khuukhed-khamgaallyn-uil-ajillagaa', 'Хүүхэд хамгааллын үйл ажиллагаа', 5, 'published', demo_admin),
    (md5('sah-demo-page-15')::uuid, demo_school, null, 'bidnii-bakharkhal', 'Бидний бахархал', 4, 'published', demo_admin),
    (md5('sah-demo-page-16')::uuid, demo_school, md5('sah-demo-page-15')::uuid, 'olimpiad', 'Олимпиад', 1, 'published', demo_admin),
    (md5('sah-demo-page-17')::uuid, demo_school, md5('sah-demo-page-15')::uuid, 'sport', 'Спорт', 2, 'published', demo_admin),
    (md5('sah-demo-page-18')::uuid, demo_school, md5('sah-demo-page-15')::uuid, 'ony-ontslokh-suragchid', 'Оны онцлох сурагчид', 3, 'published', demo_admin),
    (md5('sah-demo-page-19')::uuid, demo_school, md5('sah-demo-page-15')::uuid, 'urlag', 'Урлаг', 4, 'published', demo_admin),
    (md5('sah-demo-page-20')::uuid, demo_school, null, 'khuvaari', 'Хуваарь', 5, 'published', demo_admin),
    (md5('sah-demo-page-21')::uuid, demo_school, md5('sah-demo-page-20')::uuid, 'baga-angi', 'Бага анги', 1, 'published', demo_admin),
    (md5('sah-demo-page-22')::uuid, demo_school, md5('sah-demo-page-20')::uuid, 'dund-angi', 'Дунд анги', 2, 'published', demo_admin),
    (md5('sah-demo-page-23')::uuid, demo_school, md5('sah-demo-page-20')::uuid, 'akhlakh-angi', 'Ахлах анги', 3, 'published', demo_admin),
    (md5('sah-demo-page-24')::uuid, demo_school, md5('sah-demo-page-20')::uuid, 'angi-kabinet', 'Анги кабинет', 4, 'published', demo_admin)
  on conflict do nothing;

  raise notice 'Demo site pages added for school %', demo_school;
end;
$$;
