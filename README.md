# School Activity Hub

Private school activity platform for managing verified student access, clubs,
events, approvals, attendance, and school-facing reports.

## Pilot Workflow

1. Add students to the school roster.
2. Generate one-time invite codes for rostered students.
3. Students create accounts through invite-code registration.
4. Staff and club leaders create clubs and events.
5. Staff track registrations and QR attendance check-ins.

## Local Development

Create `.env.local` from `.env.example`, then run:

```bash
npm run dev
```

Open `http://localhost:3000` to view the app.

## Notes

This app uses Supabase Auth and Supabase PostgreSQL. Keep app code,
`supabase/schema.sql`, and the live Supabase database aligned before each
phase.
