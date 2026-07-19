import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
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
  formatDate,
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getEventQuickViewLabels } from "@/lib/events/event-quick-view-labels";
import { getEventCalendarLinks } from "@/lib/events/event-calendar";
import type { EventExperienceLevel } from "@/lib/events/event-decision-info";
import {
  formatEventCost,
  type EventCostType,
} from "@/lib/events/event-practical-details";
import {
  getPageParam,
  getSearchParam,
  pageRange,
  pageRows,
} from "@/lib/list-filters";
import { timeServer } from "@/lib/server-timing";
import { getServerBaseUrl } from "@/lib/server-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CollapsibleFormSection,
  EmptyState,
  FormSectionToggleButton,
  HeaderActionLink,
  NoResultsState,
  PaginationControls,
  PageHeader,
} from "../_components/page-ui";
import { CreateEventForm } from "./create-event-form";
import {
  EventBrowser,
  type EventBrowserItem,
  type EventBrowserLabels,
} from "./event-browser";
import {
  EventCalendar,
  type EventCalendarLabels,
} from "./event-calendar";
import {
  EventWeekCalendar,
  type EventWeekLabels,
} from "./event-week-calendar";
import {
  EventsFilters,
  type EventsActiveFilter,
  type EventsFilterOption,
} from "./events-filters";

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

type ResponsibleStaffProfile = {
  full_name: string;
  id: string;
  role: "school_admin" | "teacher";
  status: "active" | "inactive";
};

type Event = {
  id: string;
  school_id: string;
  club_id: string | null;
  created_by_profile_id: string | null;
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
  responsible_staff_id: string | null;
  eligibility_notes: string | null;
  experience_level: EventExperienceLevel | null;
  accessibility_notes: string | null;
  cost_type: EventCostType | null;
  cost_amount: number | string | null;
  cost_currency: string | null;
  cost_notes: string | null;
  required_materials: string | null;
  expected_commitment: string | null;
};

type EventAttendeeCountRow = {
  event_id: string;
};

type CurrentStudentEventAttendee = {
  event_id: string;
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

type EventAudience =
  | "all"
  | "created"
  | "my-clubs"
  | "partners"
  | "registered"
  | "school";
type EventTimeFilter = "past" | "upcoming";
type EventBrowseView = "list" | "month" | "week";
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
  month?: string | string[];
  page?: string | string[];
  q?: string | string[];
  scope?: string | string[];
  status?: string | string[];
  time?: string | string[];
  view?: string | string[];
  week?: string | string[];
};

type EventsUrlState = {
  audience: EventAudience;
  category: string | null;
  month: string;
  searchQuery: string;
  status: EventStatusFilter;
  time: EventTimeFilter;
  view: EventBrowseView;
  week: string;
};

type Translate = (key: string) => string;
type FormatTranslate = (
  key: string,
  values: Record<string, string | number>,
) => string;

const EVENTS_PAGE_SIZE = 40;
const CALENDAR_EVENT_LIMIT = 200;

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
  const selectedCategory = parseActivityCategory(getSearchValue(params.category));
  const selectedTime = parseEventTime(getSearchParam(params.time));
  const selectedView = parseEventBrowseView(getSearchParam(params.view));
  const selectedMonth = parseCalendarMonth(
    getSearchParam(params.month),
    new Date(),
  );
  const selectedWeek = parseWeekStart(getSearchParam(params.week), new Date());
  const calendarRange =
    selectedView === "month"
      ? getCalendarQueryRange(selectedMonth)
      : selectedView === "week"
        ? getWeekQueryRange(selectedWeek)
        : null;
  const page = getPageParam(params.page);
  const range = pageRange(page, EVENTS_PAGE_SIZE);
  const supabase = await createClient();
  const user = await timeServer("events.query.auth-get-user", () =>
    getCurrentUser(),
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
  const baseUrl = await getServerBaseUrl();
  const isStaff = profile.role === "school_admin" || profile.role === "teacher";
  const selectedAudience = parseEventAudience(
    getSearchValue(params.scope),
    getSearchValue(params.filter),
    profile.role,
  );
  const selectedStatus = isStaff
    ? parseEventStatus(getSearchParam(params.status))
    : "approved";
  const currentStudent = await getCurrentStudent(admin, profile);
  const now = new Date().toISOString();
  const needsPartnerEvents = ["all", "partners", "registered"].includes(
    selectedAudience,
  );
  const [
    clubOptions,
    leaderClubOptions,
    registeredEventIds,
    currentStudentClubIds,
    connectedSchoolIds,
    responsibleStaffOptions,
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
    ),
    getCurrentStudentClubIds(admin, profile, currentStudent),
    needsPartnerEvents
      ? getConnectedSchoolIds(admin, profile.school_id)
      : Promise.resolve([]),
    isStaff
      ? getEligibleResponsibleStaff(admin, profile)
      : Promise.resolve([]),
  ]);
  const sharedEventIds = needsPartnerEvents && connectedSchoolIds.length
    ? await getSharedEventIdsForSchool(admin, profile.school_id)
    : [];
  const categoryOptions = ACTIVITY_CATEGORIES;
  const categorySelectOptions = ACTIVITY_CATEGORIES.map((category) => ({
    label: categoryLabel(category, t),
    value: category,
  }));
  const createClubOptions = isStaff ? clubOptions : leaderClubOptions;
  const canCreate = isStaff || leaderClubOptions.length > 0;
  const { error: eventsError, events, hasNextPage } = await getFilteredEvents(admin, {
    audience: selectedAudience,
    connectedSchoolIds,
    currentStudentClubIds,
    profileId: profile.id,
    registeredEventIds,
    searchQuery,
    schoolId: profile.school_id,
    selectedCategory,
    selectedStatus,
    selectedTime,
    sharedEventIds,
    isStaff,
    now,
    range,
    calendarRange,
  });

  const eventIds = events.map((event) => event.id);
  const [
    attendeeRows,
    currentStudentAttendees,
    eventShares,
    responsibleStaffProfiles,
  ] = await Promise.all([
    eventIds.length
      ? getEventAttendeeCountRows(admin, eventIds)
      : Promise.resolve([]),
    eventIds.length
      ? getCurrentStudentEventAttendees(
          admin,
          eventIds,
          profile,
          currentStudent,
        )
      : Promise.resolve([]),
    eventIds.length ? getEventShares(admin, eventIds) : Promise.resolve([]),
    events.length
      ? getResponsibleStaffProfiles(admin, events)
      : Promise.resolve([]),
  ]);
  const attendeeCounts = countActiveAttendees(attendeeRows);
  const currentStudentRegistrationByEventId = mapCurrentStudentRegistrations(
    currentStudentAttendees,
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
  const responsibleStaffById = new Map(
    responsibleStaffProfiles.map((staff) => [staff.id, staff]),
  );
  const defaultAudience = defaultEventAudience(profile.role);
  const hasResultFilters = Boolean(
    searchQuery ||
      selectedCategory ||
      selectedAudience !== defaultAudience ||
      selectedStatus !== "approved" ||
      selectedTime !== "upcoming",
  );
  const emptyTitle =
    selectedTime === "past"
      ? t("events.empty.noPastTitle")
      : t("events.empty.noUpcomingTitle");
  const eventBrowserItems: EventBrowserItem[] = events.map((event) => {
    const attendeeCount = attendeeCounts.get(event.id) ?? 0;
    const isFull =
      event.capacity !== null &&
      attendeeCount >= event.capacity;
    const registrationStatus = currentStudentRegistrationByEventId.get(
      event.id,
    );
    const permissionStatus = registrationStatus?.permission_status;
    const isOwnSchoolEvent = event.school_id === profile.school_id;
    const isMyClubEvent = Boolean(
      event.club_id && currentStudentClubIds.includes(event.club_id),
    );
    const sharedSchoolIds =
      isOwnSchoolEvent
        ? sharedSchoolIdsByEventId.get(event.id) ?? []
        : sharedEventIds.includes(event.id)
          ? [profile.school_id]
          : [];
    const clubName = event.club_id
      ? clubNameById.get(event.club_id) ?? t("events.fallback.clubEvent")
      : null;
    const ownerSchoolName = isOwnSchoolEvent
      ? t("events.card.mySchool")
      : schoolNameById.get(event.school_id) ??
        t("events.fallback.connectedSchool");
    const registrationStateLabel = currentStudent
      ? registrationStatus?.status === "attended"
        ? t("events.registration.checkedIn")
        : registrationStatus?.status === "registered"
          ? t("events.registration.youAreRegistered")
          : canCurrentStudentRegister(event, profile.school_id)
            ? t("events.registration.notJoined")
            : t("events.registration.unavailable")
      : null;
    const calendarLinks = getEventCalendarLinks(
      {
        description: event.description,
        endsAt: event.ends_at,
        id: event.id,
        location: event.location,
        startsAt: event.starts_at,
        title: event.title,
      },
      baseUrl,
    );
    const responsibleStaff = event.responsible_staff_id
      ? responsibleStaffById.get(event.responsible_staff_id)
      : null;

    return {
      accessibilityLabel:
        event.accessibility_notes ??
        t("events.decisionInfo.accessibilityNotProvided"),
      attendeeCount,
      canRegister: canCurrentStudentRegister(event, profile.school_id),
      calendarDownloadUrl: calendarLinks.calendarDownloadUrl,
      capacity: event.capacity,
      categoryLabel: event.category ? categoryLabel(event.category, t) : null,
      categoryValue: event.category,
      costLabel: formatEventCost({
        costAmount: event.cost_amount,
        costCurrency: event.cost_currency,
        costType: event.cost_type,
      }, locale, {
        free: t("events.practicalDetails.free"),
        notSpecified: t("events.practicalDetails.costNotSpecified"),
        variable: t("events.practicalDetails.variableCost"),
      }),
      costNotes: event.cost_notes,
      costType: event.cost_type,
      dateBadgeLabel: formatDate(event.starts_at, locale),
      dateTimeLabel: `${formatDateTime(event.starts_at, locale)} - ${formatTime(
        event.ends_at,
        locale,
      )}`,
      description: event.description,
      eligibilityLabel:
        event.eligibility_notes ?? t("events.decisionInfo.eligibilityNotSpecified"),
      expectedCommitmentLabel:
        event.expected_commitment ??
        t("events.practicalDetails.commitmentNotSpecified"),
      endsAt: event.ends_at,
      hasCurrentStudent: Boolean(currentStudent),
      hasEligibilityInfo: Boolean(event.eligibility_notes),
      hostName: clubName ?? ownerSchoolName,
      googleCalendarUrl: calendarLinks.googleCalendarUrl,
      id: event.id,
      isFull,
      isMyClubEvent,
      isOwnSchoolEvent,
      isPartnerEvent: !isOwnSchoolEvent,
      isStaff,
      location: event.location,
      experienceLabel: experienceLevelLabel(event.experience_level, t),
      experienceLevel: event.experience_level,
      permissionNote: event.permission_note,
      permissionRequired: event.permission_required,
      permissionStatusLabel: event.permission_required
        ? currentStudent && registrationStatus
          ? permissionLabel(permissionStatus, t)
          : t("events.permission.required")
        : t("events.permission.notRequired"),
      registrationStateLabel,
      registrationStatus: registrationStatus?.status ?? null,
      remainingSpaces:
        event.capacity === null
          ? null
          : Math.max(event.capacity - attendeeCount, 0),
      riskLabel: riskLabel(event.risk_level, t),
      riskLevel: event.risk_level,
      responsibleAdultLabel: responsibleStaff?.status === "active"
        ? `${responsibleStaff.full_name} (${staffRoleLabel(responsibleStaff.role, t)})`
        : t("events.decisionInfo.responsibleNotSpecified"),
      requiredMaterialsLabel:
        event.required_materials ??
        t("events.practicalDetails.materialsNotSpecified"),
      sharedLabel: sharingLabel(event, sharedSchoolIds, t, tf),
      startsAt: event.starts_at,
      status: event.status,
      statusLabel: eventStatusLabel(event.status, t),
      title: event.title,
      visualInitials: getInitials(clubName ?? ownerSchoolName ?? event.title),
    };
  });
  const eventBrowserLabels: EventBrowserLabels = {
    ...getEventQuickViewLabels(t),
    myClub: t("events.filters.myClubEvents"),
    partnerSchool: t("events.filters.partnerSchool"),
    registered: t("events.filters.registered"),
  };
  const eventCalendarLabels: EventCalendarLabels = {
    ...eventBrowserLabels,
    calendar: t("events.calendar.title"),
    moreCount: t("events.calendar.moreCount"),
    nextMonth: t("events.calendar.nextMonth"),
    myClub: t("events.filters.myClubEvents"),
    noEventsOnDate: hasResultFilters
      ? t("events.calendar.noMatchingEventsOnDate")
      : t("events.calendar.noEventsOnDate"),
    partnerSchool: t("events.filters.partnerSchool"),
    previousMonth: t("events.calendar.previousMonth"),
    schoolCalendar: t("events.calendar.schoolCalendar"),
    selectedDate: t("events.calendar.selectedDate"),
    today: t("events.calendar.today"),
  };
  const eventWeekLabels: EventWeekLabels = {
    ...eventBrowserLabels,
    nextWeek: t("events.week.nextWeek"),
    noEventsOnDay: t("events.week.noEventsOnDay"),
    noEventsThisWeek: t("events.week.noEventsThisWeek"),
    previousWeek: t("events.week.previousWeek"),
    today: t("events.calendar.today"),
    weekView: t("events.week.title"),
  };
  const filterUrlState: EventsUrlState = {
    audience: selectedAudience,
    category: selectedCategory,
    month: selectedMonth,
    searchQuery,
    status: selectedStatus,
    time: selectedTime,
    view: selectedView,
    week: selectedWeek,
  };
  const activeFilters = getActiveEventFilters(
    filterUrlState,
    defaultAudience,
    isStaff,
    t,
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <EventViewToggle
              state={filterUrlState}
              selectedView={selectedView}
              t={t}
            />
            {canCreate ? (
              <FormSectionToggleButton targetId="create-event">
                {t("events.actions.create")}
              </FormSectionToggleButton>
            ) : null}
          </>
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
            defaultResponsibleStaffId={isStaff ? profile.id : null}
            isStaff={isStaff}
            locale={locale}
            labels={{
              basicDetails: t("events.formGroups.basicDetails"),
              accessibilityGuidance: t(
                "events.decisionInfo.accessibilityGuidance",
              ),
              accessibilityInformation: t(
                "events.decisionInfo.accessibilityInformation",
              ),
              accessibilityPlaceholder: t(
                "events.decisionInfo.accessibilityPlaceholder",
              ),
              beginnerFriendly: t("events.experience.beginnerFriendly"),
              commitment: t("events.practicalDetails.expectedCommitment"),
              commitmentPlaceholder: t(
                "events.practicalDetails.commitmentPlaceholder",
              ),
              cost: t("events.practicalDetails.cost"),
              costAmount: t("events.practicalDetails.amount"),
              costCurrency: t("events.practicalDetails.currency"),
              costFree: t("events.practicalDetails.free"),
              costNotes: t("events.practicalDetails.costNotes"),
              costNotesPlaceholder: t(
                "events.practicalDetails.costNotesPlaceholder",
              ),
              costNotSpecified: t(
                "events.practicalDetails.costNotSpecified",
              ),
              costPaid: t("events.practicalDetails.paid"),
              costVariable: t("events.practicalDetails.variableCost"),
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
              eligibility: t("events.decisionInfo.eligibility"),
              eligibilityPlaceholder: t(
                "events.decisionInfo.eligibilityPlaceholder",
              ),
              experienceLevel: t("events.decisionInfo.experienceLevel"),
              leaderNeedsClub: t("events.create.leaderNeedsClub"),
              location: t("events.form.location"),
              maxParticipants: t("events.form.maxParticipants"),
              materials: t("events.practicalDetails.requiredMaterials"),
              materialsPlaceholder: t(
                "events.practicalDetails.materialsPlaceholder",
              ),
              noCategory: t("events.form.noCategory"),
              notSpecified: t("common.notSpecified"),
              permissionNote: t("events.form.permissionNote"),
              permissionNotePlaceholder: t(
                "events.form.permissionNotePlaceholder",
              ),
              permissionRequired: t("events.form.permissionRequired"),
              practicalDetails: t("events.formGroups.practicalDetails"),
              practicalGuidance: t(
                "events.practicalDetails.privacyGuidance",
              ),
              riskHigh: t("events.risk.high"),
              riskLevel: t("events.form.riskLevel"),
              riskLow: t("events.risk.low"),
              riskMedium: t("events.risk.medium"),
              quickDuration: t("events.form.quickDuration"),
              priorExperienceRecommended: t(
                "events.experience.priorExperienceRecommended",
              ),
              responsibleAdult: t("events.decisionInfo.responsibleAdult"),
              responsibleAdultHelp: t(
                "events.decisionInfo.responsibleAdultHelp",
              ),
              responsibleAdultReviewHelp: t(
                "events.decisionInfo.responsibleAdultReviewHelp",
              ),
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
              whoCanAttend: t("events.formGroups.whoCanAttend"),
            }}
            staffOptions={responsibleStaffOptions.map((staff) => ({
              id: staff.id,
              label: `${staff.full_name} (${staffRoleLabel(staff.role, t)})`,
            }))}
          />
        </CollapsibleFormSection>
      ) : null}

      <EventFilters
        activeFilters={activeFilters}
        categoryOptions={categoryOptions}
        resultCount={events.length}
        isStaff={isStaff}
        searchQuery={searchQuery}
        selectedAudience={selectedAudience}
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        selectedTime={selectedTime}
        selectedView={selectedView}
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeek}
        t={t}
        tf={tf}
      />

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {selectedView === "month"
                ? t("events.calendar.schoolCalendar")
                : selectedView === "week"
                  ? t("events.week.title")
                : eventListTitle(
                    selectedAudience,
                    selectedCategory,
                    selectedTime,
                    t,
                  )}
            </h2>
            {eventsError ? (
              <p className="mt-2 text-sm text-red-600">
                {tf("events.errors.loadFailed", {
                  error: t("common.somethingWentWrong"),
                })}
              </p>
            ) : null}
            {profile.role === "student" && !currentStudent ? (
              <p className="mt-2 text-sm text-zinc-600">
                {t("events.student.noRosterWarning")}
              </p>
            ) : null}
          </div>
        </div>
        {selectedView === "month" ? (
          <EventCalendar
            items={eventBrowserItems}
            key={selectedMonth}
            labels={eventCalendarLabels}
            locale={locale}
            month={selectedMonth}
            navigation={{
              nextHref: buildEventsMonthHref(
                filterUrlState,
                offsetCalendarMonth(selectedMonth, 1),
              ),
              previousHref: buildEventsMonthHref(
                filterUrlState,
                offsetCalendarMonth(selectedMonth, -1),
              ),
              todayHref: buildEventsMonthHref(
                filterUrlState,
                currentCalendarMonth(new Date()),
              ),
              todayMonth: currentCalendarMonth(new Date()),
            }}
          />
        ) : selectedView === "week" ? (
          <EventWeekCalendar
            items={eventBrowserItems}
            key={selectedWeek}
            labels={eventWeekLabels}
            locale={locale}
            navigation={{
              nextHref: buildEventsWeekHref(
                filterUrlState,
                offsetWeek(selectedWeek, 7),
              ),
              previousHref: buildEventsWeekHref(
                filterUrlState,
                offsetWeek(selectedWeek, -7),
              ),
              todayHref: buildEventsWeekHref(
                filterUrlState,
                currentWeekStart(new Date()),
              ),
              todayWeek: currentWeekStart(new Date()),
            }}
            weekStart={selectedWeek}
          />
        ) : events.length ? (
          <EventBrowser
            items={eventBrowserItems}
            labels={eventBrowserLabels}
          />
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
        {selectedView === "list" &&
        !eventsError &&
        (events.length > 0 || page > 1) ? (
          <PaginationControls
            getHref={(nextPage) => eventsPageHref(nextPage, params)}
            hasNextPage={hasNextPage}
            labels={{
              next: t("common.next"),
              page: tf("common.pageNumber", { number: page }),
              previous: t("common.previous"),
            }}
            page={page}
          />
        ) : null}
      </section>
    </div>
  );
}

function EventFilters({
  activeFilters,
  categoryOptions,
  resultCount,
  isStaff,
  searchQuery,
  selectedAudience,
  selectedCategory,
  selectedStatus,
  selectedTime,
  selectedView,
  selectedMonth,
  selectedWeek,
  t,
  tf,
}: {
  activeFilters: EventsActiveFilter[];
  categoryOptions: readonly string[];
  resultCount: number;
  isStaff: boolean;
  searchQuery: string;
  selectedAudience: EventAudience;
  selectedCategory: string | null;
  selectedStatus: EventStatusFilter;
  selectedTime: EventTimeFilter;
  selectedView: EventBrowseView;
  selectedMonth: string;
  selectedWeek: string;
  t: Translate;
  tf: FormatTranslate;
}) {
  const audienceOptions: EventsFilterOption[] = isStaff
    ? [
        { label: t("events.filters.allEvents"), value: "all" },
        { label: t("events.filters.createdByMe"), value: "created" },
        { label: t("events.filters.schoolEvents"), value: "school" },
        { label: t("events.filters.partnerEvents"), value: "partners" },
      ]
    : [
        { label: t("events.filters.allEvents"), value: "all" },
        { label: t("events.filters.myRegistered"), value: "registered" },
        { label: t("events.filters.myClubEvents"), value: "my-clubs" },
        { label: t("events.filters.schoolEvents"), value: "school" },
        { label: t("events.filters.partnerEvents"), value: "partners" },
      ];
  const resultCountLabel = tf("events.filters.eventsFound", {
    count: resultCount,
  });

  return (
    <EventsFilters
      activeFilters={activeFilters}
      audienceOptions={audienceOptions}
      categoryOptions={[
        { label: t("filters.all"), value: "" },
        ...categoryOptions.map((category) => ({
          label: categoryLabel(category, t),
          value: category,
        })),
      ]}
      clearHref={
        selectedView === "month"
          ? `/events?view=month&month=${selectedMonth}`
          : selectedView === "week"
            ? `/events?view=week&week=${selectedWeek}`
            : "/events"
      }
      labels={{
        audience: t("filters.filter"),
        category: t("filters.category"),
        clear: t("filters.clear"),
        filter: t("filters.filter"),
        hideFilters: t("filters.filter"),
        search: t("filters.search"),
        searchEvents: t("filters.searchEvents"),
        showFilters: t("filters.filter"),
        status: t("filters.status"),
        time: t("filters.time"),
      }}
      month={selectedMonth}
      resultCountLabel={resultCountLabel}
      searchQuery={searchQuery}
      selectedAudience={selectedAudience}
      selectedCategory={selectedCategory ?? ""}
      selectedStatus={selectedStatus}
      selectedTime={selectedTime}
      statusOptions={
        isStaff
          ? [
              { label: t("status.approved"), value: "approved" },
              {
                label: t("events.filters.pendingReview"),
                value: "pending_approval",
              },
              { label: t("status.canceled"), value: "canceled" },
              { label: t("status.rejected"), value: "rejected" },
              { label: t("filters.all"), value: "all" },
            ]
          : []
      }
      timeOptions={[
        { label: t("filters.upcoming"), value: "upcoming" },
        { label: t("filters.past"), value: "past" },
      ]}
      view={selectedView}
      week={selectedWeek}
    />
  );
}

function EventViewToggle({
  state,
  selectedView,
  t,
}: {
  state: EventsUrlState;
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
        href={buildEventsViewHref(state, "list")}
        prefetch={false}
      >
        {t("events.view.list")}
      </Link>
      <Link
        aria-label={t("events.view.viewCalendar")}
        className={viewToggleClassName(selectedView === "month")}
        href={buildEventsViewHref(state, "month")}
        prefetch={false}
      >
        {t("events.view.month")}
      </Link>
      <Link
        aria-label={t("events.view.viewWeek")}
        className={viewToggleClassName(selectedView === "week")}
        href={buildEventsViewHref(state, "week")}
        prefetch={false}
      >
        {t("events.view.week")}
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
  state: EventsUrlState,
  view: EventBrowseView,
) {
  return buildEventsHref({ ...state, view });
}

function buildEventsMonthHref(
  state: EventsUrlState,
  month: string,
) {
  return buildEventsHref({ ...state, month, view: "month" });
}

function buildEventsWeekHref(state: EventsUrlState, week: string) {
  return buildEventsHref({ ...state, view: "week", week });
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
  if (status === "all") {
    return t("filters.all");
  }

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
    audience,
    calendarRange,
    connectedSchoolIds,
    currentStudentClubIds,
    isStaff,
    now,
    profileId,
    registeredEventIds,
    searchQuery,
    schoolId,
    selectedCategory,
    selectedStatus,
    selectedTime,
    sharedEventIds,
    range,
  }: {
    audience: EventAudience;
    calendarRange: { from: string; to: string } | null;
    connectedSchoolIds: string[];
    currentStudentClubIds: string[];
    isStaff: boolean;
    now: string;
    profileId: string;
    registeredEventIds: string[];
    searchQuery: string;
    schoolId: string;
    selectedCategory: string | null;
    selectedStatus: EventStatusFilter;
    selectedTime: EventTimeFilter;
    sharedEventIds: string[];
    range: { from: number; to: number };
  },
) {
  if (audience === "registered" && registeredEventIds.length === 0) {
    return { error: null, events: [], hasNextPage: false };
  }

  if (audience === "my-clubs" && currentStudentClubIds.length === 0) {
    return { error: null, events: [], hasNextPage: false };
  }

  if (audience === "partners" && !hasPartnerEvents(connectedSchoolIds, sharedEventIds)) {
    return { error: null, events: [], hasNextPage: false };
  }

  let query = admin
    .from("events")
    .select(
      "id, school_id, club_id, created_by_profile_id, title, description, category, location, starts_at, ends_at, capacity, status, allow_connected_school_registration, risk_level, permission_required, permission_note, responsible_staff_id, eligibility_notes, experience_level, accessibility_notes, cost_type, cost_amount, cost_currency, cost_notes, required_materials, expected_commitment",
    );

  if (audience === "partners") {
    query = query.in("id", sharedEventIds).in("school_id", connectedSchoolIds);
  } else if (audience === "all" || audience === "registered") {
    query = hasPartnerEvents(connectedSchoolIds, sharedEventIds)
      ? query.or(
          [
            `school_id.eq.${schoolId}`,
            `and(school_id.in.(${connectedSchoolIds.join(",")}),id.in.(${sharedEventIds.join(",")}),status.eq.approved)`,
          ].join(","),
        )
      : query.eq("school_id", schoolId);
  } else {
    query = query.eq("school_id", schoolId);
  }

  if (!isStaff || audience === "partners") {
    query = query.eq("status", "approved");
  } else if (selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  query =
    selectedTime === "past"
      ? query.lt("starts_at", now)
      : query.gte("starts_at", now);

  if (calendarRange) {
    query = query
      .gte("starts_at", calendarRange.from)
      .lt("starts_at", calendarRange.to);
  }

  if (audience === "registered") {
    query = query.in("id", registeredEventIds);
  }

  if (audience === "my-clubs") {
    query = query.in("club_id", currentStudentClubIds);
  }

  if (audience === "created") {
    query = query.eq("created_by_profile_id", profileId);
  }

  if (selectedCategory) {
    query = query.eq("category", selectedCategory);
  }

  if (searchQuery) {
    query = query.ilike("title", `%${searchQuery}%`);
  }

  const { data: events, error } = await timeServer(
    calendarRange
      ? "events.query.calendar-range-events"
      : "events.query.filtered-events",
    () => {
      const orderedQuery = query.order("starts_at", {
        ascending: selectedTime !== "past",
      });

      return calendarRange
        ? orderedQuery.limit(CALENDAR_EVENT_LIMIT).returns<Event[]>()
        : orderedQuery.range(range.from, range.to).returns<Event[]>();
    },
  );
  const page = calendarRange
    ? { hasNextPage: false, rows: events ?? [] }
    : pageRows(events, EVENTS_PAGE_SIZE);

  return { error, events: page.rows, hasNextPage: page.hasNextPage };
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

async function getEligibleResponsibleStaff(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
) {
  let query = admin
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .in("role", ["school_admin", "teacher"])
    .order("full_name", { ascending: true });

  if (profile.role === "teacher") {
    query = query.eq("id", profile.id);
  }

  const { data: staff } = await timeServer(
    "events.query.eligible-responsible-staff",
    () => query.returns<ResponsibleStaffProfile[]>(),
  );

  return staff ?? [];
}

async function getResponsibleStaffProfiles(
  admin: ReturnType<typeof createAdminClient>,
  events: Event[],
) {
  const responsibleStaffIds = Array.from(
    new Set(
      events
        .map((event) => event.responsible_staff_id)
        .filter((staffId): staffId is string => Boolean(staffId)),
    ),
  );

  if (!responsibleStaffIds.length) {
    return [];
  }

  const { data: staff } = await timeServer(
    "events.query.responsible-staff",
    () =>
      admin
        .from("profiles")
        .select("id, full_name, role, status")
        .in("id", responsibleStaffIds)
        .in("role", ["school_admin", "teacher"])
        .returns<ResponsibleStaffProfile[]>(),
  );

  return staff ?? [];
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
) {
  if (!currentStudent) {
    return [];
  }

  const { data: attendees } = await timeServer(
    "events.query.current-student-registered-event-ids",
    () =>
      admin
        .from("event_attendees")
        .select("event_id")
        .or(
          `attendee_profile_id.eq.${profile.id},student_roster_id.eq.${currentStudent.id}`,
        )
        .in("status", ["registered", "attended"])
        .returns<Array<{ event_id: string }>>(),
  );

  return (attendees ?? []).map((attendee) => attendee.event_id);
}

async function getCurrentStudentClubIds(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
  currentStudent: StudentRoster | null,
) {
  if (!currentStudent) {
    return [];
  }

  const { data: memberships } = await timeServer(
    "events.query.current-student-club-ids",
    () =>
      admin
        .from("club_memberships")
        .select("club_id")
        .eq("school_id", profile.school_id)
        .eq("student_roster_id", currentStudent.id)
        .eq("status", "active")
        .returns<Array<{ club_id: string }>>(),
  );

  return (memberships ?? []).map((membership) => membership.club_id);
}

async function getEventAttendeeCountRows(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
) {
  const { data: attendees } = await timeServer(
    "events.query.event-attendee-count-rows",
    () =>
      admin
        .from("event_attendees")
        .select("event_id")
        .in("event_id", eventIds)
        .in("status", ["registered", "attended"])
        .returns<EventAttendeeCountRow[]>(),
  );

  return attendees ?? [];
}

async function getCurrentStudentEventAttendees(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
  profile: Profile,
  currentStudent: StudentRoster | null,
) {
  if (!currentStudent) {
    return [];
  }

  const { data: attendees } = await timeServer(
    "events.query.current-student-event-attendees",
    () =>
      admin
        .from("event_attendees")
        .select("event_id, permission_status, status")
        .in("event_id", eventIds)
        .or(
          `attendee_profile_id.eq.${profile.id},student_roster_id.eq.${currentStudent.id}`,
        )
        .in("status", ["registered", "attended"])
        .returns<CurrentStudentEventAttendee[]>(),
  );

  return attendees ?? [];
}

function countActiveAttendees(attendees: EventAttendeeCountRow[]) {
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
  attendees: CurrentStudentEventAttendee[],
) {
  const registrations = new Map<string, CurrentStudentRegistration>();

  attendees.forEach((attendee) => {
    registrations.set(attendee.event_id, {
      permission_status: attendee.permission_status,
      status: attendee.status,
    });
  });

  return registrations;
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

function experienceLevelLabel(
  experienceLevel: EventExperienceLevel | null,
  t: Translate,
) {
  if (experienceLevel === "beginner_friendly") {
    return t("events.experience.beginnerFriendly");
  }

  if (experienceLevel === "prior_experience_recommended") {
    return t("events.experience.priorExperienceRecommended");
  }

  return t("events.decisionInfo.experienceNotSpecified");
}

function staffRoleLabel(
  role: ResponsibleStaffProfile["role"],
  t: Translate,
) {
  return role === "school_admin"
    ? t("roles.schoolAdmin")
    : t("roles.teacher");
}

function parseEventAudience(
  value: string | undefined,
  legacyFilter: string | undefined,
  role: Profile["role"],
): EventAudience {
  const studentAudiences: EventAudience[] = [
    "all",
    "my-clubs",
    "partners",
    "registered",
    "school",
  ];
  const staffAudiences: EventAudience[] = [
    "all",
    "created",
    "partners",
    "school",
  ];

  if (value === "shared") {
    return "partners";
  }

  if (role === "student") {
    if (studentAudiences.includes(value as EventAudience)) {
      return value as EventAudience;
    }

    if (legacyFilter === "registered") {
      return "registered";
    }

    if (legacyFilter === "club") {
      return "my-clubs";
    }
  } else if (staffAudiences.includes(value as EventAudience)) {
    return value as EventAudience;
  }

  return defaultEventAudience(role);
}

function defaultEventAudience(role: Profile["role"]): EventAudience {
  return role === "student" ? "all" : "school";
}

function parseEventTime(value: string): EventTimeFilter {
  return value === "past" ? "past" : "upcoming";
}

function parseEventBrowseView(value: string): EventBrowseView {
  if (value === "week") {
    return "week";
  }

  return value === "calendar" || value === "month" || value === "schedule"
    ? "month"
    : "list";
}

function parseCalendarMonth(value: string, fallbackDate: Date) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return currentCalendarMonth(fallbackDate);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return month >= 1 && month <= 12
    ? `${year}-${String(month).padStart(2, "0")}`
    : currentCalendarMonth(fallbackDate);
}

function currentCalendarMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function offsetCalendarMonth(month: string, offset: number) {
  const date = calendarMonthDate(month);
  date.setMonth(date.getMonth() + offset);

  return currentCalendarMonth(date);
}

function getCalendarQueryRange(month: string) {
  const monthStart = calendarMonthDate(month);
  const daysSinceMonday = (monthStart.getDay() + 6) % 7;
  const gridStart = addCalendarDays(monthStart, -daysSinceMonday - 1);
  const gridEnd = addCalendarDays(gridStart, 44);

  return {
    from: gridStart.toISOString(),
    to: gridEnd.toISOString(),
  };
}

function parseWeekStart(value: string, fallbackDate: Date) {
  const parsedDate = dateFromDayKey(value);
  return parsedDate ? currentWeekStart(parsedDate) : currentWeekStart(fallbackDate);
}

function currentWeekStart(value: Date) {
  const date = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    12,
  );
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);

  return dayKey(date);
}

function offsetWeek(week: string, days: number) {
  const date = dateFromDayKey(week) ?? new Date();
  date.setDate(date.getDate() + days);
  return currentWeekStart(date);
}

function getWeekQueryRange(week: string) {
  const weekStart = dateFromDayKey(week) ?? new Date();
  weekStart.setHours(0, 0, 0, 0);
  const to = addCalendarDays(weekStart, 7);

  return { from: weekStart.toISOString(), to: to.toISOString() };
}

function dateFromDayKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarMonthDate(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 1, 12)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
}

function addCalendarDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
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

function eventsPageHref(page: number, params: EventsSearchParams) {
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === "page") {
      return;
    }

    const paramValue = Array.isArray(value) ? value[0] : value;

    if (paramValue) {
      nextParams.set(key, paramValue);
    }
  });

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const query = nextParams.toString();

  return query ? `/events?${query}` : "/events";
}

function eventListTitle(
  audience: EventAudience,
  category: string | null,
  time: EventTimeFilter,
  t: Translate,
) {
  const titleKey =
    audience === "registered"
      ? "events.filters.myRegistered"
      : audience === "my-clubs"
        ? "events.filters.myClubEvents"
        : audience === "partners"
          ? "events.filters.partnerEvents"
          : audience === "school"
            ? "events.filters.schoolEvents"
            : audience === "created"
              ? "events.filters.createdByMe"
              : time === "past"
                ? "events.listTitles.past"
                : "events.filters.allEvents";
  const scopedTitle = t(titleKey);

  return category ? `${scopedTitle}: ${categoryLabel(category, t)}` : scopedTitle;
}

function hasPartnerEvents(
  connectedSchoolIds: string[],
  sharedEventIds: string[],
) {
  return connectedSchoolIds.length > 0 && sharedEventIds.length > 0;
}

function buildEventsHref(
  state: EventsUrlState,
  omitted: Array<"category" | "q" | "scope" | "status" | "time"> = [],
) {
  const query = new URLSearchParams();

  if (!omitted.includes("q") && state.searchQuery) {
    query.set("q", state.searchQuery);
  }

  if (!omitted.includes("scope")) {
    query.set("scope", state.audience);
  }

  if (!omitted.includes("category") && state.category) {
    query.set("category", state.category);
  }

  if (!omitted.includes("status")) {
    query.set("status", state.status);
  }

  if (!omitted.includes("time")) {
    query.set("time", state.time);
  }

  if (state.view === "month") {
    query.set("view", "month");
    query.set("month", state.month);
  } else if (state.view === "week") {
    query.set("view", "week");
    query.set("week", state.week);
  }

  const search = query.toString();
  return search ? `/events?${search}` : "/events";
}

function getActiveEventFilters(
  state: EventsUrlState,
  defaultAudience: EventAudience,
  isStaff: boolean,
  t: Translate,
): EventsActiveFilter[] {
  const filters: EventsActiveFilter[] = [];

  if (state.audience !== defaultAudience) {
    filters.push({
      href: buildEventsHref(state, ["scope"]),
      label: eventAudienceLabel(state.audience, isStaff, t),
    });
  }

  if (state.searchQuery) {
    filters.push({
      href: buildEventsHref(state, ["q"]),
      label: `${t("filters.search")}: ${state.searchQuery}`,
    });
  }

  if (state.category) {
    filters.push({
      href: buildEventsHref(state, ["category"]),
      label: categoryLabel(state.category, t),
    });
  }

  if (state.time !== "upcoming") {
    filters.push({
      href: buildEventsHref(state, ["time"]),
      label: t("filters.past"),
    });
  }

  if (isStaff && state.status !== "approved") {
    filters.push({
      href: buildEventsHref(state, ["status"]),
      label: eventStatusLabel(state.status, t),
    });
  }

  return filters;
}

function eventAudienceLabel(
  audience: EventAudience,
  isStaff: boolean,
  t: Translate,
) {
  if (audience === "created") {
    return t("events.filters.createdByMe");
  }

  if (audience === "my-clubs") {
    return t("events.filters.myClubEvents");
  }

  if (audience === "partners") {
    return t("events.filters.partnerEvents");
  }

  if (audience === "registered") {
    return t("events.filters.myRegistered");
  }

  if (audience === "school") {
    return t("events.filters.schoolEvents");
  }

  return isStaff
    ? t("events.filters.allEvents")
    : t("events.filters.allEvents");
}

function categoryLabel(category: string, t: Translate) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toUpperCase();

  return initials || "SA";
}
