-- Students only add and remove interests. Remove the broader table privileges
-- that authenticated inherits from project-level default ACLs.

revoke update, truncate, trigger, references
  on table public.student_interests
  from authenticated;

notify pgrst, 'reload schema';
