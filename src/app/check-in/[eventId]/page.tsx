import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CheckInForm } from "./check-in-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
  status: string;
};

type StudentRoster = {
  id: string;
};

type EventRecord = {
  id: string;
  school_id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

type EventAttendee = {
  id: string;
  status: string;
  checked_in_at: string | null;
};

type AttendanceCheckin = {
  id: string;
};

export default async function StudentCheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role, status")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || profile.role !== "student" || profile.status !== "active") {
    return (
      <CheckInShell>
        <UnavailableMessage message="Only active student accounts can use this check-in link." />
      </CheckInShell>
    );
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("student_rosters")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<StudentRoster>();

  const { data: event } = await admin
    .from("events")
    .select("id, school_id, title, location, starts_at, ends_at, status")
    .eq("id", eventId)
    .eq("status", "approved")
    .maybeSingle<EventRecord>();

  const canAccessEvent =
    event &&
    (event.school_id === profile.school_id ||
      ((await isEventSharedWithSchool(admin, event.id, profile.school_id)) &&
        (await schoolsHaveApprovedConnection(
          admin,
          event.school_id,
          profile.school_id,
        ))));

  if (!student || !event || !canAccessEvent) {
    return (
      <CheckInShell>
        <UnavailableMessage
          message={
            !student
              ? "Your account is not linked to an active roster student."
              : "This event is not available for check-in."
          }
        />
      </CheckInShell>
    );
  }

  const { data: attendee } = await admin
    .from("event_attendees")
    .select("id, status, checked_in_at")
    .eq("event_id", event.id)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .maybeSingle<EventAttendee>();

  const { data: existingCheckin } = await admin
    .from("attendance_checkins")
    .select("id")
    .eq("event_id", event.id)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .eq("result", "success")
    .maybeSingle<AttendanceCheckin>();

  const alreadyCheckedIn =
    Boolean(existingCheckin) ||
    attendee?.status === "attended" ||
    Boolean(attendee?.checked_in_at);
  const canCheckIn = attendee?.status === "registered" && !alreadyCheckedIn;

  return (
    <CheckInShell>
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          Event check-in
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{event.title}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Time</dt>
            <dd className="text-zinc-800">
              {formatDateTime(event.starts_at)} - {formatTime(event.ends_at)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Location</dt>
            <dd className="text-zinc-800">{event.location || "-"}</dd>
          </div>
        </dl>

        {canCheckIn ? <CheckInForm eventId={event.id} /> : null}

        {!attendee || attendee.status === "canceled" ? (
          <StatusMessage message="Join this event before checking in." />
        ) : null}
        {alreadyCheckedIn ? (
          <StatusMessage message="You are already checked in." success />
        ) : null}
        {attendee &&
        attendee.status !== "registered" &&
        attendee.status !== "attended" ? (
          <StatusMessage message="This event registration cannot be checked in." />
        ) : null}

        <Link
          className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          href="/events"
        >
          Back to events
        </Link>
      </section>
    </CheckInShell>
  );
}

function CheckInShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-xl">{children}</div>
    </main>
  );
}

function UnavailableMessage({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-950">Event check-in</h1>
      <StatusMessage message={message} />
      <Link
        className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        href="/dashboard"
      >
        Back to dashboard
      </Link>
    </section>
  );
}

function StatusMessage({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return (
    <p
      className={
        success
          ? "mt-4 text-sm text-emerald-700"
          : "mt-4 text-sm text-zinc-600"
      }
      role="status"
    >
      {message}
    </p>
  );
}

async function schoolsHaveApprovedConnection(
  admin: ReturnType<typeof createAdminClient>,
  firstSchoolId: string,
  secondSchoolId: string,
) {
  const { data: connection } = await admin
    .from("school_connections")
    .select("id")
    .eq("status", "approved")
    .or(
      [
        `and(requester_school_id.eq.${firstSchoolId},receiver_school_id.eq.${secondSchoolId})`,
        `and(requester_school_id.eq.${secondSchoolId},receiver_school_id.eq.${firstSchoolId})`,
      ].join(","),
    )
    .maybeSingle<{ id: string }>();

  return Boolean(connection);
}

async function isEventSharedWithSchool(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  schoolId: string,
) {
  const { data: share } = await admin
    .from("event_school_shares")
    .select("id")
    .eq("event_id", eventId)
    .eq("school_id", schoolId)
    .maybeSingle<{ id: string }>();

  return Boolean(share);
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
