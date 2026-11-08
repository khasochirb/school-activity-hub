import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { getCurrentEventActor } from "@/lib/auth/event-access";
import {
  DetailsDisclosure,
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../_components/page-ui";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import {
  buildDashboardActivitySummary,
  getDashboardActivityRange,
  type DashboardActivityEvent,
} from "@/lib/dashboard/activity-summary";
import { getEventCalendarLinks } from "@/lib/events/event-calendar";
import type { EventExperienceLevel } from "@/lib/events/event-decision-info";
import {
  formatEventCost,
  type EventCostType,
} from "@/lib/events/event-practical-details";
import { EVENT_QUICK_VIEW_SELECT } from "@/lib/events/event-selects";
import {
  formatCalendarDateBadge,
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getEventPosterDeliveryUrl } from "@/lib/events/event-poster";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locales";
import { timeServer } from "@/lib/server-timing";
import { getServerBaseUrl } from "@/lib/server-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadStudentInterests } from "@/lib/students/student-interests";
import {
  matchClubsToInterests,
  type ClubsForInterests,
} from "@/lib/students/student-journey";
import {
  colorVar,
  Cover,
  EventCard,
  initialsOf,
  PageHead,
  Section,
  WeekStrip,
  Widget,
  ClubAvatar,
  CategoryLabel,
  type CleanEventCardData,
  type CleanEventCardLabels,
  type WeekDay,
} from "../_components/clean-ui";
import { categoryColor } from "@/lib/ui/category-colors";
import { ActionMenu } from "../_components/action-menu";
import { DashboardCharts } from "./dashboard-charts";
import type { StudentUpcomingEvent } from "./student-upcoming-events";
import { AnimatedMetricValue } from "./animated-metric-value";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type DashboardSearchParams = {
  school?: string | string[];
};

type PlatformSchoolOption = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
};

type StudentRoster = {
  id: string;
};

type UpcomingEvent = {
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
  cancellation_notice: string | null;
  poster_path: string | null;
};

type DashboardEventAttendee = {
  attendee_profile_id: string | null;
  event_id: string;
  permission_status: EventPermissionStatus;
  status: string;
  student_roster_id: string | null;
};

type DashboardClub = {
  id: string;
  name: string;
};

type DashboardResponsibleStaff = {
  full_name: string;
  id: string;
  role: "school_admin" | "teacher";
  status: "active" | "inactive";
};

type EventPermissionStatus =
  | "declined"
  | "not_required"
  | "pending"
  | "received";

type RecentCheckin = {
  id: string;
  checked_in_at: string;
  method: string;
  events: {
    title: string;
  } | null;
  student_rosters: {
    first_name: string;
    last_name: string;
  } | null;
};

type DashboardAnnouncement = {
  body: string;
  created_at: string;
  id: string;
  title: string;
};

type DashboardAnnouncementsResult = {
  announcements: DashboardAnnouncement[];
  failed: boolean;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const actor = await timeServer("dashboard.query.actor", () =>
    getCurrentEventActor(),
  );

  if (!actor) {
    redirect("/login");
  }

  const admin = createAdminClient();

  if (actor.isPlatformAdmin) {
    const supabase = await createClient();
    const params = await searchParams;
    const requestedSchoolId = getSearchValue(params.school);
    const platformSchoolResult = await getPlatformDashboardSchools(supabase);
    const selectedSchool = platformSchoolResult.schools.find(
      (school) => school.id === requestedSchoolId,
    );
    const analytics = selectedSchool
      ? await getPlatformSchoolAnalytics(admin, selectedSchool.id)
      : null;

    return (
      <PlatformDashboard
        analytics={analytics}
        locale={locale}
        schoolLoadFailed={Boolean(platformSchoolResult.errorCode)}
        schools={platformSchoolResult.schools}
        selectedSchool={selectedSchool ?? null}
        t={t}
        tf={tf}
      />
    );
  }

  const profile = actor.profile as Profile | null;

  if (!profile) {
    return (
      <DashboardShell
        description={t("dashboard.noProfile.description")}
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
      >
        <section className="section-card section-card-padded">
          <p className="text-sm text-slate-600">
            {t("dashboard.noProfile.guidance")}
          </p>
        </section>
      </DashboardShell>
    );
  }

  if (isSchoolStaff(profile)) {
    const announcementPromise =
      profile.role === "teacher"
        ? getLatestDashboardAnnouncements(
            await createClient(),
            profile.school_id,
          )
        : Promise.resolve(null);
    const [analytics, latestAnnouncements, identity] = await Promise.all([
      getStaffAnalytics(admin, profile.school_id),
      announcementPromise,
      getHomeIdentity(await createClient(), profile.id),
    ]);

    return (
      <StaffDashboard
        analytics={analytics}
        identity={identity}
        latestAnnouncements={latestAnnouncements}
        locale={locale}
        t={t}
        tf={tf}
      />
    );
  }

  const supabase = await createClient();
  const [analytics, baseUrl, latestAnnouncements, clubsForYou, identity] =
    await Promise.all([
      getStudentAnalytics(admin, profile),
      getServerBaseUrl(),
      getLatestDashboardAnnouncements(supabase, profile.school_id),
      getStudentClubsForYou(supabase, profile),
      getHomeIdentity(supabase, profile.id),
    ]);
  const [history, clubDetails] = await Promise.all([
    analytics.currentStudent
      ? getStudentActivityHistory(admin, profile.school_id, analytics.currentStudent.id)
      : Promise.resolve({ attended: 0, kinds: 0 }),
    getHomeClubDetails(supabase, [
      ...clubsForYou.joined.map((club) => club.id),
      ...clubsForYou.forYou.map(({ club }) => club.id),
      ...clubsForYou.open.slice(0, 5).map((club) => club.id),
    ]),
  ]);

  return (
    <StudentDashboard
      analytics={analytics}
      baseUrl={baseUrl}
      clubDetails={clubDetails}
      clubsForYou={clubsForYou}
      history={history}
      identity={identity}
      latestAnnouncements={latestAnnouncements}
      locale={locale}
      profile={profile}
      t={t}
      tf={tf}
    />
  );
}

function PlatformDashboard({
  analytics,
  locale,
  schoolLoadFailed,
  schools,
  selectedSchool,
  t,
  tf,
}: {
  analytics: Awaited<ReturnType<typeof getPlatformSchoolAnalytics>> | null;
  locale: Locale;
  schoolLoadFailed: boolean;
  schools: PlatformSchoolOption[];
  selectedSchool: PlatformSchoolOption | null;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  return (
    <DashboardShell
      description={t("dashboard.platform.description")}
      eyebrow={t("dashboard.platform.eyebrow")}
      title={t("dashboard.title")}
    >
      <section className="section-card section-card-padded min-w-0">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="section-title">
              {t("dashboard.platform.schoolContext")}
            </h2>
            <p className="section-description max-w-2xl">
              {t("dashboard.platform.selectSchool")}
            </p>
          </div>
          <form
            action="/dashboard"
            className="grid w-full max-w-xl gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          >
            <label className="min-w-0 text-sm font-semibold text-slate-800">
              <span className="mb-2 block">{t("events.platform.school")}</span>
              <select
                className="h-11 w-full min-w-0 rounded-md border px-3"
                defaultValue={selectedSchool?.id ?? ""}
                name="school"
              >
                <option value="">{t("dashboard.platform.schoolPlaceholder")}</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary min-h-11" type="submit">
              {t("common.open")}
            </button>
          </form>
        </div>
        {selectedSchool ? (
          <p className="mt-3 break-words text-sm font-semibold text-slate-700">
            {tf("dashboard.platform.selectedSchool", {
              school: selectedSchool.name,
            })}
          </p>
        ) : null}
      </section>

      {schoolLoadFailed ? (
        <section className="notice-box notice-warning" role="status">
          <p>{t("dashboard.platform.schoolsUnavailable")}</p>
        </section>
      ) : null}

      {!selectedSchool || !analytics ? (
        !schoolLoadFailed ? (
          <section className="section-card p-4">
            <EmptyState
              description={t("dashboard.platform.emptyDescription")}
              title={t("dashboard.platform.selectSchool")}
              visual="school"
            />
          </section>
        ) : null
      ) : (
        <>
          <section aria-labelledby="platform-dashboard-overview" className="space-y-3">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="section-title" id="platform-dashboard-overview">
                  {t("dashboard.analytics.overview")}
                </h2>
                <p className="section-description break-words">
                  {selectedSchool.name}
                </p>
              </div>
              <Link
                className="btn btn-secondary w-full sm:w-auto"
                href={`/events?school=${selectedSchool.id}`}
                prefetch={false}
              >
                {t("dashboard.analytics.viewDetails")}
                <PendingLinkIndicator />
              </Link>
            </div>
            <MetricGrid>
              <MetricCard
                href={`/events?school=${selectedSchool.id}`}
                label={t("dashboard.stats.upcomingEvents")}
                locale={locale}
                value={analytics.upcomingApprovedEvents}
              />
              <MetricCard
                label={t("dashboard.stats.activeClubs")}
                locale={locale}
                value={analytics.activeClubs}
              />
              <MetricCard
                label={t("dashboard.stats.upcomingRegistrations")}
                locale={locale}
                value={analytics.upcomingRegistrations}
              />
              <MetricCard
                label={t("dashboard.stats.recentParticipation")}
                locale={locale}
                value={analytics.recentParticipation}
              />
            </MetricGrid>
          </section>
          <DashboardCharts
            locale={locale}
            summary={analytics.activitySummary}
            t={t}
          />
        </>
      )}
    </DashboardShell>
  );
}

function StaffDashboard({
  analytics,
  identity,
  latestAnnouncements,
  locale,
  t,
  tf,
}: {
  analytics: Awaited<ReturnType<typeof getStaffAnalytics>>;
  identity: HomeIdentity;
  latestAnnouncements: DashboardAnnouncementsResult | null;
  locale: Locale;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const todo =
    (analytics.pendingApprovals > 0 ? 1 : 0) +
    (analytics.studentsWithoutInviteCodes > 0 ? 1 : 0);
  const clubNames = new Map(analytics.upcomingEventClubs.map((club) => [club.id, club.name]));
  const weeks = analytics.activitySummary.weeks.map((week) => week.count);
  const cardLabels = getHomeEventCardLabels(t);
  const stats = [
    { href: "/clubs", label: t("dashboard.stats.activeClubs"), spark: null, value: analytics.activeClubs },
    { href: "/events", label: t("dashboard.stats.upcomingEvents"), spark: weeks, value: analytics.upcomingApprovedEvents },
    { href: "/reports", label: t("dashboard.stats.upcomingRegistrations"), spark: null, value: analytics.upcomingRegistrations },
    { href: "/reports", label: t("dashboard.stats.recentParticipation"), spark: null, value: analytics.recentParticipation },
  ];

  return (
    <div className="cl-page">
      <PageHead
        action={<DashboardHeaderActions t={t} />}
        subtitle={tf("dashboard.home.staffSubtitle", {
          events: analytics.upcomingApprovedEvents,
          todo,
        })}
        title={
          identity.firstName
            ? `${greetingFor(identity.timeZone, t)}, ${identity.firstName}`
            : greetingFor(identity.timeZone, t)
        }
      />

      <section aria-label={t("dashboard.analytics.overview")} className="cl-stats">
        {stats.map((stat) => (
          <Link
            aria-label={`${stat.label}: ${formatNumber(stat.value, locale)}`}
            className="cl-card cl-stat"
            href={stat.href}
            key={stat.label}
            prefetch={false}
          >
            <span className="cl-muted">{stat.label}</span>
            <b>{formatNumber(stat.value, locale)}</b>
            {stat.spark && Math.max(...stat.spark) > 0 ? (
              <span aria-hidden="true" className="cl-spark">
                {stat.spark.map((count, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${Math.max(12, (count / Math.max(...stat.spark)) * 100)}%`,
                    }}
                  />
                ))}
              </span>
            ) : null}
          </Link>
        ))}
      </section>

      <div className="cl-split">
        <div className="cl-main">
          <NeedsAttention analytics={analytics} locale={locale} t={t} />

          <Section
            link={{ href: "/events", label: t("dashboard.home.allEvents") }}
            title={t("dashboard.home.thisWeek")}
          >
            <WeekStrip
              days={buildWeekDays(
                analytics.upcomingEvents.map((event) => ({
                  category: event.category,
                  id: event.id,
                  startsAt: event.starts_at,
                })),
                identity.timeZone,
                locale,
                t("dashboard.home.today"),
              )}
              label={t("dashboard.home.thisWeek")}
            />
            {analytics.upcomingEvents.length ? (
              <div className="cl-egrid">
                {analytics.upcomingEvents.slice(0, 4).map((event) => {
                  const attendees = analytics.upcomingEventAttendees.filter(
                    (attendee) => attendee.event_id === event.id,
                  ).length;
                  const tile = formatCalendarDateBadge(event.starts_at, locale);
                  const categoryKey = event.category
                    ? getActivityCategoryTranslationKey(event.category)
                    : null;

                  return (
                    <EventCard
                      action={
                        <ActionMenu
                          items={[
                            { href: `/events/${event.id}/attendance`, label: t("dashboard.home.attendanceQr") },
                            { href: `/events/${event.id}`, label: t("dashboard.home.openEvent") },
                          ]}
                          label={t("common.moreActions")}
                        />
                      }
                      event={{
                        attendeeCount: attendees,
                        canJoin: false,
                        capacity: event.capacity,
                        categoryLabel: categoryKey ? t(categoryKey) : event.category,
                        categoryValue: event.category,
                        day: String(Number(tile.day)),
                        hostName: (event.club_id && clubNames.get(event.club_id)) || identity.schoolName,
                        id: event.id,
                        isFull: false,
                        location: event.location,
                        month: tile.month,
                        posterUrl: event.poster_path
                          ? getEventPosterDeliveryUrl(event.id, event.poster_path)
                          : null,
                        registrationStatus: null,
                        title: event.title,
                        whenLabel: formatInZone(event.starts_at, identity.timeZone, locale, {
                          hour: "numeric",
                          minute: "2-digit",
                          weekday: "long",
                        }),
                      }}
                      key={event.id}
                      labels={cardLabels}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="cl-card cl-empty">{t("dashboard.upcoming.emptyTitle")}</p>
            )}
          </Section>

          {latestAnnouncements ? (
            <LatestAnnouncementsSection
              locale={locale}
              result={latestAnnouncements}
              showCreateAction
              t={t}
              tf={tf}
            />
          ) : null}

          <NextSteps analytics={analytics} t={t} tf={tf} />
        </div>

        <aside className="cl-side">
          <RecentCheckinsSection
            checkins={analytics.recentCheckins}
            locale={locale}
            t={t}
          />
          <Widget title={t("dashboard.home.byCategory")}>
            {analytics.activitySummary.categories.length ? (
              analytics.activitySummary.categories.slice(0, 6).map((item) => {
                const key = getActivityCategoryTranslationKey(item.category);
                const max = Math.max(...analytics.activitySummary.categories.map((c) => c.count));

                return (
                  <div className="cl-goal" key={item.category}>
                    <div>
                      <span>{key ? t(key) : item.category}</span>
                      <b>{item.count}</b>
                    </div>
                    <div className="cl-bar" style={colorVar(categoryColor(item.category))}>
                      <i style={{ width: `${(item.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--muted)]">{t("dashboard.upcoming.emptyTitle")}</p>
            )}
          </Widget>
        </aside>
      </div>
    </div>
  );
}

function StudentDashboard({
  analytics,
  baseUrl,
  clubDetails,
  clubsForYou,
  history,
  identity,
  latestAnnouncements,
  locale,
  profile,
  t,
  tf,
}: {
  analytics: Awaited<ReturnType<typeof getStudentAnalytics>>;
  baseUrl: string;
  clubDetails: Map<string, HomeClubDetail>;
  clubsForYou: StudentClubsForYou;
  history: { attended: number; kinds: number };
  identity: HomeIdentity;
  latestAnnouncements: DashboardAnnouncementsResult;
  locale: Locale;
  profile: Profile;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const events = buildStudentQuickViewEvents(analytics, profile, locale, t, baseUrl);
  const startsById = new Map(
    analytics.upcomingEvents.map((event) => [event.id, event.starts_at]),
  );
  const mine = events.filter(
    (event) =>
      event.registrationStatus === "registered" ||
      event.registrationStatus === "attended",
  );
  const next = mine[0] ?? events[0] ?? null;
  const nextStartsAt = next ? startsById.get(next.id) ?? null : null;
  const cardLabels = getHomeEventCardLabels(t);
  const goals = [
    { label: t("dashboard.home.goalFirstClub"), total: 1, value: Math.min(analytics.joinedClubs, 1) },
    { label: t("dashboard.home.goalKinds"), total: 3, value: Math.min(history.kinds, 3) },
    { label: t("dashboard.home.goalAttend"), total: 5, value: Math.min(history.attended, 5) },
  ];

  return (
    <div className="cl-page">
      <PageHead
        subtitle={
          identity.schoolName
            ? tf("dashboard.home.subtitle", { school: identity.schoolName })
            : undefined
        }
        title={
          identity.firstName
            ? `${greetingFor(identity.timeZone, t)}, ${identity.firstName}`
            : greetingFor(identity.timeZone, t)
        }
      />

      {!analytics.currentStudent ? (
        <p className="notice-box notice-warning">
          {t("dashboard.student.noRosterWarning")}
        </p>
      ) : (
        <p className="cl-statline">
          <span>
            <b>{formatNumber(analytics.registeredUpcomingEvents, locale)}</b>
            {t("dashboard.statline.going")}
          </span>
          <span>
            <b>{formatNumber(analytics.joinedClubs, locale)}</b>
            {t("dashboard.statline.clubs")}
          </span>
          <span>
            <b>{formatNumber(history.attended, locale)}</b>
            {t("dashboard.home.attended")}
          </span>
        </p>
      )}

      {next ? (
        <Link className="cl-card cl-upnext" href={`/events/${next.id}`} prefetch={false}>
          <span className="min-w-0">
            <small>
              {mine.length ? t("dashboard.home.upNextForYou") : t("dashboard.home.comingUpNext")}
              {nextStartsAt
                ? ` · ${formatInZone(nextStartsAt, identity.timeZone, locale, { weekday: "long" })}`
                : ""}
            </small>
            <b className="cl-upnext-title">{next.title}</b>
            <span className="block text-[var(--muted)]">
              {nextStartsAt
                ? `${formatInZone(nextStartsAt, identity.timeZone, locale, {
                    day: "numeric",
                    month: "long",
                    weekday: "long",
                  })} · ${formatInZone(nextStartsAt, identity.timeZone, locale, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : next.dateTimeLabel}
            </span>
            {next.location ? (
              <span className="mt-1 flex items-center gap-1.5 text-[var(--muted)]">
                <PinIcon />
                {next.location}
              </span>
            ) : null}
            <span className="mt-2.5 block text-[13px] text-[var(--muted)]">
              <b className="inline text-[15px] text-[var(--foreground)]">{next.attendeeCount}</b>{" "}
              {cardLabels.goingCount}
            </span>
          </span>
          <Cover
            category={next.categoryValue}
            className="cl-sq"
            imageUrl={next.posterUrl}
            initials={initialsOf(next.hostName || next.title)}
          />
        </Link>
      ) : null}

      <WeekStrip
        days={buildWeekDays(
          analytics.upcomingEvents.map((event) => ({
            category: event.category,
            id: event.id,
            startsAt: event.starts_at,
          })),
          identity.timeZone,
          locale,
          t("dashboard.home.today"),
        )}
        label={t("dashboard.home.thisWeek")}
      />

      <div className="cl-split">
        <div className="cl-main">
          <StudentUpcomingEventsGrid
            events={events.slice(0, 4).map((event) => ({
              attendeeCount: event.attendeeCount,
              canJoin:
                event.status === "approved" &&
                event.hasCurrentStudent &&
                event.canRegister,
              capacity: event.capacity,
              categoryLabel: event.categoryLabel,
              categoryValue: event.categoryValue,
              day: event.tileDay,
              hostName: event.hostName,
              id: event.id,
              isFull: event.isFull,
              location: event.location,
              month: event.tileMonth,
              posterUrl: event.posterUrl,
              registrationStatus: event.registrationStatus,
              title: event.title,
              whenLabel: startsById.get(event.id)
                ? formatInZone(startsById.get(event.id) as string, identity.timeZone, locale, {
                    hour: "numeric",
                    minute: "2-digit",
                    weekday: "long",
                  })
                : event.dateTimeLabel,
            }))}
            labels={cardLabels}
            t={t}
            tf={tf}
            total={events.length}
          />

          <StudentClubsForYouSection
            clubDetails={clubDetails}
            clubsForYou={clubsForYou}
            t={t}
            tf={tf}
          />
        </div>

        <aside className="cl-side">
          <StudentMyClubsSection clubDetails={clubDetails} clubs={clubsForYou.joined} t={t} />

          <Widget
            link={{ href: "/portfolio", label: t("dashboard.home.addToPortfolio") }}
            title={t("dashboard.home.yourGoals")}
          >
            {goals.map((goal) => (
              <div className="cl-goal" key={goal.label}>
                <div>
                  <span>{goal.label}</span>
                  <b>
                    {goal.value}/{goal.total}
                  </b>
                </div>
                <div
                  className="cl-bar"
                  style={colorVar(goal.value >= goal.total ? "var(--cl-green)" : "var(--cl-sun)")}
                >
                  <i style={{ width: `${(goal.value / goal.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </Widget>

          <LatestAnnouncementsSection
            compact
            locale={locale}
            result={latestAnnouncements}
            showCreateAction={false}
            t={t}
            tf={tf}
          />
        </aside>
      </div>
    </div>
  );
}

function StudentUpcomingEventsGrid({
  events,
  labels,
  t,
  tf,
  total,
}: {
  events: CleanEventCardData[];
  labels: CleanEventCardLabels;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
  total: number;
}) {
  return (
    <Section
      link={
        total
          ? { href: "/events", label: tf("dashboard.home.seeAll", { count: total }) }
          : undefined
      }
      title={t("dashboard.home.comingUp")}
    >
      {events.length ? (
        <div className="cl-egrid">
          {events.map((event) => (
            <EventCard event={event} key={event.id} labels={labels} />
          ))}
        </div>
      ) : (
        <p className="cl-card cl-empty">{t("dashboard.upcoming.emptyTitle")}</p>
      )}
    </Section>
  );
}

function getHomeEventCardLabels(t: (key: string) => string): CleanEventCardLabels {
  return {
    full: t("dashboard.home.full"),
    going: t("dashboard.home.going"),
    goingCount: t("dashboard.home.goingCount"),
    join: t("dashboard.home.join"),
    joining: t("dashboard.home.joining"),
    spotsLeft: t("dashboard.home.spotsLeft"),
  };
}

type HomeClubDetail = {
  logoUrl: string | null;
  schedule: string | null;
};

// Meeting times and logos for the clubs shown on Home, under RLS.
async function getHomeClubDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubIds: string[],
) {
  const ids = Array.from(new Set(clubIds));
  const details = new Map<string, HomeClubDetail>();

  if (!ids.length) return details;

  const { data } = await timeServer("dashboard.query.home-club-details", () =>
    supabase
      .from("club_profiles")
      .select("club_id, meeting_schedule, logo_path, updated_at")
      .in("club_id", ids)
      .returns<
        Array<{
          club_id: string;
          logo_path: string | null;
          meeting_schedule: string | null;
          updated_at: string | null;
        }>
      >(),
  );

  for (const row of data ?? []) {
    details.set(row.club_id, {
      logoUrl: row.logo_path
        ? `/clubs/${row.club_id}/media/logo?v=${encodeURIComponent(row.updated_at ?? "")}`
        : null,
      schedule: row.meeting_schedule,
    });
  }

  return details;
}

function greetingFor(timeZone: string, t: (key: string) => string) {
  let hour = new Date().getUTCHours();

  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(
        new Date(),
      ),
    ) % 24;
  } catch {
    // Unknown time zone: fall back to UTC.
  }

  return hour < 12
    ? t("dashboard.home.goodMorning")
    : hour < 18
      ? t("dashboard.home.goodAfternoon")
      : t("dashboard.home.goodEvening");
}

function formatInZone(
  value: string,
  timeZone: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
) {
  try {
    return new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", {
      ...options,
      timeZone,
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", options).format(
      new Date(value),
    );
  }
}

function dayKeyInZone(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function buildWeekDays(
  events: Array<{ category: string | null; id: string; startsAt: string }>,
  timeZone: string,
  locale: Locale,
  todayLabel: string,
): WeekDay[] {
  const now = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() + index * 24 * 60 * 60 * 1000);
    const key = dayKeyInZone(date, timeZone);
    const onDay = events.filter((event) => dayKeyInZone(new Date(event.startsAt), timeZone) === key);

    return {
      colors: onDay.map((event) => categoryColor(event.category)),
      day: Number(key.slice(8, 10)),
      href: onDay[0] ? `/events/${onDay[0].id}` : "/events",
      isToday: index === 0,
      label: index === 0 ? todayLabel : formatInZone(date.toISOString(), timeZone, locale, { weekday: "short" }),
    };
  });
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-[15px] w-[15px] flex-none" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

type StudentClubsForYou = {
  available: boolean;
  // Every club matching the student's interests is one they already joined.
  allMatchesJoined: boolean;
  forYou: ClubsForInterests<StudentHomeClub>["forYou"];
  hasInterests: boolean;
  // Interests with no club at all at the school, joined or not.
  interestsWithoutClubs: string[];
  joined: StudentHomeClub[];
  // Active clubs the student has not joined, shown before interests are picked.
  open: StudentHomeClub[];
};

type StudentHomeClub = {
  category: string | null;
  id: string;
  name: string;
};

// Runs as the signed-in student, under RLS. Clubs the student already belongs
// to are left out, so home only suggests something new.
async function getStudentClubsForYou(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile,
): Promise<StudentClubsForYou> {
  const [{ available, interests }, { data: clubs }, { data: roster }] =
    await Promise.all([
      loadStudentInterests(supabase, profile.id),
      supabase
        .from("clubs")
        .select("id, name, category")
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .order("name")
        .returns<StudentHomeClub[]>(),
      supabase
        .from("student_rosters")
        .select("id")
        .eq("school_id", profile.school_id)
        .eq("profile_id", profile.id)
        .eq("status", "active")
        .maybeSingle<{ id: string }>(),
    ]);
  const { data: memberships } = roster
    ? await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("school_id", profile.school_id)
        .eq("student_roster_id", roster.id)
        .eq("status", "active")
        .returns<{ club_id: string }[]>()
    : { data: [] };
  const joined = new Set((memberships ?? []).map((row) => row.club_id));
  const allClubs = clubs ?? [];
  const everyMatch = matchClubsToInterests(allClubs, interests, allClubs.length);
  const notJoined = matchClubsToInterests(
    allClubs.filter((club) => !joined.has(club.id)),
    interests,
    3,
  );

  return {
    allMatchesJoined:
      everyMatch.forYou.length > 0 && notJoined.forYou.length === 0,
    available,
    forYou: notJoined.forYou,
    hasInterests: interests.length > 0,
    interestsWithoutClubs: everyMatch.interestsWithoutClubs,
    joined: allClubs.filter((club) => joined.has(club.id)),
    open: allClubs.filter((club) => !joined.has(club.id)),
  };
}

function StudentClubRow({
  club,
  detail,
  label,
  logoUrl,
}: {
  club: StudentHomeClub;
  detail: string | null;
  label?: string | null;
  logoUrl?: string | null;
}) {
  return (
    <Link className="cl-row" href={`/clubs/${club.id}`} prefetch={false}>
      <ClubAvatar category={club.category} logoUrl={logoUrl} name={club.name} size={40} />
      <span className="cl-grow">
        <span className="cl-row-title">{club.name}</span>
        {detail ? <span className="cl-row-sub">{detail}</span> : null}
      </span>
      {label && club.category ? (
        <CategoryLabel category={club.category} label={label} />
      ) : null}
    </Link>
  );
}

function StudentMyClubsSection({
  clubDetails,
  clubs,
  t,
}: {
  clubDetails: Map<string, HomeClubDetail>;
  clubs: StudentHomeClub[];
  t: (key: string) => string;
}) {
  return (
    <Widget title={t("dashboard.home.yourClubs")}>
      {clubs.length ? (
        <div className="-mx-1 flex flex-col">
          {clubs.map((club) => (
            <Link
              className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-[var(--cl-hover)]"
              href={`/clubs/${club.id}`}
              key={club.id}
              prefetch={false}
            >
              <ClubAvatar
                category={club.category}
                logoUrl={clubDetails.get(club.id)?.logoUrl}
                name={club.name}
              />
              <span className="cl-grow">
                <span className="cl-row-title text-sm">{club.name}</span>
                {clubDetails.get(club.id)?.schedule ? (
                  <span className="cl-row-sub text-[12.5px]">
                    {clubDetails.get(club.id)?.schedule}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">{t("studentProfile.clubs.empty")}</p>
          <Link className="cl-widget-link" href="/clubs" prefetch={false}>
            {t("studentProfile.clubs.find")} →
          </Link>
        </>
      )}
    </Widget>
  );
}

function StudentClubsForYouSection({
  clubDetails,
  clubsForYou,
  t,
  tf,
}: {
  clubDetails: Map<string, HomeClubDetail>;
  clubsForYou: StudentClubsForYou;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const {
    allMatchesJoined,
    available,
    forYou,
    hasInterests,
    interestsWithoutClubs,
    open,
  } = clubsForYou;
  const allClubs = { href: "/clubs", label: t("dashboard.home.allClubs") };

  // Before interests are picked, list the open clubs so a student always
  // sees what they can join.
  if (!hasInterests) {
    if (!available && !open.length) {
      return null;
    }

    return (
      <Section link={allClubs} title={t("dashboard.home.clubsYouMightLike")}>
        {available ? (
          <Link className="cl-card cl-row" href="/profile/interests" prefetch={false}>
            <span className="cl-grow">
              <span className="cl-row-title">{t("studentProfile.clubsForYou.promptTitle")}</span>
              <span className="cl-row-sub">{t("studentProfile.clubsForYou.promptDescription")}</span>
            </span>
            <span className="cl-btn-soft">{t("studentProfile.interests.pick")}</span>
          </Link>
        ) : null}
        {open.length ? (
          <div className="cl-card cl-rows">
            {open.slice(0, 5).map((club) => (
              <StudentClubRow
                club={club}
                detail={clubDetails.get(club.id)?.schedule ?? null}
                key={club.id}
                label={club.category ? studentCategoryLabel(club.category, t) : null}
                logoUrl={clubDetails.get(club.id)?.logoUrl}
              />
            ))}
          </div>
        ) : null}
      </Section>
    );
  }

  return (
    <Section link={allClubs} title={t("dashboard.home.clubsYouMightLike")}>
      {forYou.length ? (
        <div className="cl-card cl-rows">
          {forYou.map(({ club, matchedInterest }) => (
            <StudentClubRow
              club={club}
              detail={
                clubDetails.get(club.id)?.schedule ??
                tf("studentProfile.clubsForYou.reason", {
                  interest: studentCategoryLabel(matchedInterest, t),
                })
              }
              key={club.id}
              label={club.category ? studentCategoryLabel(club.category, t) : null}
              logoUrl={clubDetails.get(club.id)?.logoUrl}
            />
          ))}
        </div>
      ) : allMatchesJoined ? (
        <p className="cl-card cl-empty">
          {t("studentProfile.clubsForYou.noneLeft")}
        </p>
      ) : null}
      {!forYou.length && interestsWithoutClubs.length ? (
        <div className="cl-card cl-rows">
          {interestsWithoutClubs.map((interest) => (
            <div className="cl-row" key={interest}>
              <span className="cl-grow text-sm text-[var(--muted)]">
                {tf("studentProfile.clubsForYou.noClubYet", {
                  interest: studentCategoryLabel(interest, t),
                })}
              </span>
              <Link className="cl-btn-soft" href="/club-requests" prefetch={false}>
                {t("studentProfile.clubsForYou.propose")}
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function studentCategoryLabel(category: string, t: (key: string) => string) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}

function LatestAnnouncementsSection({
  compact = false,
  locale,
  result,
  showCreateAction,
  t,
  tf,
}: {
  compact?: boolean;
  locale: Locale;
  result: DashboardAnnouncementsResult;
  showCreateAction: boolean;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  if (compact) {
    return (
      <Widget
        link={{ href: "/announcements", label: t("dashboard.home.allNotices") }}
        title={t("dashboard.home.notices")}
      >
        {result.failed ? (
          <p className="text-sm text-[var(--muted)]">
            {t("dashboard.latestAnnouncements.unavailableTitle")}
          </p>
        ) : result.announcements.length ? (
          result.announcements.slice(0, 2).map((announcement) => (
            <div className="min-w-0" key={announcement.id}>
              <b className="block break-words text-sm">{announcement.title}</b>
              <p className="mt-0.5 line-clamp-3 break-words text-[13px] text-[var(--muted)]">
                {announcement.body}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {t("dashboard.latestAnnouncements.emptyTitle")}
          </p>
        )}
      </Widget>
    );
  }

  return (
    <section
      aria-labelledby="dashboard-latest-announcements-title"
      className="section-card"
    >
      <div className="section-header">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              className="section-title break-words"
              id="dashboard-latest-announcements-title"
            >
              {t("dashboard.latestAnnouncements.title")}
            </h2>
            <p className="section-description break-words">
              {t("dashboard.latestAnnouncements.description")}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {showCreateAction ? (
              <HeaderActionLink href="/announcements">
                {t("announcements.actions.create")}
              </HeaderActionLink>
            ) : null}
            <HeaderActionLink href="/announcements" variant="secondary">
              {t("dashboard.latestAnnouncements.viewAll")}
            </HeaderActionLink>
          </div>
        </div>
      </div>

      {result.failed ? (
        <div className="p-3 sm:p-4">
          <div className="notice-box notice-warning">
            <p className="font-bold text-slate-950">
              {t("dashboard.latestAnnouncements.unavailableTitle")}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {t("dashboard.latestAnnouncements.unavailableDescription")}
            </p>
          </div>
        </div>
      ) : result.announcements.length ? (
        <ul className="divide-y divide-slate-200">
          {result.announcements.map((announcement) => (
            <li className="min-w-0 p-3 sm:p-4" key={announcement.id}>
              <h3 className="break-words text-base font-bold leading-snug text-slate-950">
                {announcement.title}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {tf("dashboard.latestAnnouncements.postedAt", {
                  date: formatDateTime(announcement.created_at, locale),
                })}
              </p>
              <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm leading-6 text-slate-700">
                {announcement.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-3 sm:p-4">
          <EmptyState
            description={t("dashboard.latestAnnouncements.emptyDescription")}
            title={t("dashboard.latestAnnouncements.emptyTitle")}
          />
        </div>
      )}
    </section>
  );
}

function DashboardShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="dashboard-sequence page-stack">
      <PageHeader
        actions={actions}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      {children}
    </div>
  );
}

function DashboardHeaderActions({ t }: { t: (key: string) => string }) {
  // One main button. Everything staff can create lives in its menu.
  return (
    <ActionMenu
      buttonClassName="btn btn-primary min-h-11 gap-1.5"
      buttonLabel={<>+ {t("dashboard.home.newMenu")}</>}
      items={[
        {
          hint: t("dashboard.quickActions.createEvent.description"),
          href: "/events#create-event",
          label: t("dashboard.quickActions.createEvent.label"),
        },
        { href: "/clubs#create-club", label: t("dashboard.quickActions.createClub.label") },
        { href: "/announcements", label: t("announcements.actions.create") },
        "divider",
        { href: "/students#add-student", label: t("dashboard.quickActions.addStudents.label") },
        { href: "/invite-codes#generate-invite", label: t("dashboard.quickActions.generateInviteCodes.label") },
        { href: "/reports", label: t("dashboard.quickActions.viewReports.label") },
      ]}
      label={t("dashboard.home.newMenu")}
    />
  );
}

function NextSteps({
  analytics,
  t,
  tf,
}: {
  analytics: Awaited<ReturnType<typeof getStaffAnalytics>>;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const inviteCodesMissing =
    analytics.activeStudents > 0 &&
    analytics.activeInviteCodes < analytics.activeStudents;
  const steps = [
    {
      action: t("dashboard.nextSteps.steps.addStudents.title"),
      description: t("dashboard.nextSteps.steps.addStudents.description"),
      href: "/students",
      status:
        analytics.activeStudents > 0
          ? "complete"
          : ("next" as const),
    },
    {
      action: t("dashboard.nextSteps.steps.generateInviteCodes.title"),
      description: t(
        "dashboard.nextSteps.steps.generateInviteCodes.description",
      ),
      href: "/invite-codes",
      status:
        analytics.activeStudents === 0
          ? "locked"
          : inviteCodesMissing
            ? "next"
            : "complete",
    },
    {
      action: t("dashboard.nextSteps.steps.studentsJoin.title"),
      description: t("dashboard.nextSteps.steps.studentsJoin.description"),
      href: "/invite-codes",
      status:
        analytics.activeInviteCodes > 0 || analytics.upcomingRegistrations > 0
          ? "ready"
          : "locked",
    },
    {
      action: t("dashboard.nextSteps.steps.createClubs.title"),
      description: t("dashboard.nextSteps.steps.createClubs.description"),
      href: "/clubs",
      status:
        analytics.activeClubs > 0
          ? "complete"
          : analytics.activeStudents > 0
            ? "next"
            : "locked",
    },
    {
      action: t("dashboard.nextSteps.steps.createEvents.title"),
      description: t("dashboard.nextSteps.steps.createEvents.description"),
      href: "/events",
      status:
        analytics.upcomingApprovedEvents > 0
          ? "complete"
          : analytics.activeStudents > 0
            ? "next"
            : "locked",
    },
    {
      action: t("dashboard.nextSteps.steps.trackAttendance.title"),
      description: t("dashboard.nextSteps.steps.trackAttendance.description"),
      href: "/events",
      status:
        analytics.recentParticipation > 0
          ? "complete"
          : analytics.upcomingApprovedEvents > 0
            ? "next"
            : "locked",
    },
    {
      action: t("dashboard.nextSteps.steps.viewReports.title"),
      description: t("dashboard.nextSteps.steps.viewReports.description"),
      href: "/reports",
      status:
        analytics.upcomingRegistrations > 0 ||
        analytics.recentParticipation > 0
          ? "ready"
          : "locked",
    },
  ] satisfies Array<{
    action: string;
    description: string;
    href: string;
    status: "complete" | "locked" | "next" | "ready";
  }>;

  return (
    <DetailsDisclosure label={t("dashboard.nextSteps.title")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="section-description">
          {t("dashboard.nextSteps.description")}
        </p>
        <p className="text-sm font-semibold text-slate-600">
          {analytics.activeInviteCodes}{" "}
          {t("dashboard.nextSteps.activeInviteCodes")}
        </p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <Link
            className="interactive-card group rounded-md border border-slate-200 bg-white p-3 shadow-sm"
            href={step.href}
            key={step.action}
            prefetch={false}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  {tf("dashboard.nextSteps.stepLabel", {
                    number: index + 1,
                  })}
                </p>
                <h3 className="mt-2 text-base font-bold text-slate-950 transition group-hover:text-teal-800">
                  {step.action}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StepStatusBadge status={step.status} t={t} />
                <PendingLinkIndicator />
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {step.description}
            </p>
          </Link>
        ))}
      </div>
    </DetailsDisclosure>
  );
}

function StepStatusBadge({
  status,
  t,
}: {
  status: "complete" | "locked" | "next" | "ready";
  t: (key: string) => string;
}) {
  if (status === "complete") {
    return (
      <StatusBadge variant="success">
        {t("dashboard.nextSteps.status.done")}
      </StatusBadge>
    );
  }

  if (status === "next") {
    return (
      <StatusBadge variant="warning">
        {t("dashboard.nextSteps.status.next")}
      </StatusBadge>
    );
  }

  if (status === "ready") {
    return (
      <StatusBadge variant="info">
        {t("dashboard.nextSteps.status.ready")}
      </StatusBadge>
    );
  }

  return <StatusBadge>{t("dashboard.nextSteps.status.later")}</StatusBadge>;
}

function NeedsAttention({
  analytics,
  locale,
  t,
}: {
  analytics: Awaited<ReturnType<typeof getStaffAnalytics>>;
  locale: Locale;
  t: (key: string) => string;
}) {
  const attentionItems = [
    analytics.pendingApprovals > 0
      ? {
          action: t("common.open"),
          count: analytics.pendingApprovals,
          description: t("approvals.description"),
          href: "/approvals",
          title: t("nav.approvals"),
          variant: "warning" as const,
        }
      : null,
    analytics.studentsWithoutInviteCodes > 0
      ? {
          action: t("common.open"),
          count: analytics.studentsWithoutInviteCodes,
          description: t("dashboard.quickActions.generateInviteCodes.description"),
          href: "/invite-codes",
          title: t("dashboard.nextSteps.steps.generateInviteCodes.title"),
          variant: "info" as const,
        }
      : null,
    analytics.upcomingEvents.length > 0
      ? {
          action: t("common.viewAll"),
          count: analytics.upcomingEvents.length,
          description: t("dashboard.upcoming.description"),
          href: "/events",
          title: t("dashboard.upcoming.title"),
          variant: "success" as const,
        }
      : null,
    analytics.recentCheckins.length > 0
      ? {
          action: t("common.viewAll"),
          count: analytics.recentCheckins.length,
          description: t("dashboard.checkins.description"),
          href: "/reports",
          title: t("dashboard.checkins.title"),
          variant: "default" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <Section title={t("dashboard.home.needsYou")}>
      {attentionItems.length ? (
        <ul className="divide-y divide-[var(--cl-line)] cl-card overflow-hidden">
          {attentionItems.map((item) => (
            <li key={item.title}>
              <Link
                aria-label={`${item.title}: ${formatNumber(item.count, locale)}. ${item.action}`}
                className="cl-row"
                href={item.href}
                prefetch={false}
              >
                <span className="cl-dot" style={colorVar(attentionColor(item.variant))} />
                <span className="cl-grow">
                  <span className="cl-row-title">
                    {formatNumber(item.count, locale)} · {item.title}
                  </span>
                  <span className="cl-row-sub">{item.description}</span>
                </span>
                <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cl-card cl-empty">{t("dashboard.attention.emptyTitle")}</p>
      )}
    </Section>
  );
}

function attentionColor(variant: "default" | "info" | "success" | "warning") {
  return variant === "warning"
    ? "var(--cl-amber)"
    : variant === "info"
      ? "var(--cl-coral)"
      : variant === "success"
        ? "var(--primary)"
        : "var(--cl-faint)";
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {children}
    </section>
  );
}

function MetricCard({
  href,
  label,
  locale,
  value,
}: {
  href?: string;
  label: string;
  locale: Locale;
  value: number;
}) {
  const content = (
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value dashboard-metric-value-enter">
        <AnimatedMetricValue key={value} locale={locale} value={value} />
      </p>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      aria-label={`${label}: ${formatNumber(value, locale)}`}
      className="interactive-card group relative block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      href={href}
      prefetch={false}
    >
      {content}
      <PendingLinkIndicator className="absolute right-3 top-3" />
    </Link>
  );
}

function RecentCheckinsSection({
  checkins,
  locale,
  t,
}: {
  checkins: RecentCheckin[];
  locale: Locale;
  t: (key: string) => string;
}) {
  return (
    <Widget title={t("dashboard.checkins.title")}>
      {checkins.length ? (
        <div className="cl-feed">
          {checkins.slice(0, 5).map((checkin) => {
            const name = studentName(checkin.student_rosters, t);

            return (
              <div key={checkin.id}>
                <span aria-hidden="true" className="cl-av">
                  {initialsOf(name)}
                </span>
                <span className="min-w-0">
                  {name} · <b>{checkin.events?.title ?? t("dashboard.fallback.event")}</b>
                  <span className="cl-row-sub text-[12.5px]">
                    {formatDateTime(checkin.checked_in_at, locale)} ·{" "}
                    {checkInMethodLabel(checkin.method, t)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">{t("dashboard.checkins.emptyTitle")}</p>
      )}
    </Widget>
  );
}

async function getStaffAnalytics(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const range = getDashboardActivityRange(nowDate);
  const recentSince = new Date(
    nowDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const [
    activeStudents,
    activeInviteCodes,
    activeClubs,
    upcomingRegistrations,
    recentParticipation,
    activityEvents,
    upcomingEvents,
    recentCheckins,
    pendingApprovals,
  ] = await Promise.all([
    getActiveStudentCount(admin, schoolId),
    getActiveInviteCodeCount(admin, schoolId, now),
    getActiveClubCount(admin, schoolId),
    getUpcomingRegistrationCount(admin, schoolId, now),
    getRecentParticipationCount(admin, schoolId, recentSince),
    getDashboardActivityEvents(admin, schoolId, range.startsAt, range.endsAt),
    getUpcomingEvents(admin, schoolId, now),
    getRecentCheckins(admin, schoolId),
    getPendingApprovalEventCount(admin, schoolId),
  ]);
  const activitySummary = buildDashboardActivitySummary(activityEvents, nowDate);
  const upcomingContext = await getStudentUpcomingEventContext(
    admin,
    schoolId,
    upcomingEvents,
  );
  const studentsWithoutInviteCodes = Math.max(
    activeStudents - activeInviteCodes,
    0,
  );

  return {
    activeInviteCodes,
    activeStudents,
    activeClubs,
    activitySummary,
    pendingApprovals,
    recentParticipation,
    studentsWithoutInviteCodes,
    upcomingApprovedEvents: activitySummary.total,
    upcomingRegistrations,
    upcomingEvents,
    upcomingEventAttendees: upcomingContext.upcomingEventAttendees,
    upcomingEventClubs: upcomingContext.upcomingEventClubs,
    recentCheckins,
  };
}

async function getLatestDashboardAnnouncements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
): Promise<DashboardAnnouncementsResult> {
  const { data, error } = await timeServer(
    "dashboard.query.latest-announcements",
    () =>
      supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3)
        .returns<DashboardAnnouncement[]>(),
  );

  if (error) {
    console.error("dashboard.query.latest-announcements failed", {
      code: error.code,
    });

    return { announcements: [], failed: true };
  }

  return { announcements: data ?? [], failed: false };
}

async function getStudentAnalytics(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
) {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const range = getDashboardActivityRange(nowDate);
  const recentSince = new Date(
    nowDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const [currentStudent, upcomingEvents, activityEvents] = await Promise.all([
    getCurrentStudent(admin, profile),
    getUpcomingEvents(admin, profile.school_id, now),
    getDashboardActivityEvents(
      admin,
      profile.school_id,
      range.startsAt,
      range.endsAt,
    ),
  ]);
  const activitySummary = buildDashboardActivitySummary(activityEvents, nowDate);
  const eventContextPromise = getStudentUpcomingEventContext(
    admin,
    profile.school_id,
    upcomingEvents,
  );

  if (!currentStudent) {
    const eventContext = await eventContextPromise;

    return {
      activitySummary,
      currentStudent,
      ...eventContext,
      joinedClubs: 0,
      recentParticipation: 0,
      registeredUpcomingEvents: 0,
      upcomingEvents,
    };
  }

  const [
    joinedClubs,
    registeredUpcomingEvents,
    recentParticipation,
    eventContext,
  ] = await Promise.all([
    getJoinedClubCount(admin, profile.school_id, currentStudent.id),
    getRegisteredUpcomingEventCount(
      admin,
      profile.school_id,
      currentStudent.id,
      now,
    ),
    getStudentRecentParticipationCount(admin, profile.id, recentSince),
    eventContextPromise,
  ]);

  return {
    activitySummary,
    currentStudent,
    ...eventContext,
    joinedClubs,
    recentParticipation,
    registeredUpcomingEvents,
    upcomingEvents,
  };
}

async function getPlatformSchoolAnalytics(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const range = getDashboardActivityRange(nowDate);
  const recentSince = new Date(
    nowDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const [activeClubs, upcomingRegistrations, recentParticipation, activityEvents] =
    await Promise.all([
      getActiveClubCount(admin, schoolId),
      getUpcomingRegistrationCount(admin, schoolId, now),
      getRecentParticipationCount(admin, schoolId, recentSince),
      getDashboardActivityEvents(
        admin,
        schoolId,
        range.startsAt,
        range.endsAt,
      ),
    ]);
  const activitySummary = buildDashboardActivitySummary(activityEvents, nowDate);

  return {
    activeClubs,
    activitySummary,
    recentParticipation,
    upcomingApprovedEvents: activitySummary.total,
    upcomingRegistrations,
  };
}

async function getPlatformDashboardSchools(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await timeServer(
    "dashboard.query.platform-schools",
    () => supabase.rpc("get_platform_event_school_options"),
  );

  if (error) {
    console.error("dashboard.query.platform-schools failed", {
      code: error.code,
    });

    return {
      errorCode: error.code,
      schools: [] as PlatformSchoolOption[],
    };
  }

  return {
    errorCode: null,
    schools: (data ?? []) as PlatformSchoolOption[],
  };
}

async function getStudentUpcomingEventContext(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  events: UpcomingEvent[],
) {
  const eventIds = events.map((event) => event.id);
  const clubIds = Array.from(
    new Set(
      events
        .map((event) => event.club_id)
        .filter((clubId): clubId is string => Boolean(clubId)),
    ),
  );
  const responsibleStaffIds = Array.from(
    new Set(
      events
        .map((event) => event.responsible_staff_id)
        .filter((staffId): staffId is string => Boolean(staffId)),
    ),
  );

  if (!eventIds.length) {
    return {
      upcomingEventAttendees: [],
      upcomingEventClubs: [],
      upcomingEventResponsibleStaff: [],
    };
  }

  const [attendeeResult, clubResult, responsibleStaffResult] = await Promise.all([
    timeServer("dashboard.query.upcoming-event-attendees", () =>
      admin
        .from("event_attendees")
        .select(
          "event_id, student_roster_id, attendee_profile_id, permission_status, status",
        )
        .eq("school_id", schoolId)
        .in("event_id", eventIds)
        .in("status", ["registered", "attended"])
        .returns<DashboardEventAttendee[]>(),
    ),
    clubIds.length
      ? timeServer("dashboard.query.upcoming-event-clubs", () =>
          admin
            .from("clubs")
            .select("id, name")
            .eq("school_id", schoolId)
            .in("id", clubIds)
            .returns<DashboardClub[]>(),
        )
      : Promise.resolve({ data: [] as DashboardClub[], error: null }),
    responsibleStaffIds.length
      ? timeServer("dashboard.query.upcoming-event-responsible-staff", () =>
          admin
            .from("profiles")
            .select("id, full_name, role, status")
            .in("id", responsibleStaffIds)
            .in("role", ["school_admin", "teacher"])
            .returns<DashboardResponsibleStaff[]>(),
        )
      : Promise.resolve({
          data: [] as DashboardResponsibleStaff[],
          error: null,
        }),
  ]);

  return {
    upcomingEventAttendees: attendeeResult.data ?? [],
    upcomingEventClubs: clubResult.data ?? [],
    upcomingEventResponsibleStaff: responsibleStaffResult.data ?? [],
  };
}

async function getCurrentStudent(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
) {
  const { data: student } = await timeServer(
    "dashboard.query.current-student",
    () =>
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

async function getActiveStudentCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer(
    "dashboard.query.active-student-count",
    () =>
      admin
        .from("student_rosters")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "active"),
  );

  return count ?? 0;
}

async function getActiveClubCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer("dashboard.query.active-club-count", () =>
    admin
      .from("clubs")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "active"),
  );

  return count ?? 0;
}

async function getActiveInviteCodeCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  now: string,
) {
  const { count } = await timeServer(
    "dashboard.query.active-invite-code-count",
    () =>
      admin
        .from("invite_codes")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "active")
        .eq("use_count", 0)
        .is("redeemed_at", null)
        .gt("expires_at", now),
  );

  return count ?? 0;
}

async function getDashboardActivityEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  startsAt: string,
  endsAt: string,
) {
  const { data } = await timeServer(
    "dashboard.query.activity-summary-events",
    () =>
      admin
        .from("events")
        .select("starts_at, category, status")
        .eq("school_id", schoolId)
        .eq("status", "approved")
        .gte("starts_at", startsAt)
        .lt("starts_at", endsAt)
        .order("starts_at", { ascending: true })
        .returns<DashboardActivityEvent[]>(),
  );

  return data ?? [];
}

async function getPendingApprovalEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer(
    "dashboard.query.pending-approval-event-count",
    () =>
      admin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "pending_approval"),
  );

  return count ?? 0;
}

async function getUpcomingRegistrationCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  now: string,
) {
  const { count } = await timeServer(
    "dashboard.query.upcoming-registration-count",
    () =>
      admin
        .from("event_attendees")
        .select("id, events!event_attendees_event_school_fk!inner(id)", {
          count: "exact",
          head: true,
        })
        .eq("school_id", schoolId)
        .in("status", ["registered", "attended"])
        .eq("events.status", "approved")
        .gte("events.starts_at", now),
  );

  return count ?? 0;
}

async function getRecentParticipationCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  since: string,
) {
  const { count } = await timeServer(
    "dashboard.query.recent-participation-count",
    () =>
      admin
        .from("attendance_checkins")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("result", "success")
        .gte("checked_in_at", since),
  );

  return count ?? 0;
}

async function getJoinedClubCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentRosterId: string,
) {
  const { count } = await timeServer("dashboard.query.joined-club-count", () =>
    admin
      .from("club_memberships")
      .select("id, clubs!club_memberships_club_school_fk!inner(id)", {
        count: "exact",
        head: true,
      })
      .eq("school_id", schoolId)
      .eq("student_roster_id", studentRosterId)
      .eq("status", "active")
      .eq("clubs.status", "active"),
  );

  return count ?? 0;
}

async function getRegisteredUpcomingEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentRosterId: string,
  now: string,
) {
  const { count } = await timeServer(
    "dashboard.query.registered-upcoming-event-count",
    () =>
      admin
        .from("event_attendees")
        .select("id, events!event_attendees_event_school_fk!inner(id)", {
          count: "exact",
          head: true,
        })
        .eq("school_id", schoolId)
        .eq("student_roster_id", studentRosterId)
        .eq("status", "registered")
        .eq("events.status", "approved")
        .gte("events.starts_at", now),
  );

  return count ?? 0;
}

type HomeIdentity = {
  firstName: string;
  schoolName: string;
  timeZone: string;
};

// Runs as the signed-in user, under RLS: their own name and their school.
async function getHomeIdentity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
): Promise<HomeIdentity> {
  const { data } = await timeServer("dashboard.query.home-identity", () =>
    supabase
      .from("profiles")
      .select("full_name, schools(name, timezone)")
      .eq("id", profileId)
      .maybeSingle<{
        full_name: string | null;
        schools: { name: string; timezone: string | null } | null;
      }>(),
  );

  return {
    firstName: (data?.full_name ?? "").trim().split(/\s+/)[0] ?? "",
    schoolName: data?.schools?.name ?? "",
    timeZone: data?.schools?.timezone || "UTC",
  };
}

// Everything the student has signed up for or attended, for the goals card.
async function getStudentActivityHistory(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentRosterId: string,
) {
  const { data } = await timeServer("dashboard.query.student-activity-history", () =>
    admin
      .from("event_attendees")
      .select("status, events!event_attendees_event_school_fk!inner(category)")
      .eq("school_id", schoolId)
      .eq("student_roster_id", studentRosterId)
      .in("status", ["registered", "attended"])
      .returns<Array<{ status: string; events: { category: string | null } | null }>>(),
  );
  const rows = data ?? [];

  return {
    attended: rows.filter((row) => row.status === "attended").length,
    kinds: new Set(
      rows.map((row) => row.events?.category).filter((value): value is string => Boolean(value)),
    ).size,
  };
}

async function getStudentRecentParticipationCount(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  since: string,
) {
  const { count } = await timeServer(
    "dashboard.query.student-recent-participation-count",
    () =>
      admin
        .from("attendance_checkins")
        .select("id", { count: "exact", head: true })
        .eq("attendee_profile_id", profileId)
        .eq("result", "success")
        .gte("checked_in_at", since),
  );

  return count ?? 0;
}

async function getUpcomingEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  now: string,
) {
  const { data: events } = await timeServer(
    "dashboard.query.upcoming-events-preview",
    () =>
      admin
        .from("events")
        .select(EVENT_QUICK_VIEW_SELECT)
        .eq("school_id", schoolId)
        .eq("status", "approved")
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(12)
        .returns<UpcomingEvent[]>(),
  );

  return events ?? [];
}

function buildStudentQuickViewEvents(
  analytics: Awaited<ReturnType<typeof getStudentAnalytics>>,
  profile: Profile,
  locale: Locale,
  t: (key: string) => string,
  baseUrl: string,
): StudentUpcomingEvent[] {
  const clubNameById = new Map(
    analytics.upcomingEventClubs.map((club) => [club.id, club.name]),
  );
  const responsibleStaffById = new Map(
    analytics.upcomingEventResponsibleStaff.map((staff) => [staff.id, staff]),
  );

  return analytics.upcomingEvents.map((event) => {
    const attendees = analytics.upcomingEventAttendees.filter(
      (attendee) => attendee.event_id === event.id,
    );
    const registration = attendees.find(
      (attendee) =>
        attendee.attendee_profile_id === profile.id ||
        attendee.student_roster_id === analytics.currentStudent?.id,
    );
    const attendeeCount = attendees.length;
    const isFull =
      event.capacity !== null && attendeeCount >= event.capacity;
    const canRegister = Boolean(analytics.currentStudent);
    const categoryKey = event.category
      ? getActivityCategoryTranslationKey(event.category)
      : null;
    const calendarLinks = getEventCalendarLinks(
      {
        description: event.description,
        endsAt: event.ends_at,
        id: event.id,
        location: event.location,
        cancellationNotice: event.cancellation_notice,
        startsAt: event.starts_at,
        title: event.title,
      },
      baseUrl,
    );
    const responsibleStaff = event.responsible_staff_id
      ? responsibleStaffById.get(event.responsible_staff_id)
      : null;

    const tile = formatCalendarDateBadge(event.starts_at, locale);

    return {
      posterUrl: event.poster_path
        ? getEventPosterDeliveryUrl(event.id, event.poster_path)
        : null,
      tileDay: String(Number(tile.day)),
      tileMonth: tile.month,
      accessibilityLabel:
        event.accessibility_notes ??
        t("events.decisionInfo.accessibilityNotProvided"),
      attendeeCount,
      canRegister,
      canManageEvent: false,
      calendarDownloadUrl: calendarLinks.calendarDownloadUrl,
      capacity: event.capacity,
      categoryLabel: categoryKey ? t(categoryKey) : event.category,
      categoryValue: event.category,
      costLabel: formatEventCost(
        {
          costAmount: event.cost_amount,
          costCurrency: event.cost_currency,
          costType: event.cost_type,
        },
        locale,
        {
          free: t("events.practicalDetails.free"),
          notSpecified: t("events.practicalDetails.costNotSpecified"),
          variable: t("events.practicalDetails.variableCost"),
        },
      ),
      costNotes: event.cost_notes,
      costType: event.cost_type,
      dateTimeLabel: `${formatDateTime(event.starts_at, locale)} - ${formatTime(
        event.ends_at,
        locale,
      )}`,
      description: event.description,
      eligibilityLabel:
        event.eligibility_notes ?? t("events.decisionInfo.eligibilityNotSpecified"),
      experienceLabel: dashboardExperienceLevelLabel(event.experience_level, t),
      experienceLevel: event.experience_level,
      expectedCommitmentLabel:
        event.expected_commitment ??
        t("events.practicalDetails.commitmentNotSpecified"),
      hasCurrentStudent: Boolean(analytics.currentStudent),
      hasEligibilityInfo: Boolean(event.eligibility_notes),
      hostName:
        (event.club_id && clubNameById.get(event.club_id)) ||
        t("events.card.mySchool"),
      googleCalendarUrl: calendarLinks.googleCalendarUrl,
      id: event.id,
      isFull,
      isOwnSchoolEvent: event.school_id === profile.school_id,
      isStaff: false,
      location: event.location,
      permissionNote: event.permission_note,
      permissionRequired: event.permission_required,
      permissionStatusLabel: event.permission_required
        ? registration
          ? eventPermissionLabel(registration.permission_status, t)
          : t("events.permission.required")
        : t("events.permission.notRequired"),
      registrationStateLabel: registration
        ? registration.status === "attended"
          ? t("events.registration.checkedIn")
          : t("events.registration.youAreRegistered")
        : canRegister
          ? t("events.registration.notJoined")
          : t("events.registration.unavailable"),
      registrationStatus: registration?.status ?? null,
      remainingSpaces:
        event.capacity === null
          ? null
          : Math.max(event.capacity - attendeeCount, 0),
      riskLabel: eventRiskLabel(event.risk_level, t),
      riskLevel: event.risk_level,
      cancellationNotice: event.cancellation_notice,
      responsibleAdultLabel: responsibleStaff?.status === "active"
        ? `${responsibleStaff.full_name} (${dashboardStaffRoleLabel(
            responsibleStaff.role,
            t,
          )})`
        : t("events.decisionInfo.responsibleNotSpecified"),
      requiredMaterialsLabel:
        event.required_materials ??
        t("events.practicalDetails.materialsNotSpecified"),
      sharedLabel: t("events.sharing.internalOnly"),
      schoolName: t("events.card.mySchool"),
      status: event.status,
      statusLabel: t("status.approved"),
      title: event.title,
    };
  });
}

function eventRiskLabel(
  riskLevel: UpcomingEvent["risk_level"],
  t: (key: string) => string,
) {
  if (riskLevel === "high") {
    return t("events.risk.high");
  }

  return riskLevel === "medium"
    ? t("events.risk.medium")
    : t("events.risk.low");
}

function dashboardExperienceLevelLabel(
  experienceLevel: EventExperienceLevel | null,
  t: (key: string) => string,
) {
  if (experienceLevel === "beginner_friendly") {
    return t("events.experience.beginnerFriendly");
  }

  if (experienceLevel === "prior_experience_recommended") {
    return t("events.experience.priorExperienceRecommended");
  }

  return t("events.decisionInfo.experienceNotSpecified");
}

function dashboardStaffRoleLabel(
  role: DashboardResponsibleStaff["role"],
  t: (key: string) => string,
) {
  return role === "school_admin"
    ? t("roles.schoolAdmin")
    : t("roles.teacher");
}

function eventPermissionLabel(
  permissionStatus: EventPermissionStatus,
  t: (key: string) => string,
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

async function getRecentCheckins(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: checkins } = await timeServer(
    "dashboard.query.recent-checkins-preview",
    () =>
      admin
        .from("attendance_checkins")
        .select(
          "id, checked_in_at, method, events!attendance_checkins_event_school_fk(title), student_rosters!attendance_checkins_student_school_fk(first_name, last_name)",
        )
        .eq("school_id", schoolId)
        .eq("result", "success")
        .order("checked_in_at", { ascending: false })
        .limit(5)
        .returns<RecentCheckin[]>(),
  );

  return checkins ?? [];
}

function isSchoolStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

function studentName(
  student: RecentCheckin["student_rosters"],
  t: (key: string) => string,
) {
  if (!student) {
    return t("dashboard.fallback.rosterStudent");
  }

  return `${student.first_name} ${student.last_name}`;
}

function checkInMethodLabel(method: string, t: (key: string) => string) {
  if (method === "admin" || method === "manual" || method === "qr") {
    return t(`attendance.methods.${method}`);
  }

  return method;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA").format(
    value,
  );
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
