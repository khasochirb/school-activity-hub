do $$
begin
  create type public.event_cost_type as enum (
    'free',
    'paid',
    'variable'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.events
  add column if not exists cost_type public.event_cost_type;

alter table public.events
  add column if not exists cost_amount numeric(12, 2);

alter table public.events
  add column if not exists cost_currency text;

alter table public.events
  add column if not exists cost_notes text;

alter table public.events
  add column if not exists required_materials text;

alter table public.events
  add column if not exists expected_commitment text;

do $$
begin
  alter table public.events
    add constraint events_cost_details_valid check (
      (
        cost_type is null
        and cost_amount is null
        and cost_currency is null
        and cost_notes is null
      )
      or (
        cost_type = 'free'
        and cost_amount is null
        and cost_currency is null
      )
      or (
        cost_type = 'paid'
        and cost_amount > 0
        and cost_currency = 'MNT'
      )
      or (
        cost_type = 'variable'
        and cost_amount is null
        and cost_currency is null
        and cost_notes is not null
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_cost_notes_valid check (
      cost_notes is null
      or (
        length(cost_notes) between 1 and 500
        and cost_notes = btrim(cost_notes)
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_required_materials_valid check (
      required_materials is null
      or (
        length(required_materials) between 1 and 1000
        and required_materials = btrim(required_materials)
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_expected_commitment_valid check (
      expected_commitment is null
      or (
        length(expected_commitment) between 1 and 500
        and expected_commitment = btrim(expected_commitment)
      )
    );
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
