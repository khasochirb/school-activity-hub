import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  cancelEvent,
  cancelEventRegistration,
  joinEvent,
} from "./actions";
import { CreateEventForm } from "./create-event-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type ClubOption = {
  id: string;
  name: string;
};

type StudentRoster = {
  id: string;
};

type Event = {
  id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: string;
};

type EventAttendee = {
  event_id: string;
  student_roster_id: string;
  status: string;
};

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const isStaff = profile.role === "school_admin" || profile.role === "teacher";
  const currentStudent = await getCurrentStudent(admin, profile);
  const [clubOptions, leaderClubOptions] = await Promise.all([
    getSchoolClubOptions(admin, profile.school_id),
    getLeaderClubOptions(admin, profile, currentStudent),
  ]);
  const createClubOptions = isStaff ? clubOptions : leaderClubOptions;
  const canCreate = isStaff || leaderClubOptions.length > 0;
  const now = new Date().toISOString();
  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("id, club_id, title, description, category, location, starts_at, ends_at, capacity, status")
    .eq("school_id", profile.school_id)
    .eq("status", "approved")
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .returns<Event[]>();

  const eventIds = (events ?? []).map((event) => event.id);
  const attendees = eventIds.length
    ? await getEventAttendees(admin, profile.school_id, eventIds)
    : [];
  const attendeeCounts = countActiveAttendees(attendees);
  const currentStudentRegistrations = new Set(
    attendees
      .filter(
        (attendee) =>
          attendee.student_roster_id === currentStudent?.id &&
          attendee.status === "registered",
      )
      .map((attendee) => attendee.event_id),
  );
  const clubNameById = new Map(clubOptions.map((club) => [club.id, club.name]));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Events</h1>
        <p className="mt-2 text-sm text-zinc-600">
          View approved upcoming events and manage registrations.
        </p>
      </section>

      {canCreate ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Create event</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {isStaff
              ? "School staff events are approved immediately."
              : "Club leader events are submitted for approval."}
          </p>
          <div className="mt-4">
            <CreateEventForm
              canCreate={canCreate}
              clubs={createClubOptions}
              isStaff={isStaff}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            Approved upcoming events
          </h2>
          {eventsError ? (
            <p className="mt-2 text-sm text-red-600">
              Events could not be loaded: {eventsError.message}
            </p>
          ) : null}
          {profile.role === "student" && !currentStudent ? (
            <p className="mt-2 text-sm text-zinc-600">
              Your account is not linked to an active roster student yet.
            </p>
          ) : null}
        </div>
        {events?.length ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {events.map((event) => {
              const registeredCount = attendeeCounts.get(event.id) ?? 0;
              const isFull =
                event.capacity !== null && registeredCount >= event.capacity;
              const isRegistered = currentStudentRegistrations.has(event.id);

              return (
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
                        {formatDateTime(event.starts_at)} -{" "}
                        {formatTime(event.ends_at)}
                      </p>
                    </div>
                    <EventActions
                      currentStudent={currentStudent}
                      event={event}
                      isFull={isFull}
                      isRegistered={isRegistered}
                      isStaff={isStaff}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{event.status}</Badge>
                    {event.category ? <Badge>{event.category}</Badge> : null}
                    {event.club_id ? (
                      <Badge>{clubNameById.get(event.club_id) ?? "Club event"}</Badge>
                    ) : null}
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500">Location</dt>
                      <dd className="text-zinc-800">{event.location}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Participants</dt>
                      <dd className="text-zinc-800">
                        {registeredCount}
                        {event.capacity ? ` / ${event.capacity}` : ""}
                      </dd>
                    </div>
                  </dl>
                  {event.description ? (
                    <p className="mt-4 text-sm leading-6 text-zinc-600">
                      {event.description}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-sm text-zinc-600">
            No approved upcoming events yet.
          </p>
        )}
      </section>
    </div>
  );
}

function EventActions({
  currentStudent,
  event,
  isFull,
  isRegistered,
  isStaff,
}: {
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isRegistered: boolean;
  isStaff: boolean;
}) {
  if (isStaff) {
    return (
      <form action={cancelEvent}>
        <input name="event_id" type="hidden" value={event.id} />
        <button
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          type="submit"
        >
          Cancel event
        </button>
      </form>
    );
  }

  if (!currentStudent) {
    return null;
  }

  if (isRegistered) {
    return (
      <form action={cancelEventRegistration}>
        <input name="event_id" type="hidden" value={event.id} />
        <button
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          type="submit"
        >
          Cancel registration
        </button>
      </form>
    );
  }

  return (
    <form action={joinEvent}>
      <input name="event_id" type="hidden" value={event.id} />
      <button
        className="h-9 cursor-pointer rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        disabled={isFull}
        type="submit"
      >
        {isFull ? "Full" : "Join"}
      </button>
    </form>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

async function getCurrentStudent(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
) {
  if (profile.role !== "student") {
    return null;
  }

  const { data: student } = await admin
    .from("student_rosters")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<StudentRoster>();

  return student;
}

async function getSchoolClubOptions(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: clubs } = await admin
    .from("clubs")
    .select("id, name")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("name", { ascending: true })
    .returns<ClubOption[]>();

  return clubs ?? [];
}

async function getLeaderClubOptions(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
  currentStudent: StudentRoster | null,
) {
  if (profile.role !== "student" || !currentStudent) {
    return [];
  }

  const { data: memberships } = await admin
    .from("club_memberships")
    .select("clubs(id, name)")
    .eq("school_id", profile.school_id)
    .eq("student_roster_id", currentStudent.id)
    .eq("role", "leader")
    .eq("status", "active")
    .returns<Array<{ clubs: ClubOption | null }>>();

  return (memberships ?? [])
    .map((membership) => membership.clubs)
    .filter((club): club is ClubOption => Boolean(club));
}

async function getEventAttendees(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  eventIds: string[],
) {
  const { data: attendees } = await admin
    .from("event_attendees")
    .select("event_id, student_roster_id, status")
    .eq("school_id", schoolId)
    .in("event_id", eventIds)
    .in("status", ["registered", "attended"])
    .returns<EventAttendee[]>();

  return attendees ?? [];
}

function countActiveAttendees(attendees: EventAttendee[]) {
  const counts = new Map<string, number>();

  attendees.forEach((attendee) => {
    counts.set(attendee.event_id, (counts.get(attendee.event_id) ?? 0) + 1);
  });

  return counts;
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
