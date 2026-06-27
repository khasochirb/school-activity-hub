import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "../_components/page-ui";
import { timeServer } from "@/lib/server-timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
};

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
        description="Your account is signed in, but it is not connected to a school profile yet."
        title="Dashboard"
      >
        <section className="section-card section-card-padded">
          <p className="text-sm text-slate-600">
            Ask a school admin to finish setting up your profile.
          </p>
        </section>
      </DashboardShell>
    );
  }

  const admin = createAdminClient();

  if (isSchoolStaff(profile)) {
    const analytics = await getStaffAnalytics(admin, profile.school_id);

    return <StaffDashboard analytics={analytics} />;
  }

  const analytics = await getStudentAnalytics(admin, profile);

  return <StudentDashboard analytics={analytics} />;
}

function StaffDashboard({
  analytics,
}: {
  analytics: Awaited<ReturnType<typeof getStaffAnalytics>>;
}) {
  return (
    <DashboardShell
      description="A quick view of roster, club, event, registration, and attendance activity for your school."
      title="Dashboard"
    >
      <WelcomeOverview />
      <QuickActions />
      <MetricGrid>
        <MetricCard label="Active students" value={analytics.activeStudents} />
        <MetricCard label="Active clubs" value={analytics.activeClubs} />
        <MetricCard
          label="Upcoming events"
          value={analytics.upcomingApprovedEvents}
        />
        <MetricCard
          label="Event registrations"
          value={analytics.totalEventRegistrations}
        />
        <MetricCard
          label="Attendance check-ins"
          value={analytics.totalAttendanceCheckins}
        />
      </MetricGrid>

      <DemoWorkflow />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingEventsSection events={analytics.upcomingEvents} />
        <RecentCheckinsSection checkins={analytics.recentCheckins} />
      </div>
    </DashboardShell>
  );
}

function StudentDashboard({
  analytics,
}: {
  analytics: Awaited<ReturnType<typeof getStudentAnalytics>>;
}) {
  return (
    <DashboardShell
      description="Your clubs, upcoming registrations, and attendance history in one place."
      title="Dashboard"
    >
      <StudentWelcomeOverview />
      {!analytics.currentStudent ? (
        <section className="notice-box notice-warning">
          <p>
            Your account is not linked to an active roster student yet.
          </p>
        </section>
      ) : null}

      <MetricGrid>
        <MetricCard label="Joined clubs" value={analytics.joinedClubs} />
        <MetricCard
          label="Registered upcoming events"
          value={analytics.registeredUpcomingEvents}
        />
        <MetricCard label="Attended events" value={analytics.attendedEvents} />
      </MetricGrid>

      <UpcomingEventsSection events={analytics.upcomingEvents} />
    </DashboardShell>
  );
}

function DashboardShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="page-stack">
      <PageHeader
        description={description}
        eyebrow="School activity overview"
        title={title}
      />
      {children}
    </div>
  );
}

function WelcomeOverview() {
  return (
    <section className="section-card section-card-padded">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <div>
          <p className="page-eyebrow">Today&apos;s workspace</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            Guide your school activity pilot from one place.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Start with a verified roster, issue invite codes, then help
            students find clubs, join events, and check in for attendance.
          </p>
        </div>
        <div className="rounded-md border border-teal-100 bg-teal-50 p-4">
          <p className="text-sm font-bold text-teal-950">Recommended flow</p>
          <p className="mt-2 text-sm leading-6 text-teal-900">
            Students cannot self-register freely. Add them to the roster first,
            then generate one-time invite codes when they are ready to join.
          </p>
        </div>
      </div>
    </section>
  );
}

function StudentWelcomeOverview() {
  return (
    <section className="section-card section-card-padded">
      <p className="page-eyebrow">Student activity hub</p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
        Find what&apos;s happening at school.
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Use this dashboard to keep track of clubs you joined, upcoming event
        registrations, and attendance activity.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link className="btn btn-primary" href="/events">
          Browse events
        </Link>
        <Link className="btn btn-secondary" href="/clubs">
          Browse clubs
        </Link>
        <Link className="btn btn-secondary" href="/announcements">
          Read announcements
        </Link>
      </div>
    </section>
  );
}

function QuickActions() {
  const actions = [
    {
      description: "Create or import verified students before registration.",
      href: "/students#add-student",
      label: "Add students",
    },
    {
      description: "Issue one-time codes for rostered students.",
      href: "/invite-codes#generate-invite",
      label: "Generate invite codes",
    },
    {
      description: "Open a group students can discover and join.",
      href: "/clubs#create-club",
      label: "Create club",
    },
    {
      description: "Publish an approved event or submit one for review.",
      href: "/events#create-event",
      label: "Create event",
    },
    {
      description: "Review exports, registrations, and attendance totals.",
      href: "/reports",
      label: "View reports",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {actions.map((action) => (
        <Link
          className="group rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
          href={action.href}
          key={action.href}
        >
          <p className="text-sm font-bold text-slate-950 transition group-hover:text-teal-800">
            {action.label}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {action.description}
          </p>
        </Link>
      ))}
    </section>
  );
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {children}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{formatNumber(value)}</p>
    </article>
  );
}

function UpcomingEventsSection({ events }: { events: UpcomingEvent[] }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">Upcoming approved events</h2>
        <p className="section-description">
          The next approved activities on your school calendar.
        </p>
      </div>
      {events.length ? (
        <ul className="divide-y divide-slate-200">
          {events.map((event) => (
            <li className="p-4" key={event.id}>
              <p className="font-semibold text-slate-950">{event.title}</p>
              <p className="mt-1 text-sm text-slate-600">
                {formatDateTime(event.starts_at)} - {formatTime(event.ends_at)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {event.location || "Location not set"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          description="Approved future events will appear here once staff or club leaders create them."
          title="No upcoming events yet"
        />
      )}
    </section>
  );
}

function RecentCheckinsSection({ checkins }: { checkins: RecentCheckin[] }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">Recent check-ins</h2>
        <p className="section-description">
          The latest successful attendance check-ins for approved events.
        </p>
      </div>
      {checkins.length ? (
        <ul className="divide-y divide-slate-200">
          {checkins.map((checkin) => (
            <li className="p-4" key={checkin.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">
                    {studentName(checkin.student_rosters)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {checkin.events?.title ?? "Event"}
                  </p>
                </div>
                <span className="badge badge-success w-fit">
                  {checkin.method}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {formatDateTime(checkin.checked_in_at)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          description="After students check in with an event QR link, recent check-ins will appear here."
          title="No attendance check-ins yet"
        />
      )}
    </section>
  );
}

function DemoWorkflow() {
  const steps = [
    "Add students",
    "Generate invite codes",
    "Students join",
    "Create clubs/events",
    "Track attendance",
  ];

  return (
    <section className="section-card section-card-padded">
      <h2 className="section-title">Demo workflow</h2>
      <p className="section-description">
        Use these steps for a clean school pilot without adding real production
        student data.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li
            className="detail-card"
            key={step}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              Step {index + 1}
            </p>
            <p className="mt-2 text-sm font-bold text-slate-950">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="m-4 empty-state">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

async function getStaffAnalytics(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const now = new Date().toISOString();
  const [
    activeStudents,
    activeClubs,
    upcomingApprovedEvents,
    totalEventRegistrations,
    totalAttendanceCheckins,
    upcomingEvents,
    recentCheckins,
  ] = await Promise.all([
    getActiveStudentCount(admin, schoolId),
    getActiveClubCount(admin, schoolId),
    getUpcomingApprovedEventCount(admin, schoolId, now),
    getTotalEventRegistrationCount(admin, schoolId),
    getTotalAttendanceCheckinCount(admin, schoolId),
    getUpcomingEvents(admin, schoolId, now),
    getRecentCheckins(admin, schoolId),
  ]);

  return {
    activeStudents,
    activeClubs,
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
  const currentStudentPromise = getCurrentStudent(admin, profile);
  const upcomingEventsPromise = getUpcomingEvents(admin, profile.school_id, now);
  const currentStudent = await currentStudentPromise;

  if (!currentStudent) {
    return {
      attendedEvents: 0,
      currentStudent,
      joinedClubs: 0,
      registeredUpcomingEvents: 0,
      upcomingEvents: await upcomingEventsPromise,
    };
  }

  const [
    joinedClubs,
    registeredUpcomingEvents,
    attendedEvents,
    upcomingEvents,
  ] = await Promise.all([
    getJoinedClubCount(admin, profile.school_id, currentStudent.id),
    getRegisteredUpcomingEventCount(
      admin,
      profile.school_id,
      currentStudent.id,
      now,
    ),
    getAttendedEventCount(admin, profile.school_id, currentStudent.id),
    upcomingEventsPromise,
  ]);

  return {
    attendedEvents,
    currentStudent,
    joinedClubs,
    registeredUpcomingEvents,
    upcomingEvents,
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
        .select("id, title, location, starts_at, ends_at")
        .eq("school_id", schoolId)
        .eq("status", "approved")
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(5)
        .returns<UpcomingEvent[]>(),
  );

  return events ?? [];
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

function studentName(student: RecentCheckin["student_rosters"]) {
  if (!student) {
    return "Roster student";
  }

  return `${student.first_name} ${student.last_name}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
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
