import Link from "next/link";
import { redirect } from "next/navigation";
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
import type { EventQuickViewItem } from "@/components/events/event-quick-view-modal";
import { getEventCalendarLinks } from "@/lib/events/event-calendar";
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
import { StudentUpcomingEvents } from "./student-upcoming-events";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
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

export default async function DashboardPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("dashboard.query.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("dashboard.query.profile", () =>
    supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
  );

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

  const admin = createAdminClient();

  if (isSchoolStaff(profile)) {
    const analytics = await getStaffAnalytics(admin, profile.school_id);

    return <StaffDashboard analytics={analytics} locale={locale} t={t} tf={tf} />;
  }

  const analytics = await getStudentAnalytics(admin, profile);
  const baseUrl = await getServerBaseUrl();

  return (
    <StudentDashboard
      analytics={analytics}
      baseUrl={baseUrl}
      locale={locale}
      profile={profile}
      t={t}
    />
  );
}

function StaffDashboard({
  analytics,
  locale,
  t,
  tf,
}: {
  analytics: Awaited<ReturnType<typeof getStaffAnalytics>>;
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
      <NeedsAttention analytics={analytics} t={t} />
      <NextSteps analytics={analytics} t={t} tf={tf} />
      <QuickActions t={t} />
      <MetricGrid>
        <MetricCard
          href="/students"
          label={t("dashboard.stats.activeStudents")}
          value={analytics.activeStudents}
        />
        <MetricCard
          href="/clubs"
          label={t("dashboard.stats.activeClubs")}
          value={analytics.activeClubs}
        />
        <MetricCard
          href="/events"
          label={t("dashboard.stats.upcomingEvents")}
          value={analytics.upcomingApprovedEvents}
        />
        <MetricCard
          href="/reports"
          label={t("dashboard.stats.eventRegistrations")}
          value={analytics.totalEventRegistrations}
        />
        <MetricCard
          href="/reports"
          label={t("dashboard.stats.attendanceCheckins")}
          value={analytics.totalAttendanceCheckins}
        />
      </MetricGrid>

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
  locale,
  profile,
  t,
}: {
  analytics: Awaited<ReturnType<typeof getStudentAnalytics>>;
  baseUrl: string;
  locale: Locale;
  profile: Profile;
  t: (key: string) => string;
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

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label={t("dashboard.studentStats.joinedClubs")}
          value={analytics.joinedClubs}
          href="/clubs"
        />
        <MetricCard
          label={t("dashboard.studentStats.registeredUpcomingEvents")}
          value={analytics.registeredUpcomingEvents}
          href="/events?filter=registered"
        />
        <MetricCard
          label={t("dashboard.studentStats.attendedEvents")}
          value={analytics.attendedEvents}
          href="/events?filter=registered"
        />
      </section>

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
    <div className="page-stack">
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
      <HeaderActionLink href="/students#add-student" variant="secondary">
        {t("dashboard.quickActions.addStudents.label")}
      </HeaderActionLink>
      <HeaderActionLink href="/invite-codes#generate-invite" variant="secondary">
        {t("dashboard.quickActions.generateInviteCodes.label")}
      </HeaderActionLink>
      <HeaderActionLink href="/events#create-event">
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
        analytics.activeInviteCodes > 0 || analytics.totalEventRegistrations > 0
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
        analytics.totalAttendanceCheckins > 0
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
        analytics.totalEventRegistrations > 0 ||
        analytics.totalAttendanceCheckins > 0
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
            className="group rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            href={step.href}
            key={step.action}
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
              <StepStatusBadge status={step.status} t={t} />
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
  t,
}: {
  analytics: Awaited<ReturnType<typeof getStaffAnalytics>>;
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
          <Link className="btn btn-secondary w-full sm:w-auto" href="/reports">
            {t("common.viewAll")}
          </Link>
        </div>
      </div>
      {attentionItems.length ? (
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
          {attentionItems.map((item) => (
            <Link
              className="group rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
              href={item.href}
              key={item.title}
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
                  {formatNumber(item.count)}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm font-bold text-teal-700 transition group-hover:text-teal-800">
                {item.action}
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
        <Link className="btn btn-primary min-h-12 w-full text-base sm:text-sm" href="/events">
          {t("dashboard.browseEvents")}
        </Link>
        <Link className="btn btn-secondary min-h-12 w-full text-base sm:text-sm" href="/clubs">
          {t("dashboard.joinClubs")}
        </Link>
        <Link className="btn btn-secondary min-h-12 w-full text-base sm:text-sm" href="/events?filter=registered">
          {t("dashboard.viewRegisteredEvents")}
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
            className="group rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            href={action.href}
            key={action.href}
          >
            <p className="text-sm font-bold text-slate-950 transition group-hover:text-teal-800">
              {action.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {action.description}
            </p>
            <p className="mt-3 text-sm font-bold text-teal-700 transition group-hover:text-teal-800">
              {t("common.open")}
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
  value,
}: {
  href?: string;
  label: string;
  value: number;
}) {
  const content = (
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{formatNumber(value)}</p>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      aria-label={`${label}: ${formatNumber(value)}`}
      className="group block rounded-lg transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      href={href}
    >
      {content}
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
        <ul className="divide-y divide-slate-200">
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
  const now = new Date().toISOString();
  const [
    activeStudents,
    activeInviteCodes,
    activeClubs,
    upcomingApprovedEvents,
    totalEventRegistrations,
    totalAttendanceCheckins,
    upcomingEvents,
    recentCheckins,
    pendingApprovals,
  ] = await Promise.all([
    getActiveStudentCount(admin, schoolId),
    getActiveInviteCodeCount(admin, schoolId, now),
    getActiveClubCount(admin, schoolId),
    getUpcomingApprovedEventCount(admin, schoolId, now),
    getTotalEventRegistrationCount(admin, schoolId),
    getTotalAttendanceCheckinCount(admin, schoolId),
    getUpcomingEvents(admin, schoolId, now),
    getRecentCheckins(admin, schoolId),
    getPendingApprovalEventCount(admin, schoolId),
  ]);
  const studentsWithoutInviteCodes = Math.max(
    activeStudents - activeInviteCodes,
    0,
  );

  return {
    activeInviteCodes,
    activeStudents,
    activeClubs,
    pendingApprovals,
    studentsWithoutInviteCodes,
    upcomingApprovedEvents,
    totalEventRegistrations,
    totalAttendanceCheckins,
    upcomingEvents,
    recentCheckins,
  };
}

async function getStudentAnalytics(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
) {
  const now = new Date().toISOString();
  const [currentStudent, upcomingEvents] = await Promise.all([
    getCurrentStudent(admin, profile),
    getUpcomingEvents(admin, profile.school_id, now),
  ]);
  const eventContextPromise = getStudentUpcomingEventContext(
    admin,
    profile.school_id,
    upcomingEvents,
  );

  if (!currentStudent) {
    const eventContext = await eventContextPromise;

    return {
      attendedEvents: 0,
      currentStudent,
      ...eventContext,
      joinedClubs: 0,
      registeredUpcomingEvents: 0,
      upcomingEvents,
    };
  }

  const [
    joinedClubs,
    registeredUpcomingEvents,
    attendedEvents,
    eventContext,
  ] = await Promise.all([
    getJoinedClubCount(admin, profile.school_id, currentStudent.id),
    getRegisteredUpcomingEventCount(
      admin,
      profile.school_id,
      currentStudent.id,
      now,
    ),
    getAttendedEventCount(admin, profile.school_id, currentStudent.id),
    eventContextPromise,
  ]);

  return {
    attendedEvents,
    currentStudent,
    ...eventContext,
    joinedClubs,
    registeredUpcomingEvents,
    upcomingEvents,
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

  if (!eventIds.length) {
    return { upcomingEventAttendees: [], upcomingEventClubs: [] };
  }

  const [attendeeResult, clubResult] = await Promise.all([
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
  ]);

  return {
    upcomingEventAttendees: attendeeResult.data ?? [],
    upcomingEventClubs: clubResult.data ?? [],
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

async function getUpcomingApprovedEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  now: string,
) {
  const { count } = await timeServer(
    "dashboard.query.upcoming-approved-event-count",
    () =>
      admin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "approved")
        .gte("starts_at", now),
  );

  return count ?? 0;
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

async function getTotalEventRegistrationCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer(
    "dashboard.query.event-registration-count",
    () =>
      admin
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("status", ["registered", "attended"]),
  );

  return count ?? 0;
}

async function getTotalAttendanceCheckinCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer(
    "dashboard.query.attendance-checkin-count",
    () =>
      admin
        .from("attendance_checkins")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("result", "success"),
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
      .select("id, clubs!inner(id)", { count: "exact", head: true })
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
        .select("id, events!inner(id)", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("student_roster_id", studentRosterId)
        .eq("status", "registered")
        .eq("events.status", "approved")
        .gte("events.starts_at", now),
  );

  return count ?? 0;
}

async function getAttendedEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentRosterId: string,
) {
  const { count } = await timeServer("dashboard.query.attended-event-count", () =>
    admin
      .from("event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("student_roster_id", studentRosterId)
      .eq("status", "attended"),
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
        .select(
          "id, school_id, club_id, title, description, category, location, starts_at, ends_at, capacity, status, allow_connected_school_registration, risk_level, permission_required, permission_note",
        )
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
        startsAt: event.starts_at,
        title: event.title,
      },
      baseUrl,
    );

    return {
      attendeeCount,
      canRegister,
      calendarDownloadUrl: calendarLinks.calendarDownloadUrl,
      capacity: event.capacity,
      categoryLabel: categoryKey ? t(categoryKey) : event.category,
      dateTimeLabel: `${formatDateTime(event.starts_at, locale)} - ${formatTime(
        event.ends_at,
        locale,
      )}`,
      description: event.description,
      hasCurrentStudent: Boolean(analytics.currentStudent),
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
      sharedLabel: t("events.sharing.internalOnly"),
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
          "id, checked_in_at, method, events(title), student_rosters(first_name, last_name)",
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}
