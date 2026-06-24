import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const platformPoints = [
  {
    title: "Verified students only",
    body: "Students join from a school roster through one-time invite codes, not open self-registration.",
  },
  {
    title: "Clubs and events",
    body: "Students can discover school-approved activities, join clubs, and register for upcoming events.",
  },
  {
    title: "Teacher oversight",
    body: "School admins and teachers manage rosters, invite codes, approvals, attendance, and reports.",
  },
];

const howItWorks = [
  "School adds students",
  "Staff generate invite codes",
  "Students join clubs/events",
  "Attendance can be checked in",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-lg font-semibold">School Activity Hub</span>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                href="/dashboard"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                  href="/login"
                >
                  Sign in
                </Link>
                <Link
                  className="hidden h-10 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 sm:inline-flex"
                  href="/join"
                >
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Private school activity platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
            Clubs, events, and attendance for school communities with verified
            student access.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            School Activity Hub helps staff manage rosters, invite-code student
            registration, club membership, event approvals, and QR attendance
            check-in without exposing public student data.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
                href="/dashboard"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
                  href="/login"
                >
                  Sign in
                </Link>
                <Link
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                  href="/join"
                >
                  Join with invite code
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-500">Today</p>
            <div className="mt-4 space-y-3">
              <ActivityRow label="Robotics club" value="Approved event" />
              <ActivityRow label="Art showcase" value="Pending review" />
              <ActivityRow label="Attendance" value="QR check-in ready" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Roster" value="Verified" />
            <MiniStat label="Access" value="Invite codes" />
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          {platformPoints.map((point) => (
            <article className="rounded-lg border border-zinc-200 p-5" key={point.title}>
              <h2 className="text-base font-semibold text-zinc-950">
                {point.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {point.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-zinc-950">How it works</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((step, index) => (
            <article
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
              key={step}
            >
              <p className="text-sm font-medium text-zinc-500">
                Step {index + 1}
              </p>
              <p className="mt-2 font-semibold text-zinc-950">{step}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-white px-3 py-2 text-sm">
      <span className="font-medium text-zinc-900">{label}</span>
      <span className="text-zinc-500">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
