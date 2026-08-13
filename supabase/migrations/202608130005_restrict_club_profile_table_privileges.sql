-- Club profile writes are exposed only through the authorized RPC.
-- Remove broad table privileges inherited from project-level default ACLs.

revoke all privileges on table public.club_profiles from anon;

revoke insert, update, delete, truncate, trigger, references
  on table public.club_profiles
  from authenticated;

grant select on table public.club_profiles to authenticated;

notify pgrst, 'reload schema';
