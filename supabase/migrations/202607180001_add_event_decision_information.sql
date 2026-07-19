do $$
begin
  create type public.event_experience_level as enum (
    'beginner_friendly',
    'prior_experience_recommended'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.events
  add column if not exists responsible_staff_id uuid;

alter table public.events
  add column if not exists eligibility_notes text;

alter table public.events
  add column if not exists experience_level public.event_experience_level;

alter table public.events
  add column if not exists accessibility_notes text;

do $$
begin
  alter table public.events
    add constraint events_responsible_staff_school_fk
    foreign key (responsible_staff_id, school_id)
    references public.profiles(id, school_id)
    on delete restrict;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_eligibility_notes_length
    check (eligibility_notes is null or length(eligibility_notes) <= 500);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_accessibility_notes_length
    check (accessibility_notes is null or length(accessibility_notes) <= 2000);
exception
  when duplicate_object then null;
end $$;

create or replace function public.validate_event_responsible_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.profile_role;
begin
  if actor_id is not null then
    select p.role into actor_role
    from public.profiles p
    where p.id = actor_id;

    if actor_role = 'student' and (
      (tg_op = 'INSERT' and new.responsible_staff_id is not null)
      or (tg_op = 'UPDATE' and new.responsible_staff_id is distinct from old.responsible_staff_id)
    ) then
      raise exception 'students cannot assign event responsible staff'
        using errcode = '42501';
    end if;

    if actor_role = 'teacher'
      and (
        (tg_op = 'INSERT' and new.responsible_staff_id is not null)
        or (tg_op = 'UPDATE' and new.responsible_staff_id is distinct from old.responsible_staff_id)
      )
      and new.responsible_staff_id is distinct from actor_id
    then
      raise exception 'teachers can assign only themselves as event responsible staff'
        using errcode = '42501';
    end if;
  end if;

  if new.responsible_staff_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.responsible_staff_id
      and p.school_id = new.school_id
      and p.status = 'active'
      and p.role in ('school_admin', 'teacher')
  ) then
    raise exception 'responsible staff must be active school staff from the event school'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_event_responsible_staff() from public;
revoke all on function public.validate_event_responsible_staff() from anon;
revoke all on function public.validate_event_responsible_staff() from authenticated;

drop trigger if exists validate_event_responsible_staff on public.events;
create trigger validate_event_responsible_staff
  before insert or update of responsible_staff_id, school_id on public.events
  for each row execute function public.validate_event_responsible_staff();

notify pgrst, 'reload schema';
