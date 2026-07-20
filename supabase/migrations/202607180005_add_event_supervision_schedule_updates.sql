alter table public.events
  add column if not exists cancellation_notice text;

do $$
begin
  alter table public.events
    add constraint events_cancellation_notice_valid check (
      cancellation_notice is null
      or (
        length(cancellation_notice) between 1 and 1000
        and cancellation_notice = btrim(cancellation_notice)
      )
    );
exception
  when duplicate_object then null;
end $$;

create or replace function public.enforce_event_staff_cancellation_notice()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  cancellation_notice_changed boolean;
begin
  cancellation_notice_changed := case
    when tg_op = 'INSERT' then new.cancellation_notice is not null
    else new.cancellation_notice is distinct from old.cancellation_notice
  end;

  if current_user = 'authenticated'
    and cancellation_notice_changed
    and not (
      public.current_user_is_platform_admin()
      or public.current_user_can_manage_school(new.school_id)
    )
  then
    raise exception using
      errcode = '42501',
      message = 'event cancellation notices require staff authority';
  end if;

  return new;
end;
$$;

alter function public.enforce_event_staff_cancellation_notice() owner to postgres;
revoke all on function public.enforce_event_staff_cancellation_notice()
  from public, anon, authenticated;

drop trigger if exists enforce_event_staff_cancellation_notice on public.events;
create trigger enforce_event_staff_cancellation_notice
  before insert or update on public.events
  for each row execute function public.enforce_event_staff_cancellation_notice();

notify pgrst, 'reload schema';
