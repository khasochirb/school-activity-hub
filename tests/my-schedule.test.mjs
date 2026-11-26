import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildScheduleDays,
  offsetScheduleWeek,
  parseScheduleWeek,
  scheduleDayKeys,
} from "../src/lib/schedule/schedule.ts";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const event = (id, startsAt, over = {}) => ({
  club_id: null,
  ends_at: startsAt,
  id,
  location: null,
  starts_at: startsAt,
  title: id,
  ...over,
});
const build = (events) =>
  buildScheduleDays({
    clubIds: ["chess"],
    dayKeyOf: (startsAt) => startsAt.slice(0, 10),
    events,
    monday: "2026-11-23",
    registeredEventIds: ["fair", "both"],
  });

test("a week starts on Monday, and an unreadable week means the current one", () => {
  assert.equal(parseScheduleWeek("2026-11-26", "2026-01-01"), "2026-11-23");
  assert.equal(parseScheduleWeek("2026-11-29", "2026-01-01"), "2026-11-23");
  assert.equal(parseScheduleWeek("2026-11-23", "2026-01-01"), "2026-11-23");
  assert.equal(parseScheduleWeek("nonsense", "2026-11-25"), "2026-11-23");
  assert.equal(parseScheduleWeek("2026-13-45", "2026-11-25"), "2026-11-23");
  assert.equal(parseScheduleWeek(undefined, "2026-11-25"), "2026-11-23");
  assert.deepEqual(scheduleDayKeys("2026-11-23"), [
    "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29",
  ]);
  assert.equal(offsetScheduleWeek("2026-11-23", 1), "2026-11-30");
  assert.equal(offsetScheduleWeek("2026-11-23", -1), "2026-11-16");
});

test("only the student's registrations and their clubs' events are on the schedule", () => {
  const days = build([
    event("fair", "2026-11-24T08:00:00Z"),
    event("club", "2026-11-24T06:00:00Z", { club_id: "chess" }),
    event("both", "2026-11-25T08:00:00Z", { club_id: "chess" }),
    event("other-club", "2026-11-25T09:00:00Z", { club_id: "drama" }),
    event("not-mine", "2026-11-25T10:00:00Z"),
    event("next-week", "2026-11-30T08:00:00Z", { club_id: "chess" }),
  ]);
  const flat = days.flatMap((day) => day.items.map((item) => [day.dayKey, item.id, item.reason]));

  assert.equal(days.length, 7);
  assert.deepEqual(flat, [
    // Earliest first within a day.
    ["2026-11-24", "club", "club"],
    ["2026-11-24", "fair", "registered"],
    // Registered wins over club membership.
    ["2026-11-25", "both", "registered"],
  ]);
});

test("the page reads as the signed-in student and shows held events only", () => {
  const page = read("src/app/(admin)/schedule/page.tsx");

  assert.doesNotMatch(page, /createAdminClient/);
  assert.match(page, /if \(viewer\.role !== "student"\) redirect\("\/events\?view=week"\)/);
  assert.match(page, /\.in\("status", \["approved", "completed"\]\)/);
  assert.match(page, /\.eq\("student_roster_id", student\.id\)\s+\.eq\("status", "active"\)/);
  assert.match(page, /\.in\("status", \["registered", "attended"\]\)/);
  // Day boundaries follow the school's time zone.
  assert.match(page, /getDayQueryRange\(dayKeys\[0\], timeZone\)\.from/);
});

test("students get My schedule in the menu instead of Calendar; staff keep Calendar", () => {
  const shell = read("src/app/(admin)/_components/app-shell.tsx");
  const student = shell.slice(shell.indexOf("  student: ["), shell.indexOf("  teacher: ["));

  assert.match(student, /href: "\/schedule", labelKey: "nav\.schedule"/);
  assert.doesNotMatch(student, /nav\.calendar/);
  assert.match(shell.slice(shell.indexOf("  teacher: [")), /nav\.calendar/);
  for (const lang of ["en", "mn"]) {
    assert.match(read(`src/lib/i18n/dictionaries/${lang}.ts`), /\n  schedule: \{\s+title:/);
  }
});
