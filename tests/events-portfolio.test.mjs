import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  eventListColumnFilters,
  parseEventListFilters,
  toggleEventListFilter,
  weekDayKeys,
} from "../src/lib/events/event-list-filters.ts";
import {
  buildParticipationRecords,
  recordsWithoutEntry,
} from "../src/lib/portfolio/participation.ts";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const now = new Date("2026-11-23T10:00:00Z");
const event = (id, over = {}) => ({
  category: null,
  club_id: null,
  ends_at: "2026-11-10T10:00:00Z",
  id,
  school_id: "school",
  starts_at: "2026-11-10T08:00:00Z",
  status: "approved",
  title: id,
  ...over,
});
const memberships = [{ club_id: "chess", joined_at: "2026-11-01T00:00:00Z" }];
const build = (attendedEvents, clubEvents) =>
  buildParticipationRecords({ attendedEvents, clubEvents, memberships, now });

test("an attended event is recorded without the student adding it", () => {
  assert.deepEqual(
    build([event("fair")], []).map((r) => [r.eventId, r.source]),
    [["fair", "attended"]],
  );
});

test("a club's past event is recorded for members who had joined before it", () => {
  const club = (id, over) => event(id, { club_id: "chess", ...over });

  assert.deepEqual(build([], [club("ok")]).map((r) => r.source), ["club"]);
  assert.equal(build([], [club("done", { status: "completed" })]).length, 1);
  // Not over yet, held before the student joined, canceled, another club's.
  assert.equal(build([], [club("future", { ends_at: "2026-11-24T10:00:00Z", starts_at: "2026-11-24T08:00:00Z" })]).length, 0);
  assert.equal(build([], [club("before", { ends_at: "2026-10-30T10:00:00Z", starts_at: "2026-10-30T08:00:00Z" })]).length, 0);
  assert.equal(build([], [club("canceled", { status: "canceled" })]).length, 0);
  assert.equal(build([], [club("other", { club_id: "drama" })]).length, 0);
});

test("each event is one record, attendance first, newest on top", () => {
  const both = event("both", { club_id: "chess" });
  const newer = event("newer", { starts_at: "2026-11-20T08:00:00Z", ends_at: "2026-11-20T10:00:00Z" });

  assert.deepEqual(
    build([both, newer], [both]).map((r) => [r.eventId, r.source]),
    [["newer", "attended"], ["both", "attended"]],
  );
});

test("an entry about the event replaces its record", () => {
  const records = build([event("a"), event("b")], []);

  assert.deepEqual(recordsWithoutEntry(records, [{ event_id: "a" }, { event_id: null }]).map((r) => r.eventId), ["b"]);
});

test("the portfolio shows the automatic records and no longer previews as someone else", () => {
  const page = read("src/app/(admin)/portfolio/page.tsx");

  assert.match(page, /<PortfolioRecords/);
  assert.doesNotMatch(page, /viewAs|searchParams/);
  for (const lang of ["en", "mn"]) {
    const dictionary = read(`src/lib/i18n/dictionaries/${lang}.ts`);
    assert.doesNotMatch(dictionary, /bannerTeacher|bannerClassmate/);
    assert.match(dictionary, /records: \{\s+title:/);
  }
});

test("classmates never see a student's records, and staff get no add link", () => {
  const staff = read("src/app/(admin)/portfolio/students/[rosterId]/page.tsx");

  assert.match(staff, /viewer\.role === "student" \? null : getStudentLinks/);
  assert.doesNotMatch(staff, /addReflection/);
});

test("a new entry is prefilled only from an own-school event the student took part in", () => {
  assert.match(
    read("src/app/(admin)/portfolio/new/page.tsx"),
    /links\.participation\.find\(\s+\(item\) => item\.eventId === eventParam && item\.schoolId === viewer\.schoolId/,
  );
});

test("event filters combine, ignore unknown values and toggle off", () => {
  assert.deepEqual(parseEventListFilters("free,nonsense,week"), ["week", "free"]);
  assert.deepEqual(parseEventListFilters(""), []);
  assert.deepEqual(toggleEventListFilter(["free"], "week"), ["week", "free"]);
  assert.deepEqual(toggleEventListFilter(["week", "free"], "free"), ["week"]);
  assert.deepEqual(eventListColumnFilters(["free", "no-permission", "beginner", "week"]), [
    ["cost_type", "free"],
    ["permission_required", false],
    ["experience_level", "beginner_friendly"],
  ]);
});

test("a week runs Monday to Sunday", () => {
  const week = { monday: "2026-11-23", sunday: "2026-11-29" };

  assert.deepEqual(weekDayKeys("2026-11-23"), week);
  assert.deepEqual(weekDayKeys("2026-11-26"), week);
  assert.deepEqual(weekDayKeys("2026-11-29"), week);
});

test("the filters reach the query and survive a search", () => {
  const page = read("src/app/(admin)/events/page.tsx");

  assert.match(page, /for \(const \[column, value\] of columnFilters\) \{\s+query = query\.eq\(column, value\);/);
  assert.match(page, /query\.set\("with", state\.extra\.join\(","\)\)/);
  assert.match(page, /with: filterUrlState\.extra\.join\(","\)/);
  // Week boundaries follow the school's time zone.
  assert.match(page, /getDayQueryRange\(monday, timeZone\)\.from/);
});
