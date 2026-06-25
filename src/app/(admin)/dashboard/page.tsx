import { redirect } from "next/navigation";
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
    return (
      <DashboardShell
        description="Your account is signed in, but it is not connected to a school profile yet."
        title="Dashboard"
      >
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">
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
      {!analytics.currentStudent ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">
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
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">{title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{description}</p>
      </section>
      {children}
    </div>
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
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-zinc-950">
        {formatNumber(value)}
      </p>
    </article>
  );
}

function UpcomingEventsSection({ events }: { events: UpcomingEvent[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-950">
          Upcoming approved events
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          The next approved activities on your school calendar.
        </p>
      </div>
      {events.length ? (
        <ul className="divide-y divide-zinc-200">
          {events.map((event) => (
            <li className="p-4" key={event.id}>
              <p className="font-medium text-zinc-950">{event.title}</p>
              <p className="mt-1 text-sm text-zinc-600">
                {formatDateTime(event.starts_at)} - {formatTime(event.ends_at)}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
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
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-950">
          Recent check-ins
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          The latest successful attendance check-ins for approved events.
        </p>
      </div>
      {checkins.length ? (
        <ul className="divide-y divide-zinc-200">
          {checkins.map((checkin) => (
            <li className="p-4" key={checkin.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-zinc-950">
                    {studentName(checkin.student_rosters)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {checkin.events?.title ?? "Event"}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {checkin.method}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
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
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-950">Demo workflow</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Use these steps for a clean school pilot without adding real production
        student data.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li
            className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
            key={step}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Step {index + 1}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-950">{step}</p>
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
    <div className="p-6">
      <p className="text-sm font-medium text-zinc-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
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
  const currentStudent = await getCurrentStudent(admin, profile);
  const upcomingEventsPromise = getUpcomingEvents(admin, profile.school_id, now);

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
  const { data: student } = await admin
    .from("student_rosters")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<StudentRoster>();

  return student;
}

async function getActiveStudentCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await admin
    .from("student_rosters")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("status", "active");

  return count ?? 0;
}

async function getActiveClubCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await admin
    .from("clubs")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("status", "active");

  return count ?? 0;
}

async function getUpcomingApprovedEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  now: string,
) {
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("status", "approved")
    .gte("starts_at", now);

  return count ?? 0;
}

async function getTotalEventRegistrationCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await admin
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .in("status", ["registered", "attended"]);

  return count ?? 0;
}

async function getTotalAttendanceCheckinCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await admin
    .from("attendance_checkins")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("result", "success");

  return count ?? 0;
}

async function getJoinedClubCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentRosterId: string,
) {
  const { count } = await admin
    .from("club_memberships")
    .select("id, clubs!inner(id)", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("student_roster_id", studentRosterId)
    .eq("status", "active")
    .eq("clubs.status", "active");

  return count ?? 0;
}

async function getRegisteredUpcomingEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentRosterId: string,
  now: string,
) {
  const { count } = await admin
    .from("event_attendees")
    .select("id, events!inner(id)", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("student_roster_id", studentRosterId)
    .eq("status", "registered")
    .eq("events.status", "approved")
    .gte("events.starts_at", now);

  return count ?? 0;
}

async function getAttendedEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentRosterId: string,
) {
  const { count } = await admin
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("student_roster_id", studentRosterId)
    .eq("status", "attended");

  return count ?? 0;
}

async function getUpcomingEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  now: string,
) {
  const { data: events } = await admin
    .from("events")
    .select("id, title, location, starts_at, ends_at")
    .eq("school_id", schoolId)
    .eq("status", "approved")
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(5)
    .returns<UpcomingEvent[]>();

  return events ?? [];
}

async function getRecentCheckins(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: checkins } = await admin
    .from("attendance_checkins")
    .select(
      "id, checked_in_at, method, events(title), student_rosters(first_name, last_name)",
    )
    .eq("school_id", schoolId)
    .eq("result", "success")
    .order("checked_in_at", { ascending: false })
    .limit(5)
    .returns<RecentCheckin[]>();

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
