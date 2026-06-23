-- Non-destructive Phase 8 fix for existing Supabase databases.
alter table public.clubs
  add column if not exists category text;
