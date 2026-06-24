import { createAdminClient } from "@/lib/supabase/admin";
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

type Club = {
  id: string;
  name: string;
  status: string;
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
  student_roster_id: string;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
  created_at: string;
};

type AttendanceCheckin = {
  id: string;
  event_id: string;
  student_roster_id: string;
  method: string;
  result: string;
  checked_in_at: string;
  created_at: string;
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

type ReportSourceData = {
  attendees: EventAttendee[];
  checkins: AttendanceCheckin[];
  clubs: Club[];
  events: EventRecord[];
  students: StudentRoster[];
};

export async function getCurrentStaffProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .maybeSingle<StaffProfile>();

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    return null;
  }

  return profile;
}

export async function getReportsData(schoolId: string): Promise<ReportsData> {
  const sourceData = await getReportSourceData(schoolId);
  const activeRegistrations = getActiveRegistrations(sourceData.attendees);
  const successfulCheckins = sourceData.checkins.filter(
    (checkin) => checkin.result === "success",
  );
  const studentsById = new Map(
    sourceData.students.map((student) => [student.id, student]),
  );
  const eventsById = new Map(sourceData.events.map((event) => [event.id, event]));

  return {
    eventsWithMostCheckins: summarizeEvents(
      successfulCheckins,
      eventsById,
      "event_id",
    ),
    eventsWithMostRegistrations: summarizeEvents(
      activeRegistrations,
      eventsById,
      "event_id",
    ),
    studentsWithMostCheckins: summarizeStudents(
      successfulCheckins,
      studentsById,
      "student_roster_id",
    ),
    studentsWithMostRegistrations: summarizeStudents(
      activeRegistrations,
      studentsById,
      "student_roster_id",
    ),
    summary: {
      activeClubs: sourceData.clubs.filter((club) => club.status === "active")
        .length,
      activeStudents: sourceData.students.filter(
        (student) => student.status === "active",
      ).length,
      approvedEvents: sourceData.events.filter(
        (event) => event.status === "approved",
      ).length,
      attendanceCheckins: successfulCheckins.length,
      attendanceRate: activeRegistrations.length
        ? successfulCheckins.length / activeRegistrations.length
        : null,
      eventRegistrations: activeRegistrations.length,
    },
  };
}

export async function getReportCsvExport(type: string, schoolId: string) {
  const sourceData = await getReportSourceData(schoolId);
  const studentsById = new Map(
    sourceData.students.map((student) => [student.id, student]),
  );
  const eventsById = new Map(sourceData.events.map((event) => [event.id, event]));

  if (type === "student-roster") {
    return {
      csv: createStudentRosterCsv(sourceData.students),
      filename: "student-roster.csv",
    };
  }

  if (type === "event-registrations") {
    return {
      csv: createEventRegistrationsCsv(
        sourceData.attendees,
        studentsById,
        eventsById,
      ),
      filename: "event-registrations.csv",
    };
  }

  if (type === "attendance-checkins") {
    return {
      csv: createAttendanceCheckinsCsv(
        sourceData.checkins,
        studentsById,
        eventsById,
      ),
      filename: "attendance-checkins.csv",
    };
  }

  return null;
}

async function getReportSourceData(
  schoolId: string,
): Promise<ReportSourceData> {
  const admin = createAdminClient();
  const [students, clubs, events, attendees, checkins] = await Promise.all([
    getStudentRosters(admin, schoolId),
    getClubs(admin, schoolId),
    getEvents(admin, schoolId),
    getEventAttendees(admin, schoolId),
    getAttendanceCheckins(admin, schoolId),
  ]);

  return {
    attendees,
    checkins,
    clubs,
    events,
    students,
  };
}

async function getStudentRosters(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: students } = await admin
    .from("student_rosters")
    .select(
      "id, first_name, last_name, grade_level, homeroom, student_number, status, created_at",
    )
    .eq("school_id", schoolId)
    .order("last_name", { ascending: true })
    .returns<StudentRoster[]>();

  return students ?? [];
}

async function getClubs(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: clubs } = await admin
    .from("clubs")
    .select("id, name, status")
    .eq("school_id", schoolId)
    .returns<Club[]>();

  return clubs ?? [];
}

async function getEvents(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: events } = await admin
    .from("events")
    .select("id, title, location, starts_at, ends_at, status")
    .eq("school_id", schoolId)
    .returns<EventRecord[]>();

  return events ?? [];
}

async function getEventAttendees(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: attendees } = await admin
    .from("event_attendees")
    .select(
      "id, event_id, student_roster_id, status, registered_at, checked_in_at, created_at",
    )
    .eq("school_id", schoolId)
    .returns<EventAttendee[]>();

  return attendees ?? [];
}

async function getAttendanceCheckins(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: checkins } = await admin
    .from("attendance_checkins")
    .select("id, event_id, student_roster_id, method, result, checked_in_at, created_at")
    .eq("school_id", schoolId)
    .returns<AttendanceCheckin[]>();

  return checkins ?? [];
}

function getActiveRegistrations(attendees: EventAttendee[]) {
  return attendees.filter((attendee) =>
    ["registered", "attended"].includes(attendee.status),
  );
}

function summarizeStudents<T extends { student_roster_id: string }>(
  rows: T[],
  studentsById: Map<string, StudentRoster>,
  key: keyof T,
) {
  return summarizeBy(rows, key).map(({ count, id }) => {
    const student = studentsById.get(id);

    return {
      count,
      detail: student ? studentDetail(student) : "",
      id,
      name: student ? studentName(student) : "Roster student",
    };
  });
}

function summarizeEvents<T extends { event_id: string }>(
  rows: T[],
  eventsById: Map<string, EventRecord>,
  key: keyof T,
) {
  return summarizeBy(rows, key).map(({ count, id }) => {
    const event = eventsById.get(id);

    return {
      count,
      detail: event ? formatDateTime(event.starts_at) : "",
      id,
      name: event?.title ?? "Event",
    };
  });
}

function summarizeBy<T>(rows: T[], key: keyof T) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const value = row[key];

    if (typeof value === "string" && value) {
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
    ["student_name", "grade", "class_group", "student_number", "status", "created_at"],
    rows,
  );
}

function createEventRegistrationsCsv(
  attendees: EventAttendee[],
  studentsById: Map<string, StudentRoster>,
  eventsById: Map<string, EventRecord>,
) {
  const rows = attendees.map((attendee) => {
    const student = studentsById.get(attendee.student_roster_id);
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
    const student = studentsById.get(checkin.student_roster_id);
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
