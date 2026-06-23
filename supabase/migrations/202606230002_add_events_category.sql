-- Non-destructive Phase 9 fix for existing Supabase databases.
alter table public.events
  add column if not exists category text;
