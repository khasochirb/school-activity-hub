import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveEvent, rejectEvent } from "./actions";

type StaffProfile = {
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type PendingEvent = {
  id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  submitted_at: string | null;
  created_at: string;
};

type Club = {
  id: string;
  name: string;
};

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .maybeSingle<StaffProfile>();

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const [
    { data: pendingEvents, error: eventsError },
    { data: clubs },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, club_id, title, description, category, location, starts_at, ends_at, capacity, submitted_at, created_at",
      )
      .eq("school_id", profile.school_id)
      .eq("status", "pending_approval")
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .returns<PendingEvent[]>(),
    supabase
      .from("clubs")
      .select("id, name")
      .eq("school_id", profile.school_id)
      .returns<Club[]>(),
  ]);

  const clubNameById = new Map((clubs ?? []).map((club) => [club.id, club.name]));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Approvals</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Review club leader events that are waiting for staff approval.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            Pending event approvals
          </h2>
          {eventsError ? (
            <p className="mt-2 text-sm text-red-600">
              Pending events could not be loaded: {eventsError.message}
            </p>
          ) : null}
        </div>
        {pendingEvents?.length ? (
          <div className="grid gap-4 p-4">
            {pendingEvents.map((event) => (
              <article
                className="rounded-lg border border-zinc-200 p-4"
                key={event.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {formatDateTime(event.starts_at)} - {formatTime(event.ends_at)}
                    </p>
                  </div>
                  <form action={approveEvent}>
                    <input name="event_id" type="hidden" value={event.id} />
                    <button
                      className="h-9 cursor-pointer rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                      type="submit"
                    >
                      Approve
                    </button>
                  </form>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>pending_approval</Badge>
                  {event.category ? <Badge>{event.category}</Badge> : null}
                  {event.club_id ? (
                    <Badge>{clubNameById.get(event.club_id) ?? "Club event"}</Badge>
                  ) : null}
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Location</dt>
                    <dd className="text-zinc-800">{event.location || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Max participants</dt>
                    <dd className="text-zinc-800">{event.capacity ?? "No limit"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Submitted</dt>
                    <dd className="text-zinc-800">
                      {event.submitted_at
                        ? formatDate(event.submitted_at)
                        : formatDate(event.created_at)}
                    </dd>
                  </div>
                </dl>
                {event.description ? (
                  <p className="mt-4 text-sm leading-6 text-zinc-600">
                    {event.description}
                  </p>
                ) : null}
                <form action={rejectEvent} className="mt-4 flex flex-col gap-3">
                  <input name="event_id" type="hidden" value={event.id} />
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
                    Rejection reason
                    <textarea
                      className="min-h-20 rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-900"
                      name="rejection_reason"
                    />
                  </label>
                  <button
                    className="h-9 w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:w-fit"
                    type="submit"
                  >
                    Reject
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-zinc-600">
            No events are waiting for approval.
          </p>
        )}
      </section>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
