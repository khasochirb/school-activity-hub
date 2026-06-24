do $$
begin
  create type public.event_risk_level as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

alter table public.events
  add column if not exists risk_level public.event_risk_level not null default 'low';

alter table public.events
  add column if not exists permission_required boolean not null default false;

alter table public.events
  add column if not exists permission_note text;

notify pgrst, 'reload schema';
