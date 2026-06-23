import Link from "next/link";
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

type EventFilter = "upcoming" | "registered" | "club";

type EventsSearchParams = {
  category?: string | string[];
  filter?: string | string[];
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  const params = await searchParams;
  const selectedFilter = parseEventFilter(getSearchValue(params.filter));
  const selectedCategory = normalizeCategory(getSearchValue(params.category));
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
  const now = new Date().toISOString();
  const [
    clubOptions,
    leaderClubOptions,
    categoryOptions,
    registeredEventIds,
  ] = await Promise.all([
    getSchoolClubOptions(admin, profile.school_id),
    getLeaderClubOptions(admin, profile, currentStudent),
    getCategoryOptions(admin, profile.school_id, now),
    getCurrentStudentRegisteredEventIds(
      admin,
      profile.school_id,
      currentStudent,
    ),
  ]);
  const createClubOptions = isStaff ? clubOptions : leaderClubOptions;
  const canCreate = isStaff || leaderClubOptions.length > 0;
  const { error: eventsError, events } = await getFilteredEvents(admin, {
    filter: selectedFilter,
    registeredEventIds,
    schoolId: profile.school_id,
    selectedCategory,
    now,
  });

  const eventIds = events.map((event) => event.id);
  const attendees = eventIds.length
    ? await getEventAttendees(admin, profile.school_id, eventIds)
    : [];
  const attendeeCounts = countActiveAttendees(attendees);
  const currentStudentRegistrationByEventId = mapCurrentStudentRegistrations(
    attendees,
    currentStudent,
  );
  const linkedClubIds = events
    .map((event) => event.club_id)
    .filter((clubId): clubId is string => Boolean(clubId));
  const linkedClubs = linkedClubIds.length
    ? await getClubsById(admin, profile.school_id, linkedClubIds)
    : [];
  const clubNameById = new Map(linkedClubs.map((club) => [club.id, club.name]));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Events</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Discover approved school events and manage registrations.
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

      <EventFilters
        categoryOptions={categoryOptions}
        currentStudent={currentStudent}
        selectedCategory={selectedCategory}
        selectedFilter={selectedFilter}
      />

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            {eventListTitle(selectedFilter, selectedCategory)}
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
        {events.length ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {events.map((event) => {
              const registeredCount = attendeeCounts.get(event.id) ?? 0;
              const isFull =
                event.capacity !== null && registeredCount >= event.capacity;
              const registrationStatus = currentStudentRegistrationByEventId.get(
                event.id,
              );

              return (
                <EventCard
                  clubName={
                    event.club_id
                      ? clubNameById.get(event.club_id) ?? "Club event"
                      : null
                  }
                  currentStudent={currentStudent}
                  event={event}
                  isFull={isFull}
                  isStaff={isStaff}
                  key={event.id}
                  registeredCount={registeredCount}
                  registrationStatus={registrationStatus}
                />
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-sm text-zinc-600">
            No events match the selected filters.
          </p>
        )}
      </section>
    </div>
  );
}

function EventFilters({
  categoryOptions,
  currentStudent,
  selectedCategory,
  selectedFilter,
}: {
  categoryOptions: string[];
  currentStudent: StudentRoster | null;
  selectedCategory: string | null;
  selectedFilter: EventFilter;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-950">Find events</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterLink
          active={selectedFilter === "upcoming"}
          href={eventsHref({ category: selectedCategory, filter: "upcoming" })}
        >
          Upcoming
        </FilterLink>
        {currentStudent ? (
          <FilterLink
            active={selectedFilter === "registered"}
            href={eventsHref({
              category: selectedCategory,
              filter: "registered",
            })}
          >
            My registered events
          </FilterLink>
        ) : null}
        <FilterLink
          active={selectedFilter === "club"}
          href={eventsHref({ category: selectedCategory, filter: "club" })}
        >
          Club events
        </FilterLink>
      </div>

      {categoryOptions.length ? (
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <p className="text-sm font-medium text-zinc-700">Category</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterLink
              active={!selectedCategory}
              href={eventsHref({ filter: selectedFilter })}
            >
              All categories
            </FilterLink>
            {categoryOptions.map((category) => (
              <FilterLink
                active={selectedCategory === category}
                href={eventsHref({ category, filter: selectedFilter })}
                key={category}
              >
                {category}
              </FilterLink>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FilterLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={
        active
          ? "inline-flex h-9 cursor-pointer items-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white"
          : "inline-flex h-9 cursor-pointer items-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

function EventCard({
  clubName,
  currentStudent,
  event,
  isFull,
  isStaff,
  registeredCount,
  registrationStatus,
}: {
  clubName: string | null;
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  registeredCount: number;
  registrationStatus: string | undefined;
}) {
  const isJoined =
    registrationStatus === "registered" || registrationStatus === "attended";

  return (
    <article className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">
            {event.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            {formatDateTime(event.starts_at)} - {formatTime(event.ends_at)}
          </p>
        </div>
        <EventActions
          currentStudent={currentStudent}
          event={event}
          isFull={isFull}
          isStaff={isStaff}
          registrationStatus={registrationStatus}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {currentStudent ? (
          <Badge variant={isJoined ? "success" : "default"}>
            {isJoined ? "Joined" : "Not joined"}
          </Badge>
        ) : null}
        {clubName ? <Badge>{clubName}</Badge> : null}
        {event.category ? <Badge>{event.category}</Badge> : null}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Location</dt>
          <dd className="text-zinc-800">{event.location || "-"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Registration</dt>
          <dd className="text-zinc-800">
            {registeredCount} joined
            {event.capacity ? ` / ${event.capacity} max` : ""}
          </dd>
        </div>
        {event.capacity ? (
          <div>
            <dt className="text-zinc-500">Max participants</dt>
            <dd className="text-zinc-800">{event.capacity}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500">Event type</dt>
          <dd className="text-zinc-800">{clubName ? "Club event" : "School event"}</dd>
        </div>
      </dl>

      {event.description ? (
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          {event.description}
        </p>
      ) : null}
    </article>
  );
}

function EventActions({
  currentStudent,
  event,
  isFull,
  isStaff,
  registrationStatus,
}: {
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  registrationStatus: string | undefined;
}) {
  if (isStaff) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          href={`/events/${event.id}/attendance`}
        >
          View attendance
        </Link>
        <form action={cancelEvent}>
          <input name="event_id" type="hidden" value={event.id} />
          <button
            className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
            type="submit"
          >
            Cancel event
          </button>
        </form>
      </div>
    );
  }

  if (!currentStudent) {
    return null;
  }

  if (registrationStatus === "registered") {
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

  if (registrationStatus === "attended") {
    return (
      <span className="inline-flex h-9 items-center rounded-md bg-emerald-50 px-3 text-sm font-medium text-emerald-700">
        Checked in
      </span>
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

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success";
}) {
  return (
    <span
      className={
        variant === "success"
          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {children}
    </span>
  );
}

async function getFilteredEvents(
  admin: ReturnType<typeof createAdminClient>,
  {
    filter,
    now,
    registeredEventIds,
    schoolId,
    selectedCategory,
  }: {
    filter: EventFilter;
    now: string;
    registeredEventIds: string[];
    schoolId: string;
    selectedCategory: string | null;
  },
) {
  if (filter === "registered" && registeredEventIds.length === 0) {
    return { error: null, events: [] };
  }

  let query = admin
    .from("events")
    .select(
      "id, club_id, title, description, category, location, starts_at, ends_at, capacity, status",
    )
    .eq("school_id", schoolId)
    .eq("status", "approved")
    .gte("starts_at", now);

  if (filter === "registered") {
    query = query.in("id", registeredEventIds);
  }

  if (filter === "club") {
    query = query.not("club_id", "is", null);
  }

  if (selectedCategory) {
    query = query.eq("category", selectedCategory);
  }

  const { data: events, error } = await query
    .order("starts_at", { ascending: true })
    .returns<Event[]>();

  return { error, events: events ?? [] };
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

async function getClubsById(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  clubIds: string[],
) {
  const { data: clubs } = await admin
    .from("clubs")
    .select("id, name")
    .eq("school_id", schoolId)
    .in("id", clubIds)
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

async function getCategoryOptions(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  now: string,
) {
  const { data: events } = await admin
    .from("events")
    .select("category")
    .eq("school_id", schoolId)
    .eq("status", "approved")
    .gte("starts_at", now)
    .not("category", "is", null)
    .order("category", { ascending: true })
    .returns<Array<{ category: string | null }>>();

  return Array.from(
    new Set(
      (events ?? [])
        .map((event) => event.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  );
}

async function getCurrentStudentRegisteredEventIds(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  currentStudent: StudentRoster | null,
) {
  if (!currentStudent) {
    return [];
  }

  const { data: attendees } = await admin
    .from("event_attendees")
    .select("event_id")
    .eq("school_id", schoolId)
    .eq("student_roster_id", currentStudent.id)
    .in("status", ["registered", "attended"])
    .returns<Array<{ event_id: string }>>();

  return (attendees ?? []).map((attendee) => attendee.event_id);
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

function mapCurrentStudentRegistrations(
  attendees: EventAttendee[],
  currentStudent: StudentRoster | null,
) {
  const registrations = new Map<string, string>();

  if (!currentStudent) {
    return registrations;
  }

  attendees.forEach((attendee) => {
    if (attendee.student_roster_id === currentStudent.id) {
      registrations.set(attendee.event_id, attendee.status);
    }
  });

  return registrations;
}

function parseEventFilter(value: string | undefined): EventFilter {
  if (value === "registered" || value === "club") {
    return value;
  }

  return "upcoming";
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCategory(value: string | undefined) {
  const category = value?.trim();

  return category || null;
}

function eventsHref({
  category,
  filter,
}: {
  category?: string | null;
  filter: EventFilter;
}) {
  const params = new URLSearchParams();

  if (filter !== "upcoming") {
    params.set("filter", filter);
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();

  return query ? `/events?${query}` : "/events";
}

function eventListTitle(filter: EventFilter, category: string | null) {
  const baseTitle =
    filter === "registered"
      ? "My registered events"
      : filter === "club"
        ? "Club events"
        : "Upcoming events";

  return category ? `${baseTitle}: ${category}` : baseTitle;
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
