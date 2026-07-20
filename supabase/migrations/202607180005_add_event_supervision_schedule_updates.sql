alter table public.events
  add column if not exists supervision_information text;

alter table public.events
  add column if not exists schedule_change_notice text;

do $$
begin
  alter table public.events
    add constraint events_supervision_information_valid check (
      supervision_information is null
      or (
        length(supervision_information) between 1 and 1000
        and supervision_information = btrim(supervision_information)
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_schedule_change_notice_valid check (
      schedule_change_notice is null
      or (
        length(schedule_change_notice) between 1 and 1000
        and schedule_change_notice = btrim(schedule_change_notice)
      )
    );
exception
  when duplicate_object then null;
end $$;

create or replace function public.enforce_event_staff_authored_information()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  protected_information_changed boolean;
begin
  protected_information_changed := case
    when tg_op = 'INSERT' then
      new.supervision_information is not null
      or new.schedule_change_notice is not null
    else
      new.supervision_information is distinct from old.supervision_information
      or new.schedule_change_notice is distinct from old.schedule_change_notice
  end;

  if current_user = 'authenticated'
    and protected_information_changed
    and not (
      public.current_user_is_platform_admin()
      or public.current_user_can_manage_school(new.school_id)
    )
  then
    raise exception using
      errcode = '42501',
      message = 'event supervision and schedule information requires staff authority';
  end if;

  return new;
end;
$$;

alter function public.enforce_event_staff_authored_information() owner to postgres;
revoke all on function public.enforce_event_staff_authored_information()
  from public, anon, authenticated;

drop trigger if exists enforce_event_staff_authored_information on public.events;
create trigger enforce_event_staff_authored_information
  before insert or update on public.events
  for each row execute function public.enforce_event_staff_authored_information();

notify pgrst, 'reload schema';
