import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  cancelEvent,
  cancelEventRegistration,
  joinEvent,
  updateEventSafety,
  updateEventSharing,
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

type SchoolOption = {
  id: string;
  name: string;
};

type Event = {
  id: string;
  school_id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: string;
  allow_connected_school_registration: boolean;
  risk_level: "low" | "medium" | "high";
  permission_required: boolean;
  permission_note: string | null;
};

type EventAttendee = {
  event_id: string;
  student_roster_id: string | null;
  attendee_profile_id: string | null;
  attendee_school_id: string;
  permission_status: EventPermissionStatus;
  status: string;
};

type EventPermissionStatus =
  | "declined"
  | "not_required"
  | "pending"
  | "received";

type CurrentStudentRegistration = {
  permission_status: EventPermissionStatus;
  status: string;
};

type EventShare = {
  event_id: string;
  school_id: string;
};

type EventFilter = "upcoming" | "registered" | "club";
type EventScope = "mine" | "shared";

type EventsSearchParams = {
  category?: string | string[];
  filter?: string | string[];
  scope?: string | string[];
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  const params = await searchParams;
  const selectedFilter = parseEventFilter(getSearchValue(params.filter));
  const selectedScope = parseEventScope(getSearchValue(params.scope));
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
    registeredEventIds,
    connectedSchoolIds,
  ] = await Promise.all([
    getSchoolClubOptions(admin, profile.school_id),
    getLeaderClubOptions(admin, profile, currentStudent),
    getCurrentStudentRegisteredEventIds(
      admin,
      profile,
      currentStudent,
    ),
    getConnectedSchoolIds(admin, profile.school_id),
  ]);
  const sharedEventIds = connectedSchoolIds.length
    ? await getSharedEventIdsForSchool(admin, profile.school_id)
    : [];
  const categoryOptions = await getCategoryOptions(admin, {
    connectedSchoolIds,
    sharedEventIds,
    now,
    schoolId: profile.school_id,
    scope: selectedScope,
  });
  const createClubOptions = isStaff ? clubOptions : leaderClubOptions;
  const canCreate = isStaff || leaderClubOptions.length > 0;
  const { error: eventsError, events } = await getFilteredEvents(admin, {
    connectedSchoolIds,
    filter: selectedFilter,
    registeredEventIds,
    schoolId: profile.school_id,
    selectedCategory,
    sharedEventIds,
    scope: selectedScope,
    now,
  });

  const eventIds = events.map((event) => event.id);
  const [attendees, eventShares, connectedSchools] = await Promise.all([
    eventIds.length ? getEventAttendees(admin, eventIds) : Promise.resolve([]),
    eventIds.length ? getEventShares(admin, eventIds) : Promise.resolve([]),
    connectedSchoolIds.length
      ? getSchoolsById(admin, connectedSchoolIds)
      : Promise.resolve([]),
  ]);
  const attendeeCounts = countActiveAttendees(attendees);
  const currentStudentRegistrationByEventId = mapCurrentStudentRegistrations(
    attendees,
    profile,
    currentStudent,
  );
  const linkedClubIds = events
    .filter((event) => event.school_id === profile.school_id)
    .map((event) => event.club_id)
    .filter((clubId): clubId is string => Boolean(clubId));
  const linkedClubs = linkedClubIds.length
    ? await getClubsById(admin, profile.school_id, linkedClubIds)
    : [];
  const clubNameById = new Map(linkedClubs.map((club) => [club.id, club.name]));
  const ownerSchoolIds = Array.from(new Set(events.map((event) => event.school_id)));
  const ownerSchools = ownerSchoolIds.length
    ? await getSchoolsById(admin, ownerSchoolIds)
    : [];
  const schoolNameById = new Map(
    ownerSchools.map((school) => [school.id, school.name]),
  );
  const sharedSchoolIdsByEventId = mapSharedSchoolIds(eventShares);

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
          selectedScope={selectedScope}
        />

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            {eventListTitle(selectedFilter, selectedCategory, selectedScope)}
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
              const permissionStatus = registrationStatus?.permission_status;
              const sharedSchoolIds =
                event.school_id === profile.school_id
                  ? sharedSchoolIdsByEventId.get(event.id) ?? []
                  : sharedEventIds.includes(event.id)
                    ? [profile.school_id]
                    : [];

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
                  ownerSchoolName={
                    schoolNameById.get(event.school_id) ?? "Connected school"
                  }
                  registeredCount={registeredCount}
                  registrationStatus={registrationStatus?.status}
                  permissionStatus={permissionStatus}
                  connectedSchools={connectedSchools}
                  sharedSchoolIds={sharedSchoolIds}
                  userSchoolId={profile.school_id}
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
  selectedScope,
}: {
  categoryOptions: string[];
  currentStudent: StudentRoster | null;
  selectedCategory: string | null;
  selectedFilter: EventFilter;
  selectedScope: EventScope;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-950">Find events</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterLink
          active={selectedScope === "mine"}
          href={eventsHref({
            category: selectedCategory,
            filter: selectedFilter,
            scope: "mine",
          })}
        >
          My school events
        </FilterLink>
        <FilterLink
          active={selectedScope === "shared"}
          href={eventsHref({
            category: selectedCategory,
            filter: selectedFilter,
            scope: "shared",
          })}
        >
          Shared events
        </FilterLink>
      </div>
      <div className="mt-4 border-t border-zinc-200 pt-4">
        <p className="text-sm font-medium text-zinc-700">Event view</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterLink
          active={selectedFilter === "upcoming"}
          href={eventsHref({
            category: selectedCategory,
            filter: "upcoming",
            scope: selectedScope,
          })}
        >
          Upcoming
        </FilterLink>
        {currentStudent ? (
          <FilterLink
            active={selectedFilter === "registered"}
            href={eventsHref({
              category: selectedCategory,
              filter: "registered",
              scope: selectedScope,
            })}
          >
            My registered events
          </FilterLink>
        ) : null}
        <FilterLink
          active={selectedFilter === "club"}
          href={eventsHref({
            category: selectedCategory,
            filter: "club",
            scope: selectedScope,
          })}
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
              href={eventsHref({
                filter: selectedFilter,
                scope: selectedScope,
              })}
            >
              All categories
            </FilterLink>
            {categoryOptions.map((category) => (
              <FilterLink
                active={selectedCategory === category}
                href={eventsHref({
                  category,
                  filter: selectedFilter,
                  scope: selectedScope,
                })}
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
  connectedSchools,
  currentStudent,
  event,
  isFull,
  isStaff,
  ownerSchoolName,
  registeredCount,
  registrationStatus,
  permissionStatus,
  sharedSchoolIds,
  userSchoolId,
}: {
  clubName: string | null;
  connectedSchools: SchoolOption[];
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  ownerSchoolName: string;
  permissionStatus: EventPermissionStatus | undefined;
  registeredCount: number;
  registrationStatus: string | undefined;
  sharedSchoolIds: string[];
  userSchoolId: string;
}) {
  const isJoined =
    registrationStatus === "registered" || registrationStatus === "attended";
  const isOwnSchoolEvent = event.school_id === userSchoolId;

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
          connectedSchools={connectedSchools}
          currentStudent={currentStudent}
          event={event}
          isFull={isFull}
          isStaff={isStaff}
          registrationStatus={registrationStatus}
          sharedSchoolIds={sharedSchoolIds}
          userSchoolId={userSchoolId}
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
        <Badge variant={riskBadgeVariant(event.risk_level)}>
          {riskLabel(event.risk_level)}
        </Badge>
        {event.permission_required ? (
          <Badge variant="warning">Permission required</Badge>
        ) : null}
        {currentStudent && registrationStatus && event.permission_required ? (
          <Badge variant={permissionBadgeVariant(permissionStatus)}>
            {permissionLabel(permissionStatus)}
          </Badge>
        ) : null}
        <Badge variant={sharedSchoolIds.length ? "info" : "default"}>
          {sharingLabel(event, sharedSchoolIds)}
        </Badge>
        {!isOwnSchoolEvent ? <Badge variant="info">{ownerSchoolName}</Badge> : null}
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
        <div>
          <dt className="text-zinc-500">Hosted by</dt>
          <dd className="text-zinc-800">
            {isOwnSchoolEvent ? "My school" : ownerSchoolName}
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
    </article>
  );
}

function EventActions({
  connectedSchools,
  currentStudent,
  event,
  isFull,
  isStaff,
  registrationStatus,
  sharedSchoolIds,
  userSchoolId,
}: {
  connectedSchools: SchoolOption[];
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  registrationStatus: string | undefined;
  sharedSchoolIds: string[];
  userSchoolId: string;
}) {
  const isOwnSchoolEvent = event.school_id === userSchoolId;

  if (isStaff && isOwnSchoolEvent) {
    return (
      <div className="flex flex-col gap-2">
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
        <SharingForm
          connectedSchools={connectedSchools}
          event={event}
          sharedSchoolIds={sharedSchoolIds}
        />
        <SafetyForm event={event} />
      </div>
    );
  }

  if (isStaff) {
    return (
      <span className="inline-flex h-9 items-center rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-700">
        Shared event
      </span>
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

  if (!canCurrentStudentRegister(event, userSchoolId)) {
    return (
      <span className="inline-flex h-9 items-center rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-700">
        Registration unavailable
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {event.permission_required ? (
        <p className="max-w-64 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          This event may require school/parent permission.
        </p>
      ) : null}
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
    </div>
  );
}

function SafetyForm({ event }: { event: Event }) {
  return (
    <form action={updateEventSafety} className="flex flex-col gap-2">
      <input name="event_id" type="hidden" value={event.id} />
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        Risk level
        <select
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={event.risk_level}
          name="risk_level"
        >
          <option value="low">Low risk</option>
          <option value="medium">Medium risk</option>
          <option value="high">High risk</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          className="h-4 w-4 cursor-pointer"
          defaultChecked={event.permission_required}
          name="permission_required"
          type="checkbox"
          value="true"
        />
        Permission required
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        Permission note
        <textarea
          className="min-h-16 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={event.permission_note ?? ""}
          name="permission_note"
        />
      </label>
      <button
        className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        type="submit"
      >
        Save safety
      </button>
    </form>
  );
}

function SharingForm({
  connectedSchools,
  event,
  sharedSchoolIds,
}: {
  connectedSchools: SchoolOption[];
  event: Event;
  sharedSchoolIds: string[];
}) {
  const sharedSchoolIdSet = new Set(sharedSchoolIds);

  return (
    <form action={updateEventSharing} className="flex flex-col gap-2">
      <input name="event_id" type="hidden" value={event.id} />
      {connectedSchools.length ? (
        <fieldset className="rounded-md border border-zinc-200 p-3">
          <legend className="px-1 text-xs font-medium text-zinc-600">
            Share with
          </legend>
          <div className="flex flex-col gap-2">
            {connectedSchools.map((school) => (
              <label
                className="flex items-center gap-2 text-sm text-zinc-700"
                key={school.id}
              >
                <input
                  className="h-4 w-4 cursor-pointer"
                  defaultChecked={sharedSchoolIdSet.has(school.id)}
                  name="share_school_ids"
                  type="checkbox"
                  value={school.id}
                />
                {school.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-zinc-500">
          No approved school connections yet.
        </p>
      )}
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          className="h-4 w-4 cursor-pointer"
          defaultChecked={event.allow_connected_school_registration}
          name="allow_connected_registration"
          type="checkbox"
          value="true"
        />
        Allow connected students to register
      </label>
      <button
        className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
        disabled={!connectedSchools.length && !sharedSchoolIds.length}
        type="submit"
      >
        Save sharing
      </button>
    </form>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "danger" | "info" | "success" | "warning";
}) {
  return (
    <span
      className={
        variant === "success"
          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : variant === "info"
            ? "rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            : variant === "warning"
              ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
              : variant === "danger"
                ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {children}
    </span>
  );
}

function riskBadgeVariant(riskLevel: Event["risk_level"]) {
  if (riskLevel === "high") {
    return "danger";
  }

  return riskLevel === "medium" ? "warning" : "success";
}

function riskLabel(riskLevel: Event["risk_level"]) {
  if (riskLevel === "high") {
    return "High risk";
  }

  return riskLevel === "medium" ? "Medium risk" : "Low risk";
}

function canCurrentStudentRegister(event: Event, userSchoolId: string) {
  return (
    event.school_id === userSchoolId ||
    event.allow_connected_school_registration
  );
}

function sharingLabel(event: Event, sharedSchoolIds: string[]) {
  if (!sharedSchoolIds.length) {
    return "Internal only";
  }

  const base =
    sharedSchoolIds.length === 1
      ? "Shared with 1 school"
      : `Shared with ${sharedSchoolIds.length} schools`;

  return event.allow_connected_school_registration
    ? `${base} + registration`
    : base;
}

async function getFilteredEvents(
  admin: ReturnType<typeof createAdminClient>,
  {
    connectedSchoolIds,
    filter,
    now,
    registeredEventIds,
    schoolId,
    selectedCategory,
    sharedEventIds,
    scope,
  }: {
    connectedSchoolIds: string[];
    filter: EventFilter;
    now: string;
    registeredEventIds: string[];
    schoolId: string;
    selectedCategory: string | null;
    sharedEventIds: string[];
    scope: EventScope;
  },
) {
  if (filter === "registered" && registeredEventIds.length === 0) {
    return { error: null, events: [] };
  }

  if (
    scope === "shared" &&
    (connectedSchoolIds.length === 0 || sharedEventIds.length === 0)
  ) {
    return { error: null, events: [] };
  }

  let query = admin
    .from("events")
    .select(
      "id, school_id, club_id, title, description, category, location, starts_at, ends_at, capacity, status, allow_connected_school_registration, risk_level, permission_required, permission_note",
    )
    .eq("status", "approved")
    .gte("starts_at", now);

  if (scope === "shared") {
    query = query.in("id", sharedEventIds).in("school_id", connectedSchoolIds);
  } else {
    query = query.eq("school_id", schoolId);
  }

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

async function getConnectedSchoolIds(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: connections } = await admin
    .from("school_connections")
    .select("requester_school_id, receiver_school_id")
    .eq("status", "approved")
    .or(
      [
        `requester_school_id.eq.${schoolId}`,
        `receiver_school_id.eq.${schoolId}`,
      ].join(","),
    )
    .returns<
      Array<{
        requester_school_id: string;
        receiver_school_id: string;
      }>
    >();

  return (connections ?? []).map((connection) =>
    connection.requester_school_id === schoolId
      ? connection.receiver_school_id
      : connection.requester_school_id,
  );
}

async function getSharedEventIdsForSchool(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: shares } = await admin
    .from("event_school_shares")
    .select("event_id")
    .eq("school_id", schoolId)
    .returns<Array<{ event_id: string }>>();

  return (shares ?? []).map((share) => share.event_id);
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

async function getSchoolsById(
  admin: ReturnType<typeof createAdminClient>,
  schoolIds: string[],
) {
  const { data: schools } = await admin
    .from("schools")
    .select("id, name")
    .in("id", schoolIds)
    .returns<SchoolOption[]>();

  return schools ?? [];
}

async function getEventShares(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
) {
  const { data: shares } = await admin
    .from("event_school_shares")
    .select("event_id, school_id")
    .in("event_id", eventIds)
    .returns<EventShare[]>();

  return shares ?? [];
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
  {
    connectedSchoolIds,
    now,
    schoolId,
    sharedEventIds,
    scope,
  }: {
    connectedSchoolIds: string[];
    now: string;
    schoolId: string;
    sharedEventIds: string[];
    scope: EventScope;
  },
) {
  if (
    scope === "shared" &&
    (connectedSchoolIds.length === 0 || sharedEventIds.length === 0)
  ) {
    return [];
  }

  let query = admin
    .from("events")
    .select("category")
    .eq("status", "approved")
    .gte("starts_at", now)
    .not("category", "is", null);

  if (scope === "shared") {
    query = query.in("id", sharedEventIds).in("school_id", connectedSchoolIds);
  } else {
    query = query.eq("school_id", schoolId);
  }

  const { data: events } = await query
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
  profile: Profile,
  currentStudent: StudentRoster | null,
) {
  if (!currentStudent) {
    return [];
  }

  const { data: attendees } = await admin
    .from("event_attendees")
    .select("event_id")
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${currentStudent.id}`)
    .in("status", ["registered", "attended"])
    .returns<Array<{ event_id: string }>>();

  return (attendees ?? []).map((attendee) => attendee.event_id);
}

async function getEventAttendees(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
) {
  const { data: attendees } = await admin
    .from("event_attendees")
    .select("event_id, student_roster_id, attendee_profile_id, attendee_school_id, permission_status, status")
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

function mapSharedSchoolIds(shares: EventShare[]) {
  const sharesByEventId = new Map<string, string[]>();

  shares.forEach((share) => {
    const schoolIds = sharesByEventId.get(share.event_id) ?? [];
    schoolIds.push(share.school_id);
    sharesByEventId.set(share.event_id, schoolIds);
  });

  return sharesByEventId;
}

function mapCurrentStudentRegistrations(
  attendees: EventAttendee[],
  profile: Profile,
  currentStudent: StudentRoster | null,
) {
  const registrations = new Map<string, CurrentStudentRegistration>();

  if (!currentStudent) {
    return registrations;
  }

  attendees.forEach((attendee) => {
    if (
      attendee.attendee_profile_id === profile.id ||
      attendee.student_roster_id === currentStudent.id
    ) {
      registrations.set(attendee.event_id, {
        permission_status: attendee.permission_status,
        status: attendee.status,
      });
    }
  });

  return registrations;
}

function permissionBadgeVariant(
  permissionStatus: EventPermissionStatus | undefined,
) {
  if (permissionStatus === "received") {
    return "success";
  }

  if (permissionStatus === "declined") {
    return "danger";
  }

  return permissionStatus === "pending" ? "warning" : "default";
}

function permissionLabel(permissionStatus: EventPermissionStatus | undefined) {
  if (permissionStatus === "received") {
    return "Permission received";
  }

  if (permissionStatus === "declined") {
    return "Permission declined";
  }

  if (permissionStatus === "pending") {
    return "Permission pending";
  }

  return "Permission not required";
}

function parseEventFilter(value: string | undefined): EventFilter {
  if (value === "registered" || value === "club") {
    return value;
  }

  return "upcoming";
}

function parseEventScope(value: string | undefined): EventScope {
  return value === "shared" ? "shared" : "mine";
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
  scope,
}: {
  category?: string | null;
  filter: EventFilter;
  scope: EventScope;
}) {
  const params = new URLSearchParams();

  if (scope === "shared") {
    params.set("scope", scope);
  }

  if (filter !== "upcoming") {
    params.set("filter", filter);
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();

  return query ? `/events?${query}` : "/events";
}

function eventListTitle(
  filter: EventFilter,
  category: string | null,
  scope: EventScope,
) {
  const baseTitle =
    filter === "registered"
      ? "My registered events"
      : filter === "club"
        ? "Club events"
        : "Upcoming events";
  const scopedTitle =
    scope === "shared" ? `Shared ${baseTitle.toLowerCase()}` : baseTitle;

  return category ? `${scopedTitle}: ${category}` : scopedTitle;
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
