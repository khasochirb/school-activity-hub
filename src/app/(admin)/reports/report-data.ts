import { createAdminClient } from "@/lib/supabase/admin";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type StudentRoster = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom: string | null;
  student_number: string | null;
  status: string;
  created_at: string;
};

type EventRecord = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

type EventAttendee = {
  id: string;
  event_id: string;
  student_roster_id: string | null;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
  created_at: string;
};

type AttendanceCheckin = {
  id: string;
  event_id: string;
  student_roster_id: string | null;
  method: string;
  result: string;
  checked_in_at: string;
  created_at: string;
};

type ReportCountRow = {
  event_id: string | null;
  student_roster_id: string | null;
};

type CountBucket = {
  count: number;
  id: string;
};

export type ReportSummary = {
  activeClubs: number;
  activeStudents: number;
  approvedEvents: number;
  attendanceCheckins: number;
  attendanceRate: number | null;
  eventRegistrations: number;
};

export type ReportTableRow = {
  count: number;
  detail: string;
  id: string;
  name: string;
};

export type ReportsData = {
  eventsWithMostCheckins: ReportTableRow[];
  eventsWithMostRegistrations: ReportTableRow[];
  studentsWithMostCheckins: ReportTableRow[];
  studentsWithMostRegistrations: ReportTableRow[];
  summary: ReportSummary;
};

export async function getCurrentStaffProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("reports.query.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    return null;
  }

  const { data: profile } = await timeServer("reports.query.staff-profile", () =>
    supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle<StaffProfile>(),
  );

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    return null;
  }

  return profile;
}

export async function getReportsData(schoolId: string): Promise<ReportsData> {
  const admin = createAdminClient();
  const [summary, activeRegistrations, successfulCheckins] = await Promise.all([
    getReportSummary(admin, schoolId),
    getActiveRegistrationRows(admin, schoolId),
    getSuccessfulCheckinRows(admin, schoolId),
  ]);
  const studentsWithMostRegistrations = summarizeBy(
    activeRegistrations,
    "student_roster_id",
  );
  const studentsWithMostCheckins = summarizeBy(
    successfulCheckins,
    "student_roster_id",
  );
  const eventsWithMostRegistrations = summarizeBy(
    activeRegistrations,
    "event_id",
  );
  const eventsWithMostCheckins = summarizeBy(successfulCheckins, "event_id");
  const [students, events] = await Promise.all([
    getStudentsByIds(
      admin,
      schoolId,
      uniqueIds([
        ...studentsWithMostRegistrations.map((row) => row.id),
        ...studentsWithMostCheckins.map((row) => row.id),
      ]),
    ),
    getEventsByIds(
      admin,
      schoolId,
      uniqueIds([
        ...eventsWithMostRegistrations.map((row) => row.id),
        ...eventsWithMostCheckins.map((row) => row.id),
      ]),
    ),
  ]);
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const eventsById = new Map(events.map((event) => [event.id, event]));

  return {
    eventsWithMostCheckins: summarizeEvents(
      eventsWithMostCheckins,
      eventsById,
    ),
    eventsWithMostRegistrations: summarizeEvents(
      eventsWithMostRegistrations,
      eventsById,
    ),
    studentsWithMostCheckins: summarizeStudents(
      studentsWithMostCheckins,
      studentsById,
    ),
    studentsWithMostRegistrations: summarizeStudents(
      studentsWithMostRegistrations,
      studentsById,
    ),
    summary,
  };
}

export async function getReportCsvExport(type: string, schoolId: string) {
  const admin = createAdminClient();

  if (type === "student-roster") {
    const students = await getStudentRosters(admin, schoolId);

    return {
      csv: createStudentRosterCsv(students),
      filename: "student-roster.csv",
    };
  }

  if (type === "event-registrations") {
    const attendees = await getEventAttendees(admin, schoolId);
    const { eventsById, studentsById } = await getRelatedReportRecords(
      admin,
      schoolId,
      attendees,
    );

    return {
      csv: createEventRegistrationsCsv(attendees, studentsById, eventsById),
      filename: "event-registrations.csv",
    };
  }

  if (type === "attendance-checkins") {
    const checkins = await getAttendanceCheckins(admin, schoolId);
    const { eventsById, studentsById } = await getRelatedReportRecords(
      admin,
      schoolId,
      checkins,
    );

    return {
      csv: createAttendanceCheckinsCsv(checkins, studentsById, eventsById),
      filename: "attendance-checkins.csv",
    };
  }

  return null;
}

async function getReportSummary(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
): Promise<ReportSummary> {
  const [
    activeStudents,
    activeClubs,
    approvedEvents,
    eventRegistrations,
    attendanceCheckins,
  ] = await Promise.all([
    getActiveStudentCount(admin, schoolId),
    getActiveClubCount(admin, schoolId),
    getApprovedEventCount(admin, schoolId),
    getActiveRegistrationCount(admin, schoolId),
    getSuccessfulCheckinCount(admin, schoolId),
  ]);

  return {
    activeClubs,
    activeStudents,
    approvedEvents,
    attendanceCheckins,
    attendanceRate: eventRegistrations
      ? attendanceCheckins / eventRegistrations
      : null,
    eventRegistrations,
  };
}

async function getRelatedReportRecords(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  rows: ReportCountRow[],
) {
  const [students, events] = await Promise.all([
    getStudentsByIds(
      admin,
      schoolId,
      uniqueIds(
        rows
          .map((row) => row.student_roster_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
    getEventsByIds(
      admin,
      schoolId,
      uniqueIds(
        rows.map((row) => row.event_id).filter((id): id is string => Boolean(id)),
      ),
    ),
  ]);

  return {
    eventsById: new Map(events.map((event) => [event.id, event])),
    studentsById: new Map(students.map((student) => [student.id, student])),
  };
}

async function getActiveStudentCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer("reports.query.active-student-count", () =>
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
  const { count } = await timeServer("reports.query.active-club-count", () =>
    admin
      .from("clubs")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "active"),
  );

  return count ?? 0;
}

async function getApprovedEventCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer("reports.query.approved-event-count", () =>
    admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "approved"),
  );

  return count ?? 0;
}

async function getActiveRegistrationCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer(
    "reports.query.active-registration-count",
    () =>
      admin
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("status", ["registered", "attended"]),
  );

  return count ?? 0;
}

async function getSuccessfulCheckinCount(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { count } = await timeServer(
    "reports.query.successful-checkin-count",
    () =>
      admin
        .from("attendance_checkins")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("result", "success"),
  );

  return count ?? 0;
}

async function getActiveRegistrationRows(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: rows } = await timeServer(
    "reports.query.active-registration-rows",
    () =>
      admin
        .from("event_attendees")
        .select("event_id, student_roster_id")
        .eq("school_id", schoolId)
        .in("status", ["registered", "attended"])
        .returns<ReportCountRow[]>(),
  );

  return rows ?? [];
}

async function getSuccessfulCheckinRows(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: rows } = await timeServer(
    "reports.query.successful-checkin-rows",
    () =>
      admin
        .from("attendance_checkins")
        .select("event_id, student_roster_id")
        .eq("school_id", schoolId)
        .eq("result", "success")
        .returns<ReportCountRow[]>(),
  );

  return rows ?? [];
}

async function getStudentRosters(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: students } = await timeServer(
    "reports.query.student-rosters-export",
    () =>
      admin
        .from("student_rosters")
        .select(
          "id, first_name, last_name, grade_level, homeroom, student_number, status, created_at",
        )
        .eq("school_id", schoolId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .returns<StudentRoster[]>(),
  );

  return students ?? [];
}

async function getStudentsByIds(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  studentIds: string[],
) {
  if (!studentIds.length) {
    return [];
  }

  const { data: students } = await timeServer("reports.query.students-by-id", () =>
    admin
      .from("student_rosters")
      .select(
        "id, first_name, last_name, grade_level, homeroom, student_number, status, created_at",
      )
      .eq("school_id", schoolId)
      .in("id", studentIds)
      .returns<StudentRoster[]>(),
  );

  return students ?? [];
}

async function getEventsByIds(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  eventIds: string[],
) {
  if (!eventIds.length) {
    return [];
  }

  const { data: events } = await timeServer("reports.query.events-by-id", () =>
    admin
      .from("events")
      .select("id, title, location, starts_at, ends_at, status")
      .eq("school_id", schoolId)
      .in("id", eventIds)
      .returns<EventRecord[]>(),
  );

  return events ?? [];
}

async function getEventAttendees(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: attendees } = await timeServer(
    "reports.query.event-attendees-export",
    () =>
      admin
        .from("event_attendees")
        .select(
          "id, event_id, student_roster_id, status, registered_at, checked_in_at, created_at",
        )
        .eq("school_id", schoolId)
        .returns<EventAttendee[]>(),
  );

  return attendees ?? [];
}

async function getAttendanceCheckins(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: checkins } = await timeServer(
    "reports.query.attendance-checkins-export",
    () =>
      admin
        .from("attendance_checkins")
        .select(
          "id, event_id, student_roster_id, method, result, checked_in_at, created_at",
        )
        .eq("school_id", schoolId)
        .returns<AttendanceCheckin[]>(),
  );

  return checkins ?? [];
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function summarizeStudents(
  counts: CountBucket[],
  studentsById: Map<string, StudentRoster>,
) {
  return counts.map(({ count, id }) => {
    const student = studentsById.get(id);

    return {
      count,
      detail: student ? studentDetail(student) : "",
      id,
      name: student ? studentName(student) : "Roster student",
    };
  });
}

function summarizeEvents(
  counts: CountBucket[],
  eventsById: Map<string, EventRecord>,
) {
  return counts.map(({ count, id }) => {
    const event = eventsById.get(id);

    return {
      count,
      detail: event ? formatDateTime(event.starts_at) : "",
      id,
      name: event?.title ?? "Event",
    };
  });
}

function summarizeBy(rows: ReportCountRow[], key: keyof ReportCountRow) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const value = row[key];

    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .map(([id, count]) => ({ count, id }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
}

function createStudentRosterCsv(students: StudentRoster[]) {
  const rows = students.map((student) => [
    studentName(student),
    student.grade_level ?? "",
    student.homeroom ?? "",
    student.student_number ?? "",
    student.status,
    student.created_at,
  ]);

  return createCsv(
    [
      "student_name",
      "grade",
      "class_group",
      "student_number",
      "status",
      "created_at",
    ],
    rows,
  );
}

function createEventRegistrationsCsv(
  attendees: EventAttendee[],
  studentsById: Map<string, StudentRoster>,
  eventsById: Map<string, EventRecord>,
) {
  const rows = attendees.map((attendee) => {
    const student = studentsById.get(attendee.student_roster_id ?? "");
    const event = eventsById.get(attendee.event_id);

    return [
      student ? studentName(student) : "Roster student",
      student?.grade_level ?? "",
      student?.homeroom ?? "",
      student?.student_number ?? "",
      event?.title ?? "Event",
      event?.starts_at ?? "",
      attendee.status,
      attendee.registered_at,
      attendee.checked_in_at ?? "",
    ];
  });

  return createCsv(
    [
      "student_name",
      "grade",
      "class_group",
      "student_number",
      "event_title",
      "event_starts_at",
      "registration_status",
      "registered_at",
      "checked_in_at",
    ],
    rows,
  );
}

function createAttendanceCheckinsCsv(
  checkins: AttendanceCheckin[],
  studentsById: Map<string, StudentRoster>,
  eventsById: Map<string, EventRecord>,
) {
  const rows = checkins.map((checkin) => {
    const student = studentsById.get(checkin.student_roster_id ?? "");
    const event = eventsById.get(checkin.event_id);

    return [
      student ? studentName(student) : "Roster student",
      student?.grade_level ?? "",
      student?.homeroom ?? "",
      student?.student_number ?? "",
      event?.title ?? "Event",
      checkin.checked_in_at,
      checkin.method,
      checkin.result,
    ];
  });

  return createCsv(
    [
      "student_name",
      "grade",
      "class_group",
      "student_number",
      "event_title",
      "checked_in_at",
      "method",
      "result",
    ],
    rows,
  );
}

function createCsv(headers: string[], rows: string[][]) {
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function studentName(student: StudentRoster) {
  return `${student.first_name} ${student.last_name}`;
}

function studentDetail(student: StudentRoster) {
  const parts = [
    student.grade_level ? `Grade ${student.grade_level}` : "",
    student.homeroom,
    student.student_number,
  ].filter(Boolean);

  return parts.join(", ");
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
