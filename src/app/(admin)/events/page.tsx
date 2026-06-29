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
import { getSearchParam } from "@/lib/list-filters";
import { timeServer } from "@/lib/server-timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CategoryBadge,
  CollapsibleFormSection,
  EmptyState,
  FilterPanel,
  FormSectionToggleButton,
  HeaderActionLink,
  NoResultsState,
  PageHeader,
  SearchField,
  SelectFilter,
  StatusBadge,
} from "../_components/page-ui";
import {
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
type EventTimeFilter = "past" | "upcoming";
type EventBrowseView = "list" | "schedule";
type EventStatusFilter =
  | "all"
  | "approved"
  | "canceled"
  | "draft"
  | "pending_approval"
  | "rejected";

type EventsSearchParams = {
  category?: string | string[];
  filter?: string | string[];
  q?: string | string[];
  scope?: string | string[];
  status?: string | string[];
  time?: string | string[];
  view?: string | string[];
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
  const searchQuery = getSearchParam(params.q);
  const selectedFilter = parseEventFilter(getSearchValue(params.filter));
  const selectedScope = parseEventScope(getSearchValue(params.scope));
  const selectedCategory = parseActivityCategory(getSearchValue(params.category));
  const selectedTime = parseEventTime(getSearchParam(params.time));
  const selectedView = parseEventBrowseView(getSearchParam(params.view));
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
  const selectedStatus = isStaff
    ? parseEventStatus(getSearchParam(params.status))
    : "approved";
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
    searchQuery,
    schoolId: profile.school_id,
    selectedCategory,
    selectedStatus,
    selectedTime,
    sharedEventIds,
    scope: selectedScope,
    isStaff,
    now,
  });

  const eventIds = events.map((event) => event.id);
  const [attendees, eventShares] = await Promise.all([
    eventIds.length ? getEventAttendees(admin, eventIds) : Promise.resolve([]),
    eventIds.length ? getEventShares(admin, eventIds) : Promise.resolve([]),
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
  const hasResultFilters = Boolean(
    searchQuery ||
      selectedCategory ||
      selectedFilter !== "upcoming" ||
      selectedScope !== "mine" ||
      selectedStatus !== "approved",
  );
  const emptyTitle =
    selectedTime === "past"
      ? t("events.empty.noPastTitle")
      : t("events.empty.noUpcomingTitle");
  const renderEventCard = (event: Event) => {
    const isFull =
      event.capacity !== null &&
      (attendeeCounts.get(event.id) ?? 0) >= event.capacity;
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
            ? clubNameById.get(event.club_id) ?? t("events.fallback.clubEvent")
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
        registrationStatus={registrationStatus?.status}
        permissionStatus={permissionStatus}
        sharedSchoolIds={sharedSchoolIds}
        t={t}
        tf={tf}
        userSchoolId={profile.school_id}
      />
    );
  };

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          canCreate ? (
            <FormSectionToggleButton targetId="create-event">
              {t("events.actions.create")}
            </FormSectionToggleButton>
          ) : undefined
        }
        description={t("events.description")}
        eyebrow={t("events.eyebrow")}
        title={t("events.title")}
      />

      {canCreate ? (
        <CollapsibleFormSection
          description={
            isStaff
              ? t("events.create.staffDescription")
              : t("events.create.leaderDescription")
          }
          hideLabel={t("common.hideForm")}
          id="create-event"
          showLabel={t("common.showForm")}
          title={t("events.actions.create")}
        >
          <CreateEventForm
            canCreate={canCreate}
            categories={categorySelectOptions}
            clubs={createClubOptions}
            isStaff={isStaff}
            locale={locale}
            labels={{
              basicDetails: t("events.formGroups.basicDetails"),
              category: t("events.form.category"),
              club: t("events.form.club"),
              createApproved: t("events.actions.createApproved"),
              creating: t("events.actions.creating"),
              dateTime: t("events.formGroups.dateTime"),
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
              safetyPermissions: t("events.formGroups.safetyPermissions"),
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
        </CollapsibleFormSection>
      ) : null}

      <EventFilters
        categoryOptions={categoryOptions}
        currentStudent={currentStudent}
        resultCount={events.length}
        isStaff={isStaff}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedFilter={selectedFilter}
        selectedScope={selectedScope}
        selectedStatus={selectedStatus}
        selectedTime={selectedTime}
        selectedView={selectedView}
        t={t}
        tf={tf}
      />

      <section className="section-card">
        <div className="section-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title">
              {eventListTitle(
                selectedFilter,
                selectedCategory,
                selectedScope,
                selectedTime,
                t,
              )}
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
          <EventViewToggle
            params={params}
            selectedView={selectedView}
            t={t}
          />
        </div>
        {events.length ? (
          selectedView === "schedule" ? (
            <div className="space-y-3 p-3">
              {groupEventsForSchedule(events, now).map((group) => (
                <section
                  className="rounded-md border border-[var(--border)] bg-[var(--card-soft)] p-3"
                  key={group.key}
                >
                  <div className="mb-3 flex flex-col gap-1 border-b border-[var(--border)] pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-bold text-slate-950">
                      {scheduleGroupLabel(group.key, t)}
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      {tf("filters.showingResults", {
                        count: group.events.length,
                      })}
                    </p>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {group.events.map(renderEventCard)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 p-3 xl:grid-cols-2">
              {events.map(renderEventCard)}
            </div>
          )
        ) : hasResultFilters ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/events"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                canCreate ? (
                  <FormSectionToggleButton targetId="create-event">
                    {t("events.actions.create")}
                  </FormSectionToggleButton>
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
              title={emptyTitle}
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
  resultCount,
  isStaff,
  searchQuery,
  selectedCategory,
  selectedFilter,
  selectedScope,
  selectedStatus,
  selectedTime,
  selectedView,
  t,
  tf,
}: {
  categoryOptions: readonly string[];
  currentStudent: StudentRoster | null;
  resultCount: number;
  isStaff: boolean;
  searchQuery: string;
  selectedCategory: string | null;
  selectedFilter: EventFilter;
  selectedScope: EventScope;
  selectedStatus: EventStatusFilter;
  selectedTime: EventTimeFilter;
  selectedView: EventBrowseView;
  t: Translate;
  tf: FormatTranslate;
}) {
  return (
    <FilterPanel
      action="/events"
      clearHref="/events"
      clearLabel={t("filters.clear")}
      resultCountLabel={tf("filters.showingResults", { count: resultCount })}
      submitLabel={t("filters.filter")}
    >
      <SearchField
        defaultValue={searchQuery}
        label={t("filters.search")}
        placeholder={t("filters.searchEvents")}
      />
      {selectedView !== "list" ? (
        <input name="view" type="hidden" value={selectedView} />
      ) : null}
      <SelectFilter
        defaultValue={selectedScope}
        label={t("events.filters.viewLabel")}
        name="scope"
        options={[
          { label: t("events.filters.mySchool"), value: "mine" },
          { label: t("events.filters.shared"), value: "shared" },
        ]}
      />
      <SelectFilter
        defaultValue={selectedFilter}
        label={t("filters.filter")}
        name="filter"
        options={[
          { label: t("events.filters.upcoming"), value: "upcoming" },
          ...(currentStudent
            ? [{ label: t("events.filters.myRegistered"), value: "registered" }]
            : []),
          { label: t("events.filters.club"), value: "club" },
        ]}
      />
      <SelectFilter
        defaultValue={selectedTime}
        label={t("filters.time")}
        name="time"
        options={[
          { label: t("filters.upcoming"), value: "upcoming" },
          { label: t("filters.past"), value: "past" },
        ]}
      />
      {categoryOptions.length ? (
        <SelectFilter
          defaultValue={selectedCategory ?? ""}
          label={t("filters.category")}
          name="category"
          options={[
            { label: t("filters.all"), value: "" },
            ...categoryOptions.map((category) => ({
              label: categoryLabel(category, t),
              value: category,
            })),
          ]}
        />
      ) : null}
      {isStaff ? (
        <SelectFilter
          defaultValue={selectedStatus}
          label={t("filters.status")}
          name="status"
          options={[
            { label: t("status.approved"), value: "approved" },
            { label: t("status.canceled"), value: "canceled" },
            { label: t("status.pendingApproval"), value: "pending_approval" },
            { label: t("status.rejected"), value: "rejected" },
            { label: t("filters.all"), value: "all" },
          ]}
        />
      ) : null}
    </FilterPanel>
  );
}

function EventViewToggle({
  params,
  selectedView,
  t,
}: {
  params: EventsSearchParams;
  selectedView: EventBrowseView;
  t: Translate;
}) {
  return (
    <nav
      aria-label={t("events.filters.viewLabel")}
      className="inline-flex w-full rounded-md border border-[var(--border)] bg-[var(--card-soft)] p-1 sm:w-auto"
    >
      <Link
        aria-label={t("events.view.viewList")}
        className={viewToggleClassName(selectedView === "list")}
        href={buildEventsViewHref(params, "list")}
      >
        {t("events.view.list")}
      </Link>
      <Link
        aria-label={t("events.view.viewSchedule")}
        className={viewToggleClassName(selectedView === "schedule")}
        href={buildEventsViewHref(params, "schedule")}
      >
        {t("events.view.schedule")}
      </Link>
    </nav>
  );
}

function viewToggleClassName(isActive: boolean) {
  return [
    "flex min-h-9 flex-1 items-center justify-center rounded px-3 text-sm font-semibold transition sm:flex-none",
    isActive
      ? "bg-[var(--primary-soft)] text-[var(--primary-strong)] shadow-sm"
      : "text-slate-600 hover:bg-[var(--card)] hover:text-slate-950",
  ].join(" ");
}

function buildEventsViewHref(
  params: EventsSearchParams,
  view: EventBrowseView,
) {
  const query = new URLSearchParams();
  const keys: Array<keyof Pick<
    EventsSearchParams,
    "category" | "filter" | "q" | "scope" | "status" | "time"
  >> = ["category", "filter", "q", "scope", "status", "time"];

  keys.forEach((key) => {
    const value = getSearchParam(params[key]);

    if (value) {
      query.set(key, value);
    }
  });

  if (view === "schedule") {
    query.set("view", view);
  }

  const search = query.toString();

  return search ? `/events?${search}` : "/events";
}

type ScheduleGroupKey = "later" | "past" | "thisWeek" | "today";

function groupEventsForSchedule(events: Event[], now: string) {
  const currentDate = new Date(now);
  const groups = new Map<ScheduleGroupKey, Event[]>();

  events.forEach((event) => {
    const key = scheduleGroupKey(event.starts_at, currentDate);
    const groupEvents = groups.get(key) ?? [];
    groupEvents.push(event);
    groups.set(key, groupEvents);
  });

  return (["today", "thisWeek", "later", "past"] as ScheduleGroupKey[])
    .map((key) => ({ key, events: groups.get(key) ?? [] }))
    .filter((group) => group.events.length > 0);
}

function scheduleGroupKey(
  startsAt: string,
  currentDate: Date,
): ScheduleGroupKey {
  const eventDate = new Date(startsAt);

  if (Number.isNaN(eventDate.getTime())) {
    return "later";
  }

  if (eventDate < currentDate) {
    return "past";
  }

  if (isSameCalendarDay(eventDate, currentDate)) {
    return "today";
  }

  return eventDate <= endOfThisWeek(currentDate) ? "thisWeek" : "later";
}

function isSameCalendarDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function endOfThisWeek(date: Date) {
  const end = new Date(date);
  end.setDate(end.getDate() + (6 - end.getDay()));
  end.setHours(23, 59, 59, 999);

  return end;
}

function scheduleGroupLabel(key: ScheduleGroupKey, t: Translate) {
  if (key === "today") {
    return t("events.schedule.today");
  }

  if (key === "thisWeek") {
    return t("events.schedule.thisWeek");
  }

  if (key === "past") {
    return t("events.schedule.past");
  }

  return t("events.schedule.later");
}

function EventCard({
  clubName,
  currentStudent,
  event,
  isFull,
  isStaff,
  locale,
  ownerSchoolName,
  registrationStatus,
  permissionStatus,
  sharedSchoolIds,
  t,
  tf,
  userSchoolId,
}: {
  clubName: string | null;
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  locale: Locale;
  ownerSchoolName: string;
  permissionStatus: EventPermissionStatus | undefined;
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
          <p className="mt-1 text-sm font-medium text-zinc-700">
            {event.location || "-"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <EventActions
            currentStudent={currentStudent}
            event={event}
            isFull={isFull}
            isStaff={isStaff}
            registrationStatus={registrationStatus}
            t={t}
            userSchoolId={userSchoolId}
          />
          <Link
            className="btn btn-secondary min-h-9 px-3"
            href={`/events/${event.id}`}
          >
            {t("common.viewDetails")}
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={event.status}>
          {eventStatusLabel(event.status, t)}
        </StatusBadge>
        {currentStudent ? (
          <StatusBadge variant={isJoined ? "success" : "default"}>
            {registrationStatus === "attended"
              ? t("events.registration.checkedIn")
              : isJoined
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

    </article>
  );
}

function EventActions({
  currentStudent,
  event,
  isFull,
  isStaff,
  registrationStatus,
  t,
  userSchoolId,
}: {
  currentStudent: StudentRoster | null;
  event: Event;
  isFull: boolean;
  isStaff: boolean;
  registrationStatus: string | undefined;
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
          toastMessage={t("events.actions.cancelling")}
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
          toastMessage={t("events.actions.joining")}
        >
          {isFull ? t("events.actions.eventFull") : t("events.actions.join")}
        </PendingSubmitButton>
      </form>
    </div>
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

function eventStatusLabel(status: string, t: Translate) {
  if (status === "approved") {
    return t("status.approved");
  }

  if (status === "canceled") {
    return t("status.canceled");
  }

  if (status === "draft") {
    return t("status.draft");
  }

  if (status === "pending_approval") {
    return t("status.pendingApproval");
  }

  if (status === "rejected") {
    return t("status.rejected");
  }

  return status;
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
    isStaff,
    now,
    registeredEventIds,
    searchQuery,
    schoolId,
    selectedCategory,
    selectedStatus,
    selectedTime,
    sharedEventIds,
    scope,
  }: {
    connectedSchoolIds: string[];
    filter: EventFilter;
    isStaff: boolean;
    now: string;
    registeredEventIds: string[];
    searchQuery: string;
    schoolId: string;
    selectedCategory: string | null;
    selectedStatus: EventStatusFilter;
    selectedTime: EventTimeFilter;
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
    );

  if (scope === "shared") {
    query = query.in("id", sharedEventIds).in("school_id", connectedSchoolIds);
  } else {
    query = query.eq("school_id", schoolId);
  }

  if (!isStaff || scope === "shared") {
    query = query.eq("status", "approved");
  } else if (selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  query =
    selectedTime === "past"
      ? query.lt("starts_at", now)
      : query.gte("starts_at", now);

  if (filter === "registered") {
    query = query.in("id", registeredEventIds);
  }

  if (filter === "club") {
    query = query.not("club_id", "is", null);
  }

  if (selectedCategory) {
    query = query.eq("category", selectedCategory);
  }

  if (searchQuery) {
    query = query.ilike("title", `%${searchQuery}%`);
  }

  const { data: events, error } = await timeServer(
    "events.query.filtered-events",
    () =>
      query
        .order("starts_at", { ascending: selectedTime !== "past" })
        .returns<Event[]>(),
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

function parseEventTime(value: string): EventTimeFilter {
  return value === "past" ? "past" : "upcoming";
}

function parseEventBrowseView(value: string): EventBrowseView {
  return value === "schedule" ? "schedule" : "list";
}

function parseEventStatus(value: string): EventStatusFilter {
  return [
    "all",
    "approved",
    "canceled",
    "draft",
    "pending_approval",
    "rejected",
  ].includes(value)
    ? (value as EventStatusFilter)
    : "approved";
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function eventListTitle(
  filter: EventFilter,
  category: string | null,
  scope: EventScope,
  time: EventTimeFilter,
  t: Translate,
) {
  const baseTitleKey =
    time === "past" && filter === "upcoming"
      ? "events.listTitles.past"
      : filter === "registered"
      ? "events.listTitles.registered"
      : filter === "club"
        ? "events.listTitles.club"
        : "events.listTitles.upcoming";
  const sharedTitleKey =
    time === "past" && filter === "upcoming"
      ? "events.listTitles.sharedPast"
      : filter === "registered"
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
