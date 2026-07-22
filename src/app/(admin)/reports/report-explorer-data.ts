import "server-only";

import { getCurrentEventActor } from "@/lib/auth/event-access";
import {
  buildActivityReport,
  type ActivityReportData,
  type ActivityReportFilters,
  type ReportAttendeeRecord,
  type ReportCheckinRecord,
  type ReportClubRecord,
  type ReportEventRecord,
  type ReportMembershipRecord,
  type ReportStaffRecord,
  type ReportStudentRecord,
} from "@/lib/reports/activity-report";
import { timeServer } from "@/lib/server-timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlatformReportSchool = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
};

export type ReportAccessContext = {
  isPlatformAdmin: boolean;
  platformSchools: PlatformReportSchool[];
  schoolId: string | null;
  schoolName: string | null;
  schoolOptionsUnavailable: boolean;
};

export type ReportExplorerResult = {
  data: ActivityReportData;
  eventOptions: Array<{ id: string; title: string }>;
  loadFailed: boolean;
};

export type StudentActivityDetails = {
  categories: Array<{ category: string; count: number }>;
  clubs: Array<{ id: string; name: string }>;
  history: StudentActivityEventDetail[];
  recentParticipation: StudentActivityEventDetail[];
  registrationsWithoutCheckin: StudentActivityEventDetail[];
  schoolName: string;
  student: {
    gradeLevel: string | null;
    homeroom: string | null;
    id: string;
    name: string;
  };
  summary: {
    attendanceRate: number | null;
    clubsJoined: number;
    lastParticipationAt: string | null;
    recordedAttendances: number;
    totalRegistrations: number;
    upcomingRegistrations: number;
  };
  upcoming: StudentActivityEventDetail[];
  weeks: Array<{ count: number; startsAt: string }>;
};

export type StudentActivityEventDetail = {
  category: string | null;
  checkedInAt: string | null;
  id: string;
  startsAt: string;
  title: string;
};

type SchoolRow = {
  id: string;
  name: string;
};

export async function getReportAccessContext(
  requestedSchoolId: string,
): Promise<ReportAccessContext | null> {
  const actor = await getCurrentEventActor();

  if (!actor) {
    return null;
  }

  if (actor.isPlatformAdmin) {
    const supabase = await createClient();
    const { data, error } = await timeServer(
      "reports.query.platform-schools",
      () => supabase.rpc("get_platform_event_school_options"),
    );

    if (error) {
      console.error("reports.query.platform-schools failed", {
        code: error.code,
      });
      return {
        isPlatformAdmin: true,
        platformSchools: [],
        schoolId: null,
        schoolName: null,
        schoolOptionsUnavailable: true,
      };
    }

    const platformSchools = (data ?? []) as PlatformReportSchool[];
    const selectedSchool = platformSchools.find(
      (school) => school.id === requestedSchoolId,
    );

    return {
      isPlatformAdmin: true,
      platformSchools,
      schoolId: selectedSchool?.id ?? null,
      schoolName: selectedSchool?.name ?? null,
      schoolOptionsUnavailable: false,
    };
  }

  if (
    !actor.profile ||
    !["school_admin", "teacher"].includes(actor.profile.role)
  ) {
    return null;
  }

  const admin = createAdminClient();
  const { data: school } = await timeServer("reports.query.school", () =>
    admin
      .from("schools")
      .select("id, name")
      .eq("id", actor.profile!.school_id)
      .maybeSingle<SchoolRow>(),
  );

  return {
    isPlatformAdmin: false,
    platformSchools: [],
    schoolId: actor.profile.school_id,
    schoolName: school?.name ?? null,
    schoolOptionsUnavailable: false,
  };
}

export async function requireAuthorizedReportSchool(requestedSchoolId: string) {
  const access = await getReportAccessContext(requestedSchoolId);

  if (!access?.schoolId || access.schoolId !== requestedSchoolId) {
    return null;
  }

  return access;
}

export async function getReportExplorerData(
  schoolId: string,
  filters: ActivityReportFilters & { category: string | null; eventId: string | null },
): Promise<ReportExplorerResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [eventResult, studentResult, membershipResult, clubResult, upcomingEventResult] =
    await Promise.all([
      getConcludedEvents(admin, schoolId, filters),
      timeServer("reports.query.explorer-students", () =>
        admin
          .from("student_rosters")
          .select(
            "id, profile_id, first_name, last_name, preferred_name, grade_level, homeroom, status",
          )
          .eq("school_id", schoolId)
          .eq("status", "active")
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true })
          .returns<ReportStudentRecord[]>(),
      ),
      timeServer("reports.query.explorer-memberships", () =>
        admin
          .from("club_memberships")
          .select("student_roster_id, club_id, status, joined_at")
          .eq("school_id", schoolId)
          .eq("status", "active")
          .returns<ReportMembershipRecord[]>(),
      ),
      timeServer("reports.query.explorer-clubs", () =>
        admin
          .from("clubs")
          .select("id, name, category, status")
          .eq("school_id", schoolId)
          .returns<ReportClubRecord[]>(),
      ),
      getUpcomingEvents(admin, schoolId, filters, now),
    ]);

  const allEvents = eventResult.data ?? [];
  const events = filters.eventId
    ? allEvents.filter((event) => event.id === filters.eventId)
    : allEvents;
  const eventIds = events.map((event) => event.id);
  const upcomingEventIds = (upcomingEventResult.data ?? []).map(
    (event) => event.id,
  );
  const responsibleStaffIds = Array.from(
    new Set(
      events
        .map((event) => event.responsible_staff_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const [attendeeResult, checkinResult, upcomingAttendeeResult, staffResult] =
    await Promise.all([
      getAttendeesForEvents(admin, schoolId, eventIds),
      getCheckinsForEvents(admin, schoolId, eventIds),
      getAttendeesForEvents(admin, schoolId, upcomingEventIds),
      getResponsibleStaff(admin, schoolId, responsibleStaffIds),
    ]);
  const loadFailed = [
    eventResult.error,
    studentResult.error,
    membershipResult.error,
    clubResult.error,
    upcomingEventResult.error,
    attendeeResult.error,
    checkinResult.error,
    upcomingAttendeeResult.error,
    staffResult.error,
  ].some(Boolean);

  if (loadFailed) {
    console.error("reports.query.explorer failed", {
      schoolId,
      errors: [
        eventResult.error?.code,
        studentResult.error?.code,
        membershipResult.error?.code,
        clubResult.error?.code,
        upcomingEventResult.error?.code,
        attendeeResult.error?.code,
        checkinResult.error?.code,
        upcomingAttendeeResult.error?.code,
        staffResult.error?.code,
      ].filter(Boolean),
    });
  }

  return {
    data: buildActivityReport({
      attendees: attendeeResult.data ?? [],
      checkins: checkinResult.data ?? [],
      clubs: clubResult.data ?? [],
      events,
      filters,
      memberships: membershipResult.data ?? [],
      staff: staffResult.data ?? [],
      students: studentResult.data ?? [],
      upcomingAttendees: upcomingAttendeeResult.data ?? [],
    }),
    eventOptions: allEvents.map((event) => ({
      id: event.id,
      title: event.title,
    })),
    loadFailed,
  };
}

export async function getStudentActivityDetailsData({
  filters,
  schoolId,
  schoolName,
  studentId,
}: {
  filters: ActivityReportFilters & { category: string | null; eventId: string | null };
  schoolId: string;
  schoolName: string;
  studentId: string;
}): Promise<StudentActivityDetails | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [studentResult, eventResult, upcomingEventResult, membershipResult] =
    await Promise.all([
      timeServer("reports.query.student-detail-roster", () =>
        admin
          .from("student_rosters")
          .select(
            "id, profile_id, first_name, last_name, preferred_name, grade_level, homeroom, status",
          )
          .eq("school_id", schoolId)
          .eq("id", studentId)
          .eq("status", "active")
          .maybeSingle<ReportStudentRecord>(),
      ),
      getConcludedEvents(admin, schoolId, filters),
      getUpcomingEvents(admin, schoolId, filters, now),
      timeServer("reports.query.student-detail-memberships", () =>
        admin
          .from("club_memberships")
          .select("student_roster_id, club_id, status, joined_at")
          .eq("school_id", schoolId)
          .eq("student_roster_id", studentId)
          .eq("status", "active")
          .returns<ReportMembershipRecord[]>(),
      ),
    ]);

  if (
    studentResult.error ||
    !studentResult.data ||
    eventResult.error ||
    upcomingEventResult.error ||
    membershipResult.error
  ) {
    console.error("reports.query.student-detail-base failed", {
      codes: [
        studentResult.error?.code,
        eventResult.error?.code,
        upcomingEventResult.error?.code,
        membershipResult.error?.code,
      ].filter(Boolean),
      schoolId,
    });
    return null;
  }

  const allEvents = eventResult.data ?? [];
  const selectedEvents = filters.eventId
    ? allEvents.filter((event) => event.id === filters.eventId)
    : allEvents;
  const allEventIds = selectedEvents.map((event) => event.id);
  const upcomingEvents = (upcomingEventResult.data ?? []).filter(
    (event) => !filters.eventId || event.id === filters.eventId,
  );
  const upcomingEventIds = upcomingEvents.map((event) => event.id);
  const [allCheckinResult, attendeeResult, upcomingAttendeeResult] =
    await Promise.all([
      getCheckinsForEvents(admin, schoolId, allEventIds),
      getStudentAttendeesForEvents(admin, schoolId, studentId, allEventIds),
      getStudentAttendeesForEvents(
        admin,
        schoolId,
        studentId,
        upcomingEventIds,
      ),
    ]);
  if (
    allCheckinResult.error ||
    attendeeResult.error ||
    upcomingAttendeeResult.error
  ) {
    console.error("reports.query.student-detail-activity failed", {
      codes: [
        allCheckinResult.error?.code,
        attendeeResult.error?.code,
        upcomingAttendeeResult.error?.code,
      ].filter(Boolean),
      schoolId,
    });
    return null;
  }
  const eventsWithAttendance = new Set(
    (allCheckinResult.data ?? []).map((row) => row.event_id),
  );
  const events = selectedEvents.filter((event) => {
    if (filters.attendance === "recorded") {
      return eventsWithAttendance.has(event.id);
    }
    if (filters.attendance === "not_recorded") {
      return !eventsWithAttendance.has(event.id);
    }
    return true;
  });
  const eventIds = new Set(events.map((event) => event.id));
  const attendees = (attendeeResult.data ?? []).filter(
    (row) => eventIds.has(row.event_id) && row.status !== "canceled",
  );
  const checkins = (allCheckinResult.data ?? []).filter(
    (row) =>
      eventIds.has(row.event_id) &&
      row.student_roster_id === studentId &&
      row.result === "success",
  );
  const membershipRows = membershipResult.data ?? [];
  const clubIds = membershipRows.map((row) => row.club_id);
  const clubResult = await getClubsById(admin, schoolId, clubIds);
  if (clubResult.error) {
    console.error("reports.query.student-detail-clubs failed", {
      code: clubResult.error.code,
      schoolId,
    });
    return null;
  }
  const eventById = new Map(events.map((event) => [event.id, event]));
  const checkinByEvent = new Map(checkins.map((row) => [row.event_id, row]));
  const history = attendees
    .map((attendee) =>
      toStudentActivityDetail(
        eventById.get(attendee.event_id),
        checkinByEvent.get(attendee.event_id),
      ),
    )
    .filter((row): row is StudentActivityEventDetail => Boolean(row))
    .sort(sortActivityDetailsDescending);
  const recentParticipation = history
    .filter((row) => Boolean(row.checkedInAt))
    .slice(0, 8);
  const registrationsWithoutCheckin = history.filter(
    (row) => !row.checkedInAt,
  );
  const upcomingEventById = new Map(
    upcomingEvents.map((event) => [event.id, event]),
  );
  const upcoming = (upcomingAttendeeResult.data ?? [])
    .filter((row) => row.status !== "canceled")
    .map((row) => toStudentActivityDetail(upcomingEventById.get(row.event_id)))
    .filter((row): row is StudentActivityEventDetail => Boolean(row))
    .sort((left, right) =>
      left.startsAt.localeCompare(right.startsAt),
    );
  const categoryCounts = new Map<string, number>();

  for (const row of recentParticipation) {
    const category = row.category?.trim();
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }
  const recordedAttendances = checkins.length;
  const eligibleRecordedRegistrations = attendees.filter((attendee) =>
    eventsWithAttendance.has(attendee.event_id),
  ).length;
  const lastParticipationAt = checkins.reduce<string | null>(
    (latest, row) =>
      !latest || row.checked_in_at > latest ? row.checked_in_at : latest,
    null,
  );

  return {
    categories: Array.from(categoryCounts, ([category, count]) => ({
      category,
      count,
    })).sort((left, right) => right.count - left.count),
    clubs: (clubResult.data ?? []).map((club) => ({
      id: club.id,
      name: club.name,
    })),
    history,
    recentParticipation,
    registrationsWithoutCheckin,
    schoolName,
    student: {
      gradeLevel: studentResult.data.grade_level,
      homeroom: studentResult.data.homeroom,
      id: studentResult.data.id,
      name: rosterName(studentResult.data),
    },
    summary: {
      attendanceRate: eligibleRecordedRegistrations
        ? recordedAttendances / eligibleRecordedRegistrations
        : null,
      clubsJoined: clubResult.data?.length ?? 0,
      lastParticipationAt,
      recordedAttendances,
      totalRegistrations: attendees.length,
      upcomingRegistrations: upcoming.length,
    },
    upcoming,
    weeks: buildStudentWeeks(checkins, eventById, filters.dateRange),
  };
}

async function getConcludedEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  filters: ActivityReportFilters & { category: string | null },
) {
  let query = admin
    .from("events")
    .select(
      "id, title, category, starts_at, ends_at, status, responsible_staff_id",
    )
    .eq("school_id", schoolId)
    .in("status", ["approved", "completed"])
    .lte("ends_at", filters.dateRange.endsAt)
    .order("starts_at", { ascending: false });

  if (filters.dateRange.startsAt) {
    query = query.gte("ends_at", filters.dateRange.startsAt);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  return timeServer("reports.query.explorer-events", () =>
    query.returns<ReportEventRecord[]>(),
  );
}

async function getUpcomingEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  filters: { category: string | null; eventId: string | null },
  now: string,
) {
  let query = admin
    .from("events")
    .select(
      "id, title, category, starts_at, ends_at, status, responsible_staff_id",
    )
    .eq("school_id", schoolId)
    .eq("status", "approved")
    .gte("starts_at", now)
    .order("starts_at", { ascending: true });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.eventId) {
    query = query.eq("id", filters.eventId);
  }

  return timeServer("reports.query.explorer-upcoming-events", () =>
    query.returns<ReportEventRecord[]>(),
  );
}

function getAttendeesForEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  eventIds: string[],
) {
  if (!eventIds.length) {
    return Promise.resolve({ data: [] as ReportAttendeeRecord[], error: null });
  }

  return timeServer("reports.query.explorer-attendees", () =>
    admin
      .from("event_attendees")
      .select(
        "event_id, student_roster_id, attendee_profile_id, status, registered_at",
      )
      .eq("school_id", schoolId)
      .in("event_id", eventIds)
      .in("status", ["registered", "attended", "no_show"])
      .returns<ReportAttendeeRecord[]>(),
  );
}

function getStudentAttendeesForEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentId: string,
  eventIds: string[],
) {
  if (!eventIds.length) {
    return Promise.resolve({ data: [] as ReportAttendeeRecord[], error: null });
  }

  return timeServer("reports.query.student-detail-attendees", () =>
    admin
      .from("event_attendees")
      .select(
        "event_id, student_roster_id, attendee_profile_id, status, registered_at",
      )
      .eq("school_id", schoolId)
      .eq("student_roster_id", studentId)
      .in("event_id", eventIds)
      .in("status", ["registered", "attended", "no_show"])
      .returns<ReportAttendeeRecord[]>(),
  );
}

function getCheckinsForEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  eventIds: string[],
) {
  if (!eventIds.length) {
    return Promise.resolve({ data: [] as ReportCheckinRecord[], error: null });
  }

  return timeServer("reports.query.explorer-checkins", () =>
    admin
      .from("attendance_checkins")
      .select(
        "event_id, student_roster_id, attendee_profile_id, checked_in_at, result",
      )
      .eq("school_id", schoolId)
      .eq("result", "success")
      .in("event_id", eventIds)
      .returns<ReportCheckinRecord[]>(),
  );
}

function getResponsibleStaff(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  profileIds: string[],
) {
  if (!profileIds.length) {
    return Promise.resolve({ data: [] as ReportStaffRecord[], error: null });
  }

  return timeServer("reports.query.explorer-responsible-staff", () =>
    admin
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .in("id", profileIds)
      .in("role", ["school_admin", "teacher"])
      .returns<ReportStaffRecord[]>(),
  );
}

function getClubsById(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  clubIds: string[],
) {
  if (!clubIds.length) {
    return Promise.resolve({ data: [] as ReportClubRecord[], error: null });
  }

  return timeServer("reports.query.student-detail-clubs", () =>
    admin
      .from("clubs")
      .select("id, name, category, status")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .in("id", clubIds)
      .returns<ReportClubRecord[]>(),
  );
}

function toStudentActivityDetail(
  event: ReportEventRecord | undefined,
  checkin?: ReportCheckinRecord,
): StudentActivityEventDetail | null {
  if (!event) {
    return null;
  }

  return {
    category: event.category,
    checkedInAt: checkin?.checked_in_at ?? null,
    id: event.id,
    startsAt: event.starts_at,
    title: event.title,
  };
}

function sortActivityDetailsDescending(
  left: StudentActivityEventDetail,
  right: StudentActivityEventDetail,
) {
  return right.startsAt.localeCompare(left.startsAt);
}

function buildStudentWeeks(
  checkins: ReportCheckinRecord[],
  eventById: Map<string, ReportEventRecord>,
  range: ActivityReportFilters["dateRange"],
) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const eventTimes = Array.from(eventById.values())
    .map((event) => new Date(event.starts_at).getTime())
    .filter(Number.isFinite);
  const startValue = range.startsAt
    ? new Date(range.startsAt)
    : new Date(eventTimes.length ? Math.min(...eventTimes) : range.endsAt);
  const start = startOfUtcWeek(startValue).getTime();
  const end = new Date(range.endsAt).getTime();
  const weeks = Array.from(
    { length: Math.max(1, Math.ceil((end - start) / weekMs)) },
    (_, index) => ({
      count: 0,
      startsAt: new Date(start + index * weekMs).toISOString(),
    }),
  );

  for (const checkin of checkins) {
    const event = eventById.get(checkin.event_id);
    if (!event) {
      continue;
    }
    const index = Math.floor(
      (new Date(event.starts_at).getTime() - start) / weekMs,
    );
    if (index >= 0 && index < weeks.length) {
      weeks[index].count += 1;
    }
  }

  return weeks;
}

function startOfUtcWeek(value: Date) {
  const date = new Date(value);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function rosterName(student: ReportStudentRecord) {
  return student.preferred_name?.trim()
    ? `${student.preferred_name.trim()} ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;
}
