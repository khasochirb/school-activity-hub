import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const platformPoints = [
  {
    title: "Verified students only",
    body: "Students activate accounts from a staff-managed roster with one-time invite codes.",
  },
  {
    title: "Clubs and events",
    body: "Students discover active clubs, register for approved events, and keep track of what is coming up.",
  },
  {
    title: "Teacher oversight",
    body: "School admins and teachers manage approvals, safety notes, attendance, and reporting from one place.",
  },
];

const demoWorkflow = [
  "Add students",
  "Generate invite codes",
  "Students join",
  "Create clubs/events",
  "Track attendance",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="flex cursor-pointer items-center gap-3 transition hover:text-teal-800"
            href="/"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-sm font-bold text-white">
              SAH
            </span>
            <span className="font-bold tracking-tight">School Activity Hub</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link className="btn btn-primary" href="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-secondary" href="/login">
                  Sign in
                </Link>
                <Link className="btn btn-primary hidden sm:inline-flex" href="/join">
                  Join with invite code
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="page-eyebrow">Private school activity platform</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            A calm, pilot-ready hub for verified student activities.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            School Activity Hub helps private schools manage rosters, invite
            code registration, clubs, event approvals, safety notes, and QR
            attendance without opening access to the public.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link className="btn btn-primary" href="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" href="/login">
                  Sign in
                </Link>
                <Link className="btn btn-secondary" href="/join">
                  Join with invite code
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="section-card section-card-padded">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  School pilot snapshot
                </p>
                <p className="mt-1 text-lg font-bold text-slate-950">
                  Activity week overview
                </p>
              </div>
              <span className="badge badge-success">Verified access</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Students" value="Rostered" />
              <MiniStat label="Events" value="Approved" />
              <MiniStat label="Check-in" value="QR ready" />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <ActivityRow
              label="Invite access"
              value="One-time student codes"
            />
            <ActivityRow label="Club events" value="Teacher approved" />
            <ActivityRow label="Attendance" value="Live check-in records" />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          {platformPoints.map((point) => (
            <article className="section-card section-card-padded" key={point.title}>
              <h2 className="section-title">{point.title}</h2>
              <p className="section-description">{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="page-header">
          <p className="page-eyebrow">Demo workflow</p>
          <h2 className="page-title">Run a clean school pilot in five steps.</h2>
          <p className="page-description">
            Walk through the full activity flow using demo records first, then
            replace them with real school data when the pilot is ready.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {demoWorkflow.map((step, index) => (
              <article className="detail-card" key={step}>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-950">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm">
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="text-right text-slate-500">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}
