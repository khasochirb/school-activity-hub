-- Demo data for the demo school only. Run by hand in the Supabase SQL editor.
--
-- * The school is found through the demo admin account (admin@demo-school.test);
--   if that account is missing, nothing is inserted.
-- * Every row has a fixed id made from md5('sah-demo-…'), and every demo student
--   has a student_number starting with DEMO-. supabase/demo/demo-school-cleanup.sql
--   deletes exactly these rows.
-- * Safe to run twice: rows that already exist are skipped.
-- * Real students are not touched. The demo student account
--   (student@demo-school.test) is registered for two upcoming events, so its home
--   screen shows the next-activity card.

do $$
declare
  demo_school uuid;
  demo_admin uuid;
  demo_student_roster uuid;
  club_ids uuid[];
  club_count int;
  first_names text[] := array['Болд', 'Сараа', 'Тэмүүлэн', 'Анужин', 'Билгүүн', 'Номин', 'Хулан', 'Мөнх-Эрдэнэ', 'Энхжин', 'Тэнгис', 'Марал', 'Ганбат'];
  last_names text[] := array['Батболд', 'Дорж', 'Ганзориг', 'Пүрэв', 'Цэрэн', 'Бат-Очир', 'Энхбаяр', 'Сүхбаатар', 'Отгон', 'Нямдорж', 'Галсан', 'Мөнхбат'];
  -- The live demo school's classes; the demo student account is in 11Б.
  homerooms text[] := array['11Б', '11Б', '11Б', '10А', '10А', '10А', '11Б', '9А', '9А', '10А', '11Б', '9А'];
  event_titles text[] := array['Шатрын аварга шалгаруулах тэмцээн', 'Сагсан бөмбөгийн нээлттэй бэлтгэл', 'Робот бүтээх өдөрлөг', 'Морин хуурын тоглолт', 'Мэтгэлцээний сургалт', 'Урлагийн үзэсгэлэн', 'Байгаль хамгаалах өдөрлөг', 'Шинэ гишүүдийн уулзалт'];
  event_categories text[] := array['Academic', 'Sports', 'Academic', 'Arts', 'Academic', 'Arts', 'Culture', 'Culture'];
  event_places text[] := array['Номын сан', 'Спорт заал', 'Технологийн танхим', 'Хурлын танхим', '204 тоот', 'Үүдний танхим', 'Сургуулийн талбай', '101 тоот'];
  day_offsets int[] := array[1, 2, 4, 6, 8, 11, 14, -5];
  i int;
  roster_id uuid;
  event_id uuid;
  starts timestamptz;
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

  select sr.id into demo_student_roster
  from auth.users u
  join public.student_rosters sr on sr.profile_id = u.id and sr.school_id = demo_school
  where lower(u.email) = 'student@demo-school.test'
  limit 1;

  select array_agg(c.id order by c.name) into club_ids
  from public.clubs c
  where c.school_id = demo_school and c.status = 'active';
  club_count := coalesce(array_length(club_ids, 1), 0);

  -- 12 demo students in three classes (11Б, 10А, 9А).
  for i in 1..12 loop
    insert into public.student_rosters (id, school_id, student_number, first_name, last_name, grade_level, homeroom, status, created_by_profile_id)
    values (
      md5('sah-demo-roster-' || i)::uuid, demo_school, 'DEMO-' || lpad(i::text, 3, '0'),
      first_names[i], last_names[i], left(homerooms[i], length(homerooms[i]) - 1), homerooms[i], 'active', demo_admin
    )
    on conflict do nothing;
  end loop;

  -- Each demo student joins two clubs, so every club has members.
  if club_count > 0 then
    for i in 1..12 loop
      roster_id := md5('sah-demo-roster-' || i)::uuid;
      insert into public.club_memberships (id, school_id, club_id, student_roster_id, role, status, created_by_profile_id)
      values
        (md5('sah-demo-member-' || i || '-a')::uuid, demo_school, club_ids[1 + (i % club_count)], roster_id,
         (case when i <= club_count then 'leader' else 'member' end)::public.club_member_role, 'active', demo_admin),
        (md5('sah-demo-member-' || i || '-b')::uuid, demo_school, club_ids[1 + ((i + 2) % club_count)], roster_id,
         'member'::public.club_member_role, 'active', demo_admin)
      on conflict do nothing;
    end loop;
  end if;

  -- Seven upcoming approved events and one completed one, at 16:00 Ulaanbaatar time.
  for i in 1..8 loop
    event_id := md5('sah-demo-event-' || i)::uuid;
    starts := (date_trunc('day', now() at time zone 'Asia/Ulaanbaatar') + make_interval(days => day_offsets[i], hours => 16))
      at time zone 'Asia/Ulaanbaatar';
    insert into public.events (id, school_id, club_id, title, description, category, location, starts_at, ends_at, capacity, status, created_by_profile_id, approved_by_profile_id, cost_type)
    values (
      event_id, demo_school,
      case when club_count > 0 then club_ids[1 + (i % club_count)] else null end,
      event_titles[i], event_titles[i] || '. Бүх сурагч оролцох боломжтой.',
      event_categories[i], event_places[i], starts, starts + interval '2 hours',
      case when i % 3 = 0 then 20 else null end,
      (case when day_offsets[i] < 0 then 'completed' else 'approved' end)::public.event_status,
      demo_admin, demo_admin, 'free'
    )
    on conflict do nothing;

    -- Demo students register, so cards show attendee counts.
    insert into public.event_attendees (id, school_id, event_id, attendee_school_id, student_roster_id, status)
    select md5('sah-demo-attendee-' || i || '-' || r)::uuid, demo_school, event_id, demo_school,
           md5('sah-demo-roster-' || r)::uuid, 'registered'
    from generate_series(1, 3 + (i % 5)) as r
    on conflict do nothing;
  end loop;

  -- The demo student account is registered for the next two events.
  if demo_student_roster is not null then
    insert into public.event_attendees (id, school_id, event_id, attendee_school_id, student_roster_id, status)
    values
      (md5('sah-demo-attendee-student-1')::uuid, demo_school, md5('sah-demo-event-1')::uuid, demo_school, demo_student_roster, 'registered'),
      (md5('sah-demo-attendee-student-2')::uuid, demo_school, md5('sah-demo-event-2')::uuid, demo_school, demo_student_roster, 'registered')
    on conflict do nothing;
  end if;

  insert into public.announcements (id, school_id, title, body, created_by_profile_id)
  values
    (md5('sah-demo-announcement-1')::uuid, demo_school, '11-р сарын 23-ны клубийн үзэсгэлэн', 'Бүх клуб үүдний танхимд үйл ажиллагаагаа танилцуулна. Шинэ клуб сонирхож буй сурагчид ирээрэй.', demo_admin),
    (md5('sah-demo-announcement-2')::uuid, demo_school, 'Шинэ клубийн санаа', 'Клуб байгуулах санаагаа «Клубын санаа» хэсэгт оруулна уу.', demo_admin),
    (md5('sah-demo-announcement-3')::uuid, demo_school, 'QR кодын ирц бүртгэл', 'Үйл ажиллагаанд ирэхдээ гар утсаараа QR кодыг уншуулж ирцээ бүртгүүлнэ.', demo_admin)
  on conflict do nothing;

  raise notice 'Demo data added for school %', demo_school;
end;
$$;
