<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:supabase-schema-rules -->
# Supabase schema alignment is mandatory

Before writing code that reads from or writes to any Supabase table column, inspect `supabase/schema.sql` first. Do not assume columns, enum values, foreign keys, or RLS permissions exist.

If a new column or schema behavior is needed for a phase, update `supabase/schema.sql` in that same phase. Keep application code, `supabase/schema.sql`, and the live Supabase database aligned. If the live Supabase database needs a manual SQL migration, mention that SQL separately and clearly in the final response.

Future phase checklist:
- Check existing table columns.
- Check enum values.
- Check foreign keys.
- Check RLS policies.
- Update `supabase/schema.sql` if needed.
- Tell the user what SQL must be run manually in Supabase.
<!-- END:supabase-schema-rules -->
