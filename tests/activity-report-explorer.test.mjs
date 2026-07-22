import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function loadReportHelper() {
  const source = readFileSync(
    join(process.cwd(), "src/lib/reports/activity-report.ts"),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", output)(
    runtimeModule.exports,
    runtimeModule,
  );
  return runtimeModule.exports;
}

const { buildActivityReport } = loadReportHelper();

function report(overrides = {}) {
  return buildActivityReport({
    attendees: [
      {
        attendee_profile_id: "profile-1",
        event_id: "event-1",
        registered_at: "2026-07-01T09:00:00.000Z",
        status: "registered",
        student_roster_id: "student-1",
      },
      {
        attendee_profile_id: "profile-1",
        event_id: "event-2",
        registered_at: "2026-07-02T09:00:00.000Z",
        status: "registered",
        student_roster_id: "student-1",
      },
    ],
    checkins: [
      {
        attendee_profile_id: "profile-1",
        checked_in_at: "2026-07-01T10:05:00.000Z",
        event_id: "event-1",
        result: "success",
        student_roster_id: "student-1",
      },
    ],
    clubs: [],
    events: [
      {
        category: "Academic",
        ends_at: "2026-07-01T11:00:00.000Z",
        id: "event-1",
        responsible_staff_id: null,
        starts_at: "2026-07-01T10:00:00.000Z",
        status: "approved",
        title: "Recorded event",
      },
      {
        category: "Arts",
        ends_at: "2026-07-02T11:00:00.000Z",
        id: "event-2",
        responsible_staff_id: null,
        starts_at: "2026-07-02T10:00:00.000Z",
        status: "approved",
        title: "Unrecorded event",
      },
    ],
    filters: {
      attendance: "all",
      dateRange: {
        endsAt: "2026-07-31T23:59:59.999Z",
        startsAt: "2026-07-01T00:00:00.000Z",
      },
    },
    memberships: [],
    staff: [],
    students: [
      {
        first_name: "Student",
        grade_level: "8",
        homeroom: "8A",
        id: "student-1",
        last_name: "One",
        preferred_name: null,
        profile_id: "profile-1",
        status: "active",
      },
    ],
    upcomingAttendees: [],
    ...overrides,
  });
}

test("does not count missing attendance recording as a confirmed absence", () => {
  const result = report();

  assert.equal(result.overview.totalRegistrations, 2);
  assert.equal(result.overview.recordedCheckins, 1);
  assert.equal(result.overview.attendanceRate, 1);
  assert.equal(result.activities[0].attendanceRate, 1);
  assert.equal(result.activities[1].attendanceRate, null);
  assert.equal(result.activities[1].attendanceRecorded, false);
});

test("attendance recording filters preserve neutral missing-data behavior", () => {
  const result = report({
    filters: {
      attendance: "not_recorded",
      dateRange: {
        endsAt: "2026-07-31T23:59:59.999Z",
        startsAt: "2026-07-01T00:00:00.000Z",
      },
    },
  });

  assert.equal(result.activities.length, 1);
  assert.equal(result.activities[0].id, "event-2");
  assert.equal(result.overview.attendanceRate, null);
});

test("canceled registrations and rejected check-ins do not enter aggregates", () => {
  const result = report({
    attendees: [
      {
        attendee_profile_id: "profile-1",
        event_id: "event-1",
        registered_at: "2026-07-01T09:00:00.000Z",
        status: "canceled",
        student_roster_id: "student-1",
      },
    ],
    checkins: [
      {
        attendee_profile_id: "profile-1",
        checked_in_at: "2026-07-01T10:05:00.000Z",
        event_id: "event-1",
        result: "rejected",
        student_roster_id: "student-1",
      },
    ],
  });

  assert.equal(result.overview.totalRegistrations, 0);
  assert.equal(result.overview.recordedCheckins, 0);
  assert.equal(result.overview.participatingStudents, 0);
  assert.equal(result.overview.attendanceRate, null);
});

test("student detail loading rechecks school-scoped report authorization", () => {
  const dataLayer = readFileSync(
    join(process.cwd(), "src/app/(admin)/reports/report-explorer-data.ts"),
    "utf8",
  );
  const action = readFileSync(
    join(process.cwd(), "src/app/(admin)/reports/student-report-actions.ts"),
    "utf8",
  );
  const page = readFileSync(
    join(process.cwd(), "src/app/(admin)/reports/page.tsx"),
    "utf8",
  );

  assert.match(dataLayer, /\["school_admin", "teacher"\]/);
  assert.match(dataLayer, /get_platform_event_school_options/);
  assert.match(action, /requireAuthorizedReportSchool\(schoolId\)/);
  assert.match(page, /if \(!access\) \{\s*redirect\("\/dashboard"\)/);
  assert.doesNotMatch(
    [dataLayer, action, page].join("\n"),
    /select\([^)]*(email|phone|student_number|safety)/,
  );
});
