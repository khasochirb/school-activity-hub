create unique index if not exists attendance_checkins_one_success_per_event_student
  on public.attendance_checkins (event_id, student_roster_id)
  where result = 'success';
