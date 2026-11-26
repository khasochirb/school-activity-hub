import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getDayQueryRange, parseCalendarDay } from "../src/lib/events/event-calendar-range.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("a picked day must be a real date", () => {
  assert.equal(parseCalendarDay("2026-11-20"), "2026-11-20");
  assert.equal(parseCalendarDay("2026-02-30"), null);
  assert.equal(parseCalendarDay("2026-11-2"), null);
  assert.equal(parseCalendarDay("drop table"), null);
  assert.equal(parseCalendarDay(undefined), null);
});

test("a day runs midnight to midnight in the school's time zone", () => {
  // Ulaanbaatar is UTC+8, so 20 November starts at 16:00 UTC on the 19th.
  assert.deepEqual(getDayQueryRange("2026-11-20", "Asia/Ulaanbaatar"), {
    from: "2026-11-19T16:00:00.000Z",
    to: "2026-11-20T16:00:00.000Z",
  });
});

test("mini calendar days are links that narrow the list to that day", () => {
  const page = read("src/app/(admin)/events/page.tsx");

  assert.match(page, /href=\{dayHref\(key\)\}/);
  assert.match(page, /getDayQueryRange\(selectedDay, calendarTimeZone\)/);
  assert.match(page, /shouldApplyEventTimeFilter\(selectedView\) && !selectedDay/);
  assert.match(page, /events\.list\.showAllDays/);
});

test("home week strip opens the whole day, not just its first activity", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");

  assert.match(dashboard, /href: `\/events\?day=\$\{key\}`/);
});
