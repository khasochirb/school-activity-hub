export type ReportDateRange = {
  endsAt: string;
  startsAt: string | null;
};

export type ReportAttendanceFilter = "all" | "not_recorded" | "recorded";

export type ReportEventRecord = {
  category: string | null;
  ends_at: string;
  id: string;
  responsible_staff_id: string | null;
  starts_at: string;
  status: string;
  title: string;
};

export type ReportAttendeeRecord = {
  attendee_profile_id: string | null;
  event_id: string;
  registered_at: string;
  status: string;
  student_roster_id: string | null;
};

export type ReportCheckinRecord = {
  attendee_profile_id: string | null;
  checked_in_at: string;
  event_id: string;
  result: string;
  student_roster_id: string | null;
};

export type ReportStudentRecord = {
  first_name: string;
  grade_level: string | null;
  homeroom: string | null;
  id: string;
  last_name: string;
  preferred_name: string | null;
  profile_id: string | null;
  status: string;
};

export type ReportMembershipRecord = {
  club_id: string;
  joined_at: string;
  status: string;
  student_roster_id: string;
};

export type ReportClubRecord = {
  category: string | null;
  id: string;
  name: string;
  status: string;
};

export type ReportStaffRecord = {
  full_name: string;
  id: string;
};

export type ActivityReportFilters = {
  attendance: ReportAttendanceFilter;
  dateRange: ReportDateRange;
};

export type ReportActivityRow = {
  attendanceRate: number | null;
  attendanceRecorded: boolean;
  category: string | null;
  checkins: number;
  id: string;
  registrations: number;
  responsibleStaff: string | null;
  startsAt: string;
  title: string;
};

export type ReportStudentRow = {
  clubsJoined: number;
  gradeLevel: string | null;
  homeroom: string | null;
  id: string;
  lastParticipationAt: string | null;
  name: string;
  recordedAttendances: number;
  registrations: number;
  registrationsWithoutCheckin: number;
  upcomingRegistrations: number;
};

export type ActivityReportData = {
  activities: ReportActivityRow[];
  charts: {
    categories: Array<{ category: string; count: number }>;
    events: Array<{
      checkins: number;
      id: string;
      registrations: number;
      title: string;
    }>;
    weeks: Array<{ count: number; startsAt: string }>;
  };
  overview: {
    activitiesHeld: number;
    attendanceRate: number | null;
    participatingStudents: number;
    recordedCheckins: number;
    totalRegistrations: number;
  };
  students: ReportStudentRow[];
};

export function buildActivityReport({
  attendees,
  checkins,
  clubs,
  events,
  filters,
  memberships,
  staff,
  students,
  upcomingAttendees,
}: {
  attendees: ReportAttendeeRecord[];
  checkins: ReportCheckinRecord[];
  clubs: ReportClubRecord[];
  events: ReportEventRecord[];
  filters: ActivityReportFilters;
  memberships: ReportMembershipRecord[];
  staff: ReportStaffRecord[];
  students: ReportStudentRecord[];
  upcomingAttendees: ReportAttendeeRecord[];
}): ActivityReportData {
  const staffById = new Map(staff.map((row) => [row.id, row.full_name]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const registrationsByEvent = groupByEvent(
    attendees.filter((row) => row.status !== "canceled"),
  );
  const checkinsByEvent = groupByEvent(
    checkins.filter((row) => row.result === "success"),
  );
  const baseActivityRows = events.map<ReportActivityRow>((event) => {
    const registrations = registrationsByEvent.get(event.id)?.length ?? 0;
    const recordedCheckins = checkinsByEvent.get(event.id)?.length ?? 0;
    const attendanceRecorded = recordedCheckins > 0;

    return {
      attendanceRate:
        attendanceRecorded && registrations > 0
          ? recordedCheckins / registrations
          : null,
      attendanceRecorded,
      category: event.category,
      checkins: recordedCheckins,
      id: event.id,
      registrations,
      responsibleStaff: event.responsible_staff_id
        ? staffById.get(event.responsible_staff_id) ?? null
        : null,
      startsAt: event.starts_at,
      title: event.title,
    };
  });
  const activities = baseActivityRows.filter((activity) => {
    if (filters.attendance === "recorded") {
      return activity.attendanceRecorded;
    }

    if (filters.attendance === "not_recorded") {
      return !activity.attendanceRecorded;
    }

    return true;
  });
  const includedEventIds = new Set(activities.map((activity) => activity.id));
  const includedAttendees = attendees.filter(
    (row) => row.status !== "canceled" && includedEventIds.has(row.event_id),
  );
  const includedCheckins = checkins.filter(
    (row) => row.result === "success" && includedEventIds.has(row.event_id),
  );
  const recordedEventIds = new Set(
    activities
      .filter((activity) => activity.attendanceRecorded)
      .map((activity) => activity.id),
  );
  const recordedEventRegistrations = includedAttendees.filter((row) =>
    recordedEventIds.has(row.event_id),
  ).length;
  const recordedEventCheckins = includedCheckins.filter((row) =>
    recordedEventIds.has(row.event_id),
  ).length;
  const participants = new Set(
    includedCheckins
      .map(participantKey)
      .filter((value): value is string => Boolean(value)),
  );
  const categoryCounts = new Map<string, number>();

  for (const checkin of includedCheckins) {
    const category = eventById.get(checkin.event_id)?.category?.trim();
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  return {
    activities,
    charts: {
      categories: Array.from(categoryCounts, ([category, count]) => ({
        category,
        count,
      })).sort((left, right) => right.count - left.count),
      events: [...activities]
        .sort(
          (left, right) =>
            new Date(right.startsAt).getTime() -
            new Date(left.startsAt).getTime(),
        )
        .slice(0, 8)
        .map(({ checkins: count, id, registrations, title }) => ({
          checkins: count,
          id,
          registrations,
          title,
        })),
      weeks: buildWeeklyParticipation(
        includedCheckins,
        eventById,
        filters.dateRange,
      ),
    },
    overview: {
      activitiesHeld: activities.length,
      attendanceRate:
        recordedEventRegistrations > 0
          ? recordedEventCheckins / recordedEventRegistrations
          : null,
      participatingStudents: participants.size,
      recordedCheckins: includedCheckins.length,
      totalRegistrations: includedAttendees.length,
    },
    students: buildStudentRows({
      attendees: includedAttendees,
      checkins: includedCheckins,
      clubs,
      memberships,
      students,
      upcomingAttendees,
    }),
  };
}

function buildStudentRows({
  attendees,
  checkins,
  clubs,
  memberships,
  students,
  upcomingAttendees,
}: {
  attendees: ReportAttendeeRecord[];
  checkins: ReportCheckinRecord[];
  clubs: ReportClubRecord[];
  memberships: ReportMembershipRecord[];
  students: ReportStudentRecord[];
  upcomingAttendees: ReportAttendeeRecord[];
}) {
  const activeClubIds = new Set(
    clubs.filter((club) => club.status === "active").map((club) => club.id),
  );
  const registrationsByStudent = groupByStudent(attendees);
  const checkinsByStudent = groupByStudent(checkins);
  const membershipsByStudent = groupByStudent(memberships);
  const upcomingByStudent = groupByStudent(upcomingAttendees);

  return students.map<ReportStudentRow>((student) => {
    const registrationRows = registrationsByStudent.get(student.id) ?? [];
    const checkinRows = checkinsByStudent.get(student.id) ?? [];
    const checkedInEventIds = new Set(checkinRows.map((row) => row.event_id));
    const lastParticipationAt = checkinRows.reduce<string | null>(
      (latest, row) =>
        !latest || new Date(row.checked_in_at) > new Date(latest)
          ? row.checked_in_at
          : latest,
      null,
    );

    return {
      clubsJoined: (membershipsByStudent.get(student.id) ?? []).filter(
        (membership) =>
          membership.status === "active" &&
          activeClubIds.has(membership.club_id),
      ).length,
      gradeLevel: student.grade_level,
      homeroom: student.homeroom,
      id: student.id,
      lastParticipationAt,
      name: studentName(student),
      recordedAttendances: checkinRows.length,
      registrations: registrationRows.length,
      registrationsWithoutCheckin: registrationRows.filter(
        (row) => !checkedInEventIds.has(row.event_id),
      ).length,
      upcomingRegistrations: (upcomingByStudent.get(student.id) ?? []).filter(
        (row) => row.status !== "canceled",
      ).length,
    };
  });
}

function buildWeeklyParticipation(
  checkins: ReportCheckinRecord[],
  eventById: Map<string, ReportEventRecord>,
  range: ReportDateRange,
) {
  const validEventDates = Array.from(eventById.values())
    .map((event) => new Date(event.starts_at).getTime())
    .filter(Number.isFinite);
  const fallbackStart = validEventDates.length
    ? Math.min(...validEventDates)
    : new Date(range.endsAt).getTime();
  const startsAt = startOfUtcWeek(
    new Date(range.startsAt ?? fallbackStart),
  ).getTime();
  const endsAt = new Date(range.endsAt).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekCount = Math.max(1, Math.ceil((endsAt - startsAt) / weekMs));
  const weeks = Array.from({ length: weekCount }, (_, index) => ({
    count: 0,
    startsAt: new Date(startsAt + index * weekMs).toISOString(),
  }));

  for (const checkin of checkins) {
    const eventStartsAt = eventById.get(checkin.event_id)?.starts_at;
    if (!eventStartsAt) {
      continue;
    }

    const eventTime = new Date(eventStartsAt).getTime();
    const index = Math.floor((eventTime - startsAt) / weekMs);
    if (index >= 0 && index < weeks.length) {
      weeks[index].count += 1;
    }
  }

  return weeks;
}

function groupByEvent<T extends { event_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const values = grouped.get(row.event_id) ?? [];
    values.push(row);
    grouped.set(row.event_id, values);
  }

  return grouped;
}

function groupByStudent<T extends { student_roster_id: string | null }>(
  rows: T[],
) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    if (!row.student_roster_id) {
      continue;
    }

    const values = grouped.get(row.student_roster_id) ?? [];
    values.push(row);
    grouped.set(row.student_roster_id, values);
  }

  return grouped;
}

function participantKey(row: {
  attendee_profile_id: string | null;
  student_roster_id: string | null;
}) {
  if (row.student_roster_id) {
    return `roster:${row.student_roster_id}`;
  }

  return row.attendee_profile_id ? `profile:${row.attendee_profile_id}` : null;
}

function startOfUtcWeek(value: Date) {
  const date = new Date(value);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + offset);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function studentName(student: ReportStudentRecord) {
  const preferredName = student.preferred_name?.trim();
  return preferredName
    ? `${preferredName} ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;
}
