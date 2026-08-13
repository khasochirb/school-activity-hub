import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  eventCalendarDayKey,
  getMonthCalendarGridDateKeys,
  getMonthCalendarQueryRange,
  isEventTimeFilterActive,
  shouldApplyEventTimeFilter,
} from "../src/lib/events/event-calendar-range.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("Month ignores either time value while List and Week keep time filtering", () => {
  assert.equal(shouldApplyEventTimeFilter("month"), false);
  assert.equal(isEventTimeFilterActive("month", "upcoming"), false);
  assert.equal(isEventTimeFilterActive("month", "past"), false);
  assert.equal(shouldApplyEventTimeFilter("list"), true);
  assert.equal(shouldApplyEventTimeFilter("week"), true);
  assert.equal(isEventTimeFilterActive("list", "past"), true);
  assert.equal(isEventTimeFilterActive("week", "past"), true);
});

test("Month uses all 42 visible dates including adjacent months", () => {
  const days = getMonthCalendarGridDateKeys("2026-03");

  assert.equal(days.length, 42);
  assert.equal(days[0], "2026-02-23");
  assert.equal(days.at(-1), "2026-04-05");
  assert.ok(days.includes("2026-03-01"));
  assert.ok(days.includes("2026-03-31"));
});

test("Month range and event day grouping share the school timezone", () => {
  assert.deepEqual(
    getMonthCalendarQueryRange("2026-03", "America/Vancouver"),
    {
      from: "2026-02-23T08:00:00.000Z",
      to: "2026-04-06T07:00:00.000Z",
    },
  );
  assert.equal(
    eventCalendarDayKey("2026-03-01T07:30:00.000Z", "America/Vancouver"),
    "2026-02-28",
  );
  assert.equal(
    eventCalendarDayKey("2026-03-01T08:30:00.000Z", "America/Vancouver"),
    "2026-03-01",
  );
});

test("Events query bypasses only the Month time predicate", () => {
  const page = read("src/app/(admin)/events/page.tsx");
  const queryStart = page.indexOf("async function getFilteredEvents");
  const queryEnd = page.indexOf("async function getCurrentStudent", queryStart);
  const query = page.slice(queryStart, queryEnd);

  assert.match(page, /applyTimeFilter: shouldApplyEventTimeFilter\(selectedView\)/);
  assert.match(query, /if \(applyTimeFilter\)/);
  assert.match(query, /selectedTime === "past"[\s\S]*\.lt\("starts_at", now\)[\s\S]*\.gte\("starts_at", now\)/);
  assert.match(query, /calendarRange[\s\S]*\.gte\("starts_at", calendarRange\.from\)[\s\S]*\.lt\("starts_at", calendarRange\.to\)/);
  assert.match(query, /\.eq\("school_id", platformSchoolId\)/);
  assert.match(query, /\.eq\("school_id", schoolId\)/);
  assert.match(query, /\.eq\("status", "approved"\)/);
  assert.match(query, /\.eq\("category", selectedCategory\)/);
  assert.match(query, /\.ilike\("title", `%\$\{searchQuery\}%`\)/);
});

test("Month hides the Time control and chip while retaining its URL value", () => {
  const filters = read("src/app/(admin)/events/events-filters.tsx");
  const page = read("src/app/(admin)/events/page.tsx");

  assert.match(filters, /view === "month" \? \([\s\S]*<input name="time" type="hidden" value=\{selectedTime\}/);
  assert.match(filters, /: \([\s\S]*<SelectFilter[\s\S]*name="time"/);
  assert.match(page, /isEventTimeFilterActive\(state\.view, state\.time\)/);
  assert.match(page, /month=\$\{selectedMonth\}&time=\$\{selectedTime\}/);
});

test("Month calendar has neutral bilingual context and timezone-aware grouping", () => {
  const calendar = read("src/app/(admin)/events/event-calendar.tsx");
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  assert.match(calendar, /groupEventsByDate\(items, timeZone\)/);
  assert.match(calendar, /getMonthCalendarGridDateKeys\(month\)/);
  assert.match(english, /pastAndUpcoming: "Month view shows past and upcoming events\."/);
  assert.match(
    mongolian,
    /pastAndUpcoming: "Сарын харагдацад өнгөрсөн болон удахгүй болох үйл ажиллагааг харуулна\."/,
  );
});
