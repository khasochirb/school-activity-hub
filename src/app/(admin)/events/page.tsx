import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  ACTIVITY_CATEGORIES,
  getActivityCategoryTranslationKey,
  parseActivityCategory,
} from "@/lib/activity-categories";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import {
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locales";
import { timeServer } from "@/lib/server-timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CategoryBadge,
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../_components/page-ui";
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

type Translate = (key: string) => string;
type FormatTranslate = (
  key: string,
  values: Record<string, string | number>,
) => string;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const selectedFilter = parseEventFilter(getSearchValue(params.filter));
  const selectedScope = parseEventScope(getSearchValue(params.scope));
  const selectedCategory = parseActivityCategory(getSearchValue(params.category));
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("events.query.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("events.query.profile", () =>
    supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
  );

  if (!profile) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const isStaff = profile.role === "school_admin" || profile.role === "teacher";
  const currentStudent = await getCurrentStudent(admin, profile);
  const now = new Date().toISOString();
  const needsConnectedSchools = isStaff || selectedScope === "shared";
  const [
    clubOptions,
    leaderClubOptions,
    registeredEventIds,
    connectedSchoolIds,
  ] = await Promise.all([
    isStaff
      ? getSchoolClubOptions(admin, profile.school_id)
      : Promise.resolve([]),
    profile.role === "student"
      ? getLeaderClubOptions(admin, profile, currentStudent)
      : Promise.resolve([]),
    getCurrentStudentRegisteredEventIds(
      admin,
      profile,
      currentStudent,
      now,
    ),
    needsConnectedSchools
      ? getConnectedSchoolIds(admin, profile.school_id)
      : Promise.resolve([]),
  ]);
  const sharedEventIds = selectedScope === "shared" && connectedSchoolIds.length
    ? await getSharedEventIdsForSchool(admin, profile.school_id)
    : [];
  const categoryOptions = ACTIVITY_CATEGORIES;
  const categorySelectOptions = ACTIVITY_CATEGORIES.map((category) => ({
    label: categoryLabel(category, t),
    value: category,
  }));
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
    isStaff && connectedSchoolIds.length
      ? getSchoolsById(admin, connectedSchoolIds)
      : Promise.resolve([]),
  ]);
  const attendeeCounts = countActiveAttendees(attendees);
  const currentStudentRegistrationByEventId = mapCurrentStudentRegistrations(
    attendees,
    profile,
    currentStudent,
  );
  const linkedClubIds = Array.from(
    new Set(
      events
        .filter((event) => event.school_id === profile.school_id)
        .map((event) => event.club_id)
        .filter((clubId): clubId is string => Boolean(clubId)),
    ),
  );
  const linkedClubs = linkedClubIds.length
    ? await getClubsById(admin, profile.school_id, linkedClubIds)
    : [];
  const clubNameById = new Map(linkedClubs.map((club) => [club.id, club.name]));
  const ownerSchoolIds = Array.from(
    new Set(
      events
        .map((event) => event.school_id)
        .filter((schoolId) => schoolId !== profile.school_id),
    ),
  );
  const ownerSchools = ownerSchoolIds.length
    ? await getSchoolsById(admin, ownerSchoolIds)
    : [];
  const schoolNameById = new Map(
    ownerSchools.map((school) => [school.id, school.name]),
  );
  const sharedSchoolIdsByEventId = mapSharedSchoolIds(eventShares);

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          canCreate ? (
            <HeaderActionLink href="#create-event">
              {t("events.actions.create")}
            </HeaderActionLink>
          ) : undefined
        }
        description={t("events.description")}
        eyebrow={t("events.eyebrow")}
        title={t("events.title")}
      />

      {canCreate ? (
        <section className="section-card section-card-padded" id="create-event">
          <h2 className="section-title">{t("events.actions.create")}</h2>
          <p className="section-description">
            {isStaff
              ? t("events.create.staffDescription")
              : t("events.create.leaderDescription")}
          </p>
          <div className="mt-4">
            <CreateEventForm
              canCreate={canCreate}
              categories={categorySelectOptions}
              clubs={createClubOptions}
              isStaff={isStaff}
              locale={locale}
              labels={{
                category: t("events.form.category"),
                club: t("events.form.club"),
                createApproved: t("events.actions.createApproved"),
                creating: t("events.actions.creating"),
                dateRequired: t("events.validation.dateRequired"),
                description: t("events.form.description"),
                duration30: t("events.form.duration30"),
                duration60: t("events.form.duration60"),
                duration90: t("events.form.duration90"),
                duration120: t("events.form.duration120"),
                endTime: t("events.form.endTime"),
                endTimeRequired: t("events.validation.endTimeRequired"),
                eventDate: t("events.form.eventDate"),
                eventTimePreview: t("events.form.eventTimePreview"),
                leaderNeedsClub: t("events.create.leaderNeedsClub"),
                location: t("events.form.location"),
                maxParticipants: t("events.form.maxParticipants"),
                noCategory: t("events.form.noCategory"),
                permissionNote: t("events.form.permissionNote"),
                permissionNotePlaceholder: t(
                  "events.form.permissionNotePlaceholder",
                ),
                permissionRequired: t("events.form.permissionRequired"),
                riskHigh: t("events.risk.high"),
                riskLevel: t("events.form.riskLevel"),
                riskLow: t("events.risk.low"),
                riskMedium: t("events.risk.medium"),
                quickDuration: t("events.form.quickDuration"),
                schoolWideEvent: t("events.form.schoolWideEvent"),
                startTime: t("events.form.startTime"),
                startTimeRequired: t("events.validation.startTimeRequired"),
                submitForApproval: t("events.actions.submitForApproval"),
                submitting: t("events.actions.submitting"),
                timeOrder: t("events.validation.timeOrder"),
                timePreviewEmpty: t("events.form.timePreviewEmpty"),
                timezoneHelper: t("events.form.timezoneHelper"),
                title: t("events.form.title"),
              }}
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
        t={t}
      />

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {eventListTitle(selectedFilter, selectedCategory, selectedScope, t)}
          </h2>
          {eventsError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("events.errors.loadFailed", { error: eventsError.message })}
            </p>
          ) : null}
          {profile.role === "student" && !currentStudent ? (
            <p className="mt-2 text-sm text-zinc-600">
              {t("events.student.noRosterWarning")}
            </p>
          ) : null}
        </div>
        {events.length ? (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
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
                      ? clubNameById.get(event.club_id) ??
                        t("events.fallback.clubEvent")
                      : null
                  }
                  currentStudent={currentStudent}
                  event={event}
                  isFull={isFull}
                  isStaff={isStaff}
                  key={event.id}
                  locale={locale}
                  ownerSchoolName={
                    schoolNameById.get(event.school_id) ??
                    t("events.fallback.connectedSchool")
                  }
                  registeredCount={registeredCount}
                  registrationStatus={registrationStatus?.status}
                  permissionStatus={permissionStatus}
                  connectedSchools={connectedSchools}
                  sharedSchoolIds={sharedSchoolIds}
                  t={t}
                  tf={tf}
                  userSchoolId={profile.school_id}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                canCreate ? (
                  <HeaderActionLink href="#create-event">
                    {t("events.actions.create")}
                  </HeaderActionLink>
                ) : (
                  <HeaderActionLink href="/events" variant="secondary">
                    {t("events.actions.resetFilters")}
                  </HeaderActionLink>
                )
              }
              description={
                canCreate
                  ? t("events.empty.staffDescription")
                  : t("events.empty.studentDescription")
              }
              title={t("events.empty.title")}
            />
          </div>
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
  t,
}: {
  categoryOptions: readonly string[];
  currentStudent: StudentRoster | null;
  selectedCategory: string | null;
  selectedFilter: EventFilter;
  selectedScope: EventScope;
  t: Translate;
}) {
  return (
    <section className="section-card section-card-padded">
      <h2 className="section-title">{t("events.filters.title")}</h2>
      <p className="section-description">
        {t("events.filters.description")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterLink
          active={selectedScope === "mine"}
          href={eventsHref({
            category: selectedCategory,
            filter: selectedFilter,
            scope: "mine",
          })}
        >
          {t("events.filters.mySchool")}
        </FilterLink>
        <FilterLink
          active={selectedScope === "shared"}
          href={eventsHref({
            category: selectedCategory,
            filter: selectedFilter,
            scope: "shared",
          })}
        >
          {t("events.filters.shared")}
        </FilterLink>
      </div>
      <div className="mt-4 border-t border-zinc-200 pt-4">
        <p className="text-sm font-medium text-zinc-700">
          {t("events.filters.viewLabel")}
        </p>
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
          {t("events.filters.upcoming")}
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
            {t("events.filters.myRegistered")}
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
          {t("events.filters.club")}
        </FilterLink>
      </div>

      {categoryOptions.length ? (
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <p className="text-sm font-medium text-zinc-700">
            {t("events.filters.category")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterLink
              active={!selectedCategory}
              href={eventsHref({
                filter: selectedFilter,
                scope: selectedScope,
              })}
            >
              {t("filters.allCategories")}
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
                {categoryLabel(category, t)}
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
          ? "btn btn-primary min-h-9 px-3"
          : "btn btn-secondary min-h-9 px-3"
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
  locale,
  ownerSchoolName,
  registeredCount,
  registrationStatus,
  permissionStatus,
  sharedSchoolIds,
  t,
  tf,
  userSchoolId,
}: {
  clubName: string | null;
  connectedSchools: SchoolOption[];
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  locale: Locale;
  ownerSchoolName: string;
  permissionStatus: EventPermissionStatus | undefined;
  registeredCount: number;
  registrationStatus: string | undefined;
  sharedSchoolIds: string[];
  t: Translate;
  tf: FormatTranslate;
  userSchoolId: string;
}) {
  const isJoined =
    registrationStatus === "registered" || registrationStatus === "attended";
  const isOwnSchoolEvent = event.school_id === userSchoolId;
  const isStudentView = Boolean(currentStudent) && !isStaff;

  return (
    <article
      className={
        isStudentView
          ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          : "rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className={isStudentView ? "text-xl font-semibold text-zinc-950" : "text-lg font-semibold text-zinc-950"}>
            {event.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            {formatDateTime(event.starts_at, locale)} -{" "}
            {formatTime(event.ends_at, locale)}
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
          t={t}
          userSchoolId={userSchoolId}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {currentStudent ? (
          <StatusBadge variant={isJoined ? "success" : "default"}>
            {isJoined
              ? t("events.registration.youAreRegistered")
              : t("events.registration.notJoined")}
          </StatusBadge>
        ) : null}
        {clubName ? <StatusBadge>{clubName}</StatusBadge> : null}
        {event.category ? (
          <CategoryBadge>{categoryLabel(event.category, t)}</CategoryBadge>
        ) : null}
        <StatusBadge variant={riskBadgeVariant(event.risk_level)}>
          {riskLabel(event.risk_level, t)}
        </StatusBadge>
        {event.permission_required ? (
          <StatusBadge variant="warning">
            {t("events.permission.required")}
          </StatusBadge>
        ) : null}
        {currentStudent && registrationStatus && event.permission_required ? (
          <StatusBadge variant={permissionBadgeVariant(permissionStatus)}>
            {permissionLabel(permissionStatus, t)}
          </StatusBadge>
        ) : null}
        <StatusBadge variant={sharedSchoolIds.length ? "info" : "default"}>
          {sharingLabel(event, sharedSchoolIds, t, tf)}
        </StatusBadge>
        {!isOwnSchoolEvent ? (
          <StatusBadge variant="info">{ownerSchoolName}</StatusBadge>
        ) : null}
      </div>

      <dl
        className={
          isStudentView
            ? "mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2"
            : "mt-4 grid gap-3 text-sm sm:grid-cols-2"
        }
      >
        <div>
          <dt className="text-zinc-500">{t("events.card.location")}</dt>
          <dd className="text-zinc-800">{event.location || "-"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t("events.card.registration")}</dt>
          <dd className="text-zinc-800">
            {tf("events.registration.count", { count: registeredCount })}
            {event.capacity
              ? ` ${tf("events.registration.maxSuffix", {
                  count: event.capacity,
                })}`
              : ""}
          </dd>
        </div>
        {event.capacity ? (
          <div>
            <dt className="text-zinc-500">
              {t("events.card.maxParticipants")}
            </dt>
            <dd className="text-zinc-800">{event.capacity}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500">{t("events.card.eventType")}</dt>
          <dd className="text-zinc-800">
            {clubName
              ? t("events.fallback.clubEvent")
              : t("events.card.schoolEvent")}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t("events.card.hostedBy")}</dt>
          <dd className="text-zinc-800">
            {isOwnSchoolEvent ? t("events.card.mySchool") : ownerSchoolName}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t("events.card.safety")}</dt>
          <dd className="text-zinc-800">{riskLabel(event.risk_level, t)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t("events.card.permission")}</dt>
          <dd className="text-zinc-800">
            {event.permission_required
              ? t("events.permission.mayBeRequired")
              : t("events.permission.notRequired")}
          </dd>
        </div>
      </dl>

      {event.permission_note ? (
        <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">
            {t("events.permission.note")}
          </p>
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
  t,
  userSchoolId,
}: {
  connectedSchools: SchoolOption[];
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  registrationStatus: string | undefined;
  sharedSchoolIds: string[];
  t: Translate;
  userSchoolId: string;
}) {
  const isOwnSchoolEvent = event.school_id === userSchoolId;

  if (isStaff && isOwnSchoolEvent) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          className="btn btn-primary min-h-9 px-3"
          href={`/events/${event.id}/attendance`}
        >
          {t("events.actions.attendanceQr")}
        </Link>
        <form action={cancelEvent}>
          <input name="event_id" type="hidden" value={event.id} />
          <PendingSubmitButton
            className="btn btn-secondary min-h-9 px-3"
            pendingLabel={t("events.actions.cancelling")}
          >
            {t("events.actions.cancel")}
          </PendingSubmitButton>
        </form>
        <SharingForm
          connectedSchools={connectedSchools}
          event={event}
          sharedSchoolIds={sharedSchoolIds}
          t={t}
        />
        <SafetyForm event={event} t={t} />
      </div>
    );
  }

  if (isStaff) {
    return (
      <span className="inline-flex h-9 items-center rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-700">
        {t("events.sharing.sharedEvent")}
      </span>
    );
  }

  if (!currentStudent) {
    return null;
  }

  if (registrationStatus === "registered") {
    return (
      <form action={cancelEventRegistration} className="w-full sm:w-auto">
        <input name="event_id" type="hidden" value={event.id} />
        <PendingSubmitButton
          className="btn btn-secondary min-h-12 w-full px-4 text-base sm:min-h-10 sm:w-auto sm:text-sm"
          pendingLabel={t("events.actions.cancelling")}
        >
          {t("events.actions.cancelMyRegistration")}
        </PendingSubmitButton>
      </form>
    );
  }

  if (registrationStatus === "attended") {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-50 px-3 text-sm font-medium text-emerald-700 sm:w-auto">
        {t("events.registration.checkedIn")}
      </span>
    );
  }

  if (!canCurrentStudentRegister(event, userSchoolId)) {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-700 sm:w-auto">
        {t("events.registration.unavailable")}
      </span>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      {event.permission_required ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800 sm:max-w-72">
          {t("events.permission.studentNotice")}
        </p>
      ) : null}
      <form action={joinEvent} className="w-full sm:w-auto">
        <input name="event_id" type="hidden" value={event.id} />
        <PendingSubmitButton
          className="btn btn-primary min-h-12 w-full px-4 text-base disabled:cursor-not-allowed disabled:bg-zinc-400 sm:min-h-10 sm:w-auto sm:text-sm"
          disabled={isFull}
          pendingLabel={t("events.actions.joining")}
        >
          {isFull ? t("events.actions.eventFull") : t("events.actions.join")}
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function SafetyForm({ event, t }: { event: Event; t: Translate }) {
  return (
    <form action={updateEventSafety} className="flex flex-col gap-2">
      <input name="event_id" type="hidden" value={event.id} />
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        {t("events.form.riskLevel")}
        <select
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={event.risk_level}
          name="risk_level"
        >
          <option value="low">{t("events.risk.low")}</option>
          <option value="medium">{t("events.risk.medium")}</option>
          <option value="high">{t("events.risk.high")}</option>
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
        {t("events.form.permissionRequired")}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        {t("events.form.permissionNote")}
        <textarea
          className="min-h-16 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={event.permission_note ?? ""}
          name="permission_note"
        />
      </label>
      <PendingSubmitButton
        className="btn btn-secondary min-h-9 px-3"
        pendingLabel={t("common.saving")}
      >
        {t("events.actions.saveSafety")}
      </PendingSubmitButton>
    </form>
  );
}

function SharingForm({
  connectedSchools,
  event,
  sharedSchoolIds,
  t,
}: {
  connectedSchools: SchoolOption[];
  event: Event;
  sharedSchoolIds: string[];
  t: Translate;
}) {
  const sharedSchoolIdSet = new Set(sharedSchoolIds);

  return (
    <form action={updateEventSharing} className="flex flex-col gap-2">
      <input name="event_id" type="hidden" value={event.id} />
      {connectedSchools.length ? (
        <fieldset className="rounded-md border border-zinc-200 p-3">
          <legend className="px-1 text-xs font-medium text-zinc-600">
            {t("events.sharing.shareWith")}
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
          {t("events.sharing.noConnections")}
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
        {t("events.sharing.allowConnectedRegistration")}
      </label>
      <PendingSubmitButton
        className="btn btn-secondary min-h-9 px-3 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
        disabled={!connectedSchools.length && !sharedSchoolIds.length}
        pendingLabel={t("common.saving")}
      >
        {t("events.actions.saveSharing")}
      </PendingSubmitButton>
    </form>
  );
}

function riskBadgeVariant(riskLevel: Event["risk_level"]) {
  if (riskLevel === "high") {
    return "danger";
  }

  return riskLevel === "medium" ? "warning" : "success";
}

function riskLabel(riskLevel: Event["risk_level"], t: Translate) {
  if (riskLevel === "high") {
    return t("events.risk.high");
  }

  return riskLevel === "medium"
    ? t("events.risk.medium")
    : t("events.risk.low");
}

function canCurrentStudentRegister(event: Event, userSchoolId: string) {
  return (
    event.school_id === userSchoolId ||
    event.allow_connected_school_registration
  );
}

function sharingLabel(
  event: Event,
  sharedSchoolIds: string[],
  t: Translate,
  tf: FormatTranslate,
) {
  if (!sharedSchoolIds.length) {
    return t("events.sharing.internalOnly");
  }

  if (event.allow_connected_school_registration && sharedSchoolIds.length > 1) {
    return tf("events.sharing.sharedManyRegistration", {
      count: sharedSchoolIds.length,
    });
  }

  if (sharedSchoolIds.length === 1) {
    return event.allow_connected_school_registration
      ? t("events.sharing.sharedOneRegistration")
      : t("events.sharing.sharedOne");
  }

  return tf("events.sharing.sharedMany", { count: sharedSchoolIds.length });
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

  const { data: events, error } = await timeServer(
    "events.query.filtered-events",
    () => query.order("starts_at", { ascending: true }).returns<Event[]>(),
  );

  return { error, events: events ?? [] };
}

async function getCurrentStudent(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
) {
  if (profile.role !== "student") {
    return null;
  }

  const { data: student } = await timeServer("events.query.current-student", () =>
    admin
      .from("student_rosters")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("school_id", profile.school_id)
      .eq("status", "active")
      .maybeSingle<StudentRoster>(),
  );

  return student;
}

async function getSchoolClubOptions(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: clubs } = await timeServer(
    "events.query.school-club-options",
    () =>
      admin
        .from("clubs")
        .select("id, name")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("name", { ascending: true })
        .returns<ClubOption[]>(),
  );

  return clubs ?? [];
}

async function getConnectedSchoolIds(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: connections } = await timeServer(
    "events.query.connected-school-ids",
    () =>
      admin
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
        >(),
  );

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
  const { data: shares } = await timeServer(
    "events.query.shared-event-ids",
    () =>
      admin
        .from("event_school_shares")
        .select("event_id")
        .eq("school_id", schoolId)
        .returns<Array<{ event_id: string }>>(),
  );

  return (shares ?? []).map((share) => share.event_id);
}

async function getClubsById(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  clubIds: string[],
) {
  const { data: clubs } = await timeServer("events.query.clubs-by-id", () =>
    admin
      .from("clubs")
      .select("id, name")
      .eq("school_id", schoolId)
      .in("id", clubIds)
      .returns<ClubOption[]>(),
  );

  return clubs ?? [];
}

async function getSchoolsById(
  admin: ReturnType<typeof createAdminClient>,
  schoolIds: string[],
) {
  const { data: schools } = await timeServer("events.query.schools-by-id", () =>
    admin
      .from("schools")
      .select("id, name")
      .in("id", schoolIds)
      .returns<SchoolOption[]>(),
  );

  return schools ?? [];
}

async function getEventShares(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
) {
  const { data: shares } = await timeServer("events.query.event-shares", () =>
    admin
      .from("event_school_shares")
      .select("event_id, school_id")
      .in("event_id", eventIds)
      .returns<EventShare[]>(),
  );

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

  const { data: memberships } = await timeServer(
    "events.query.leader-club-options",
    () =>
      admin
        .from("club_memberships")
        .select("clubs(id, name)")
        .eq("school_id", profile.school_id)
        .eq("student_roster_id", currentStudent.id)
        .eq("role", "leader")
        .eq("status", "active")
        .returns<Array<{ clubs: ClubOption | null }>>(),
  );

  return (memberships ?? [])
    .map((membership) => membership.clubs)
    .filter((club): club is ClubOption => Boolean(club));
}

async function getCurrentStudentRegisteredEventIds(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
  currentStudent: StudentRoster | null,
  now: string,
) {
  if (!currentStudent) {
    return [];
  }

  const { data: attendees } = await timeServer(
    "events.query.current-student-registered-event-ids",
    () =>
      admin
        .from("event_attendees")
        .select("event_id, events!inner(id)")
        .or(
          `attendee_profile_id.eq.${profile.id},student_roster_id.eq.${currentStudent.id}`,
        )
        .in("status", ["registered", "attended"])
        .eq("events.status", "approved")
        .gte("events.starts_at", now)
        .returns<Array<{ event_id: string }>>(),
  );

  return (attendees ?? []).map((attendee) => attendee.event_id);
}

async function getEventAttendees(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
) {
  const { data: attendees } = await timeServer(
    "events.query.event-attendees",
    () =>
      admin
        .from("event_attendees")
        .select(
          "event_id, student_roster_id, attendee_profile_id, permission_status, status",
        )
        .in("event_id", eventIds)
        .in("status", ["registered", "attended"])
        .returns<EventAttendee[]>(),
  );

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

function permissionLabel(
  permissionStatus: EventPermissionStatus | undefined,
  t: Translate,
) {
  if (permissionStatus === "received") {
    return t("events.permission.status.received");
  }

  if (permissionStatus === "declined") {
    return t("events.permission.status.declined");
  }

  if (permissionStatus === "pending") {
    return t("events.permission.status.pending");
  }

  return t("events.permission.status.notRequired");
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
  t: Translate,
) {
  const baseTitleKey =
    filter === "registered"
      ? "events.listTitles.registered"
      : filter === "club"
        ? "events.listTitles.club"
        : "events.listTitles.upcoming";
  const sharedTitleKey =
    filter === "registered"
      ? "events.listTitles.sharedRegistered"
      : filter === "club"
        ? "events.listTitles.sharedClub"
        : "events.listTitles.sharedUpcoming";
  const scopedTitle = t(scope === "shared" ? sharedTitleKey : baseTitleKey);

  return category ? `${scopedTitle}: ${categoryLabel(category, t)}` : scopedTitle;
}

function categoryLabel(category: string, t: Translate) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
