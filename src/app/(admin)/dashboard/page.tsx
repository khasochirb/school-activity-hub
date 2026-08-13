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
import type { EventQuickViewItem } from "@/components/events/event-quick-view-modal";
import { getEventCalendarLinks } from "@/lib/events/event-calendar";
import type { EventExperienceLevel } from "@/lib/events/event-decision-info";
import {
  formatEventCost,
  type EventCostType,
} from "@/lib/events/event-practical-details";
import { EVENT_QUICK_VIEW_SELECT } from "@/lib/events/event-selects";
import { getEventQuickViewLabels } from "@/lib/events/event-quick-view-labels";
import {
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locales";
import { timeServer } from "@/lib/server-timing";
import { getServerBaseUrl } from "@/lib/server-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DashboardCharts } from "./dashboard-charts";
import { StudentUpcomingEvents } from "./student-upcoming-events";
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
    const [analytics, latestAnnouncements] = await Promise.all([
      getStaffAnalytics(admin, profile.school_id),
      announcementPromise,
    ]);

    return (
      <StaffDashboard
        analytics={analytics}
        latestAnnouncements={latestAnnouncements}
        locale={locale}
        t={t}
        tf={tf}
      />
    );
  }

  const supabase = await createClient();
  const [analytics, baseUrl, latestAnnouncements] = await Promise.all([
    getStudentAnalytics(admin, profile),
    getServerBaseUrl(),
    getLatestDashboardAnnouncements(supabase, profile.school_id),
  ]);

  return (
    <StudentDashboard
      analytics={analytics}
      baseUrl={baseUrl}
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
  latestAnnouncements,
  locale,
  t,
  tf,
}: {
  analytics: Awaited<ReturnType<typeof getStaffAnalytics>>;
  latestAnnouncements: DashboardAnnouncementsResult | null;
  locale: Locale;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  return (
    <DashboardShell
      description={t("dashboard.description")}
      eyebrow={t("dashboard.welcomeBack")}
      title={t("dashboard.title")}
      actions={<DashboardHeaderActions t={t} />}
    >
      <WelcomeOverview t={t} />
      <NeedsAttention analytics={analytics} locale={locale} t={t} />
      <NextSteps analytics={analytics} t={t} tf={tf} />
      <QuickActions t={t} />
      {latestAnnouncements ? (
        <LatestAnnouncementsSection
          locale={locale}
          result={latestAnnouncements}
          showCreateAction
          t={t}
          tf={tf}
        />
      ) : null}
      <section aria-labelledby="dashboard-overview-title" className="space-y-3">
        <div>
          <h2 className="section-title" id="dashboard-overview-title">
            {t("dashboard.analytics.overview")}
          </h2>
        </div>
        <MetricGrid>
          <MetricCard
            href="/clubs"
            locale={locale}
            label={t("dashboard.stats.activeClubs")}
            value={analytics.activeClubs}
          />
          <MetricCard
            href="/events"
            locale={locale}
            label={t("dashboard.stats.upcomingEvents")}
            value={analytics.upcomingApprovedEvents}
          />
          <MetricCard
            href="/reports"
            locale={locale}
            label={t("dashboard.stats.upcomingRegistrations")}
            value={analytics.upcomingRegistrations}
          />
          <MetricCard
            href="/reports"
            locale={locale}
            label={t("dashboard.stats.recentParticipation")}
            value={analytics.recentParticipation}
          />
        </MetricGrid>
      </section>

      <DashboardCharts
        locale={locale}
        summary={analytics.activitySummary}
        t={t}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <UpcomingEventsSection
          events={analytics.upcomingEvents}
          locale={locale}
          t={t}
        />
        <RecentCheckinsSection
          checkins={analytics.recentCheckins}
          locale={locale}
          t={t}
        />
      </div>
    </DashboardShell>
  );
}

function StudentDashboard({
  analytics,
  baseUrl,
  latestAnnouncements,
  locale,
  profile,
  t,
  tf,
}: {
  analytics: Awaited<ReturnType<typeof getStudentAnalytics>>;
  baseUrl: string;
  latestAnnouncements: DashboardAnnouncementsResult;
  locale: Locale;
  profile: Profile;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const quickViewEvents = buildStudentQuickViewEvents(
    analytics,
    profile,
    locale,
    t,
    baseUrl,
  );

  return (
    <DashboardShell
      description={t("dashboard.studentDescription")}
      eyebrow={t("dashboard.welcomeBack")}
      title={t("dashboard.title")}
    >
      <StudentWelcomeOverview t={t} />
      {!analytics.currentStudent ? (
        <section className="notice-box notice-warning">
          <p>{t("dashboard.student.noRosterWarning")}</p>
        </section>
      ) : null}

      <LatestAnnouncementsSection
        locale={locale}
        result={latestAnnouncements}
        showCreateAction={false}
        t={t}
        tf={tf}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("dashboard.studentStats.joinedClubs")}
          locale={locale}
          value={analytics.joinedClubs}
          href="/clubs"
        />
        <MetricCard
          label={t("dashboard.studentStats.registeredUpcomingEvents")}
          locale={locale}
          value={analytics.registeredUpcomingEvents}
          href="/events?filter=registered"
        />
        <MetricCard
          label={t("dashboard.stats.recentParticipation")}
          locale={locale}
          value={analytics.recentParticipation}
          href="/events?filter=registered"
        />
        <MetricCard
          label={t("dashboard.studentStats.availableOpportunities")}
          locale={locale}
          value={analytics.activitySummary.total}
          href="/events"
        />
      </section>

      <DashboardCharts
        locale={locale}
        summary={analytics.activitySummary}
        t={t}
      />

      {quickViewEvents.length ? (
        <StudentUpcomingEvents
          description={t("dashboard.upcoming.description")}
          events={quickViewEvents}
          labels={getEventQuickViewLabels(t)}
          locationNotSet={t("dashboard.upcoming.locationNotSet")}
          title={t("dashboard.upcoming.title")}
        />
      ) : (
        <UpcomingEventsSection events={[]} locale={locale} t={t} />
      )}
    </DashboardShell>
  );
}

function LatestAnnouncementsSection({
  locale,
  result,
  showCreateAction,
  t,
  tf,
}: {
  locale: Locale;
  result: DashboardAnnouncementsResult;
  showCreateAction: boolean;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
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
  return (
    <>
      <HeaderActionLink
        href="/students#add-student"
        prefetch={false}
        variant="secondary"
      >
        {t("dashboard.quickActions.addStudents.label")}
      </HeaderActionLink>
      <HeaderActionLink
        href="/invite-codes#generate-invite"
        prefetch={false}
        variant="secondary"
      >
        {t("dashboard.quickActions.generateInviteCodes.label")}
      </HeaderActionLink>
      <HeaderActionLink
        href="/events#create-event"
        prefetch={false}
      >
        {t("dashboard.quickActions.createEvent.label")}
      </HeaderActionLink>
    </>
  );
}

function WelcomeOverview({ t }: { t: (key: string) => string }) {
  return (
    <section className="section-card section-card-padded">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
        <div>
          <p className="page-eyebrow">{t("dashboard.staffWelcome.eyebrow")}</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {t("dashboard.staffWelcome.title")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {t("dashboard.staffWelcome.description")}
          </p>
        </div>
        <div className="rounded-md border border-teal-100 bg-teal-50 p-3">
          <p className="text-sm font-bold text-teal-950">
            {t("dashboard.recommendedFlow.title")}
          </p>
          <p className="mt-2 text-sm leading-6 text-teal-900">
            {t("dashboard.recommendedFlow.description")}
          </p>
        </div>
      </div>
    </section>
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
    <section className="section-card">
      <div className="section-header">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("dashboard.attention.title")}</h2>
            <p className="section-description">
              {t("dashboard.attention.description")}
            </p>
          </div>
          <Link
            className="btn btn-secondary w-full sm:w-auto"
            href="/reports"
            prefetch={false}
          >
            {t("common.viewAll")}
            <PendingLinkIndicator />
          </Link>
        </div>
      </div>
      {attentionItems.length ? (
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
          {attentionItems.map((item) => (
            <Link
              className="interactive-card group rounded-md border border-slate-200 bg-white p-3 shadow-sm"
              href={item.href}
              key={item.title}
              prefetch={false}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-950 transition group-hover:text-teal-800">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
                <StatusBadge variant={item.variant}>
                  {formatNumber(item.count, locale)}
                </StatusBadge>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-teal-700 transition group-hover:text-teal-800">
                {item.action}
                <PendingLinkIndicator />
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <EmptyState
            description={t("dashboard.attention.emptyDescription")}
            title={t("dashboard.attention.emptyTitle")}
          />
        </div>
      )}
    </section>
  );
}

function StudentWelcomeOverview({ t }: { t: (key: string) => string }) {
  return (
    <section className="section-card overflow-hidden">
      <div className="p-4 sm:p-5">
        <p className="page-eyebrow">{t("dashboard.studentEyebrow")}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-xl">
          {t("dashboard.studentOverviewTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600 sm:text-sm sm:leading-6">
          {t("dashboard.studentOverviewDescription")}
        </p>
      </div>
      <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-3">
        <Link
          className="btn btn-primary min-h-12 w-full text-base sm:text-sm"
          href="/events"
          prefetch={false}
        >
          {t("dashboard.browseEvents")}
          <PendingLinkIndicator />
        </Link>
        <Link
          className="btn btn-secondary min-h-12 w-full text-base sm:text-sm"
          href="/clubs"
          prefetch={false}
        >
          {t("dashboard.joinClubs")}
          <PendingLinkIndicator />
        </Link>
        <Link
          className="btn btn-secondary min-h-12 w-full text-base sm:text-sm"
          href="/events?filter=registered"
          prefetch={false}
        >
          {t("dashboard.viewRegisteredEvents")}
          <PendingLinkIndicator />
        </Link>
      </div>
    </section>
  );
}

function QuickActions({ t }: { t: (key: string) => string }) {
  const actions = [
    {
      description: t("dashboard.quickActions.addStudents.description"),
      href: "/students#add-student",
      label: t("dashboard.quickActions.addStudents.label"),
    },
    {
      description: t("dashboard.quickActions.generateInviteCodes.description"),
      href: "/invite-codes#generate-invite",
      label: t("dashboard.quickActions.generateInviteCodes.label"),
    },
    {
      description: t("dashboard.quickActions.createClub.description"),
      href: "/clubs#create-club",
      label: t("dashboard.quickActions.createClub.label"),
    },
    {
      description: t("dashboard.quickActions.createEvent.description"),
      href: "/events#create-event",
      label: t("dashboard.quickActions.createEvent.label"),
    },
    {
      description: t("dashboard.quickActions.viewReports.description"),
      href: "/reports",
      label: t("dashboard.quickActions.viewReports.label"),
    },
  ];

  return (
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">{t("dashboard.quickActions.title")}</h2>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => (
          <Link
            className="interactive-card group rounded-md border border-slate-200 bg-white p-3 shadow-sm"
            href={action.href}
            key={action.href}
            prefetch={false}
          >
            <p className="text-sm font-bold text-slate-950 transition group-hover:text-teal-800">
              {action.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {action.description}
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-teal-700 transition group-hover:text-teal-800">
              {t("common.open")}
              <PendingLinkIndicator />
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
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

function UpcomingEventsSection({
  events,
  locale,
  t,
}: {
  events: UpcomingEvent[];
  locale: Locale;
  t: (key: string) => string;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">{t("dashboard.upcoming.title")}</h2>
        <p className="section-description">
          {t("dashboard.upcoming.description")}
        </p>
      </div>
      {events.length ? (
        <ul className="dashboard-upcoming-list divide-y divide-slate-200">
          {events.map((event) => (
            <li className="p-4" key={event.id}>
              <p className="font-semibold text-slate-950">{event.title}</p>
              <p className="mt-1 text-sm text-slate-600">
                {formatDateTime(event.starts_at, locale)} -{" "}
                {formatTime(event.ends_at, locale)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {event.location || t("dashboard.upcoming.locationNotSet")}
              </p>
              {event.cancellation_notice ? (
                <span className="badge badge-warning mt-2 w-fit">
                  {t("events.supervisionSchedule.scheduleUpdate")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4">
          <EmptyState
            description={t("dashboard.upcoming.emptyDescription")}
            title={t("dashboard.upcoming.emptyTitle")}
          />
        </div>
      )}
    </section>
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
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">{t("dashboard.checkins.title")}</h2>
        <p className="section-description">
          {t("dashboard.checkins.description")}
        </p>
      </div>
      {checkins.length ? (
        <ul className="divide-y divide-slate-200">
          {checkins.map((checkin) => (
            <li className="p-4" key={checkin.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">
                    {studentName(checkin.student_rosters, t)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {checkin.events?.title ?? t("dashboard.fallback.event")}
                  </p>
                </div>
                <span className="badge badge-success w-fit">
                  {checkInMethodLabel(checkin.method, t)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {formatDateTime(checkin.checked_in_at, locale)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4">
          <EmptyState
            description={t("dashboard.checkins.emptyDescription")}
            title={t("dashboard.checkins.emptyTitle")}
          />
        </div>
      )}
    </section>
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
        .limit(5)
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
): EventQuickViewItem[] {
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

    return {
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
