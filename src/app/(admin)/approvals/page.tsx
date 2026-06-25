import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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
  risk_level: "low" | "medium" | "high";
  permission_required: boolean;
  permission_note: string | null;
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

  const { data: pendingEvents, error: eventsError } = await supabase
    .from("events")
    .select(
      "id, club_id, title, description, category, location, starts_at, ends_at, capacity, risk_level, permission_required, permission_note, submitted_at, created_at",
    )
    .eq("school_id", profile.school_id)
    .eq("status", "pending_approval")
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .returns<PendingEvent[]>();
  const clubIds = Array.from(
    new Set(
      (pendingEvents ?? [])
        .map((event) => event.club_id)
        .filter((clubId): clubId is string => Boolean(clubId)),
    ),
  );
  const { data: clubs } = clubIds.length
    ? await supabase
        .from("clubs")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .in("id", clubIds)
        .returns<Club[]>()
    : { data: [] };

  const clubNameById = new Map((clubs ?? []).map((club) => [club.id, club.name]));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Approvals</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Review club leader event requests before they appear to students.
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
                    <PendingSubmitButton
                      className="h-9 cursor-pointer rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                      pendingLabel="Approving..."
                    >
                      Approve event
                    </PendingSubmitButton>
                  </form>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>pending_approval</Badge>
                  {event.category ? <Badge>{event.category}</Badge> : null}
                  {event.club_id ? (
                    <Badge>{clubNameById.get(event.club_id) ?? "Club event"}</Badge>
                  ) : null}
                  <Badge variant={riskBadgeVariant(event.risk_level)}>
                    {riskLabel(event.risk_level)}
                  </Badge>
                  {event.permission_required ? (
                    <Badge variant="warning">Permission required</Badge>
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
                  <div>
                    <dt className="text-zinc-500">Safety</dt>
                    <dd className="text-zinc-800">{riskLabel(event.risk_level)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Permission</dt>
                    <dd className="text-zinc-800">
                      {event.permission_required ? "May be required" : "Not required"}
                    </dd>
                  </div>
                </dl>
                {event.permission_note ? (
                  <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
                    <p className="font-medium text-zinc-900">Permission note</p>
                    <p className="mt-1 leading-6">{event.permission_note}</p>
                  </div>
                ) : null}
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
                  <PendingSubmitButton
                    className="h-9 w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:w-fit"
                    pendingLabel="Rejecting..."
                  >
                    Reject event
                  </PendingSubmitButton>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm font-medium text-zinc-950">
              No event approvals pending
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Club leader submissions will appear here when they need staff
              review.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "danger" | "default" | "warning";
}) {
  return (
    <span
      className={
        variant === "danger"
          ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          : variant === "warning"
            ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
            : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {children}
    </span>
  );
}

function riskBadgeVariant(riskLevel: PendingEvent["risk_level"]) {
  return riskLevel === "high"
    ? "danger"
    : riskLevel === "medium"
      ? "warning"
      : "default";
}

function riskLabel(riskLevel: PendingEvent["risk_level"]) {
  if (riskLevel === "high") {
    return "High risk";
  }

  return riskLevel === "medium" ? "Medium risk" : "Low risk";
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
