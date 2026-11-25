import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  formatCalendarDateBadge,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatLongDate,
  formatMonthYear,
  formatSchedulePreview,
  formatTime,
  formatTimelineDay,
  formatWeekdayLong,
  formatWeekdayShort,
} from "../src/lib/i18n/date-format.ts";

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), "utf8").replaceAll("\r\n", "\n");

// 5 November 2026, 23:05 UTC: already Friday the 6th, 7:05, in Ulaanbaatar.
const LATE = "2026-11-05T23:05:00Z";

test("every Mongolian date form is written out, in the school's time zone", () => {
  assert.equal(formatDate(LATE, "mn"), "2026 оны 11-р сарын 6");
  assert.equal(formatDateTime(LATE, "mn"), "2026 оны 11-р сарын 6 7:05");
  assert.equal(formatTime(LATE, "mn"), "7:05");
  assert.equal(formatTime("2026-11-05T16:05:00Z", "mn"), "0:05");
  assert.equal(formatLongDate(LATE, "mn"), "2026 оны арван нэгдүгээр сарын 6, баасан гараг");
  assert.equal(formatMonthYear(LATE, "mn"), "2026 оны арван нэгдүгээр сар");
  assert.equal(formatTimelineDay(LATE, "mn"), "11-р сарын 6");
  assert.deepEqual(formatCalendarDateBadge(LATE, "mn"), { day: "06", month: "11-р сар" });
  assert.equal(formatLongDate(LATE, "mn", "UTC"), "2026 оны арван нэгдүгээр сарын 5, пүрэв гараг");
});

test("weekdays and months have the right names", () => {
  const day = (n) => `2026-11-${String(n).padStart(2, "0")}T03:00:00Z`;
  const week = [9, 10, 11, 12, 13, 14, 15].map(day);

  assert.deepEqual(week.map((d) => formatWeekdayShort(d, "mn")), ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"]);
  assert.deepEqual(
    week.map((d) => formatWeekdayLong(d, "mn")),
    ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"],
  );
  assert.deepEqual(
    Array.from({ length: 12 }, (_, month) => formatMonthYear(new Date(Date.UTC(2026, month, 11)), "mn")),
    [
      "нэгдүгээр", "хоёрдугаар", "гуравдугаар", "дөрөвдүгээр", "тавдугаар", "зургаадугаар",
      "долоодугаар", "наймдугаар", "есдүгээр", "аравдугаар", "арван нэгдүгээр", "арван хоёрдугаар",
    ].map((name) => `2026 оны ${name} сар`),
  );
});

test("a range names the year and month once when both ends share them", () => {
  const noon = (date) => new Date(`${date}T12:00:00`);
  const range = (from, to) => formatDateRange(noon(from), noon(to), "mn").replaceAll("\u202f", " ");

  assert.equal(range("2026-11-02", "2026-11-08"), "2026 оны XI/02 – 08");
  assert.equal(range("2026-08-27", "2026-11-25"), "2026 оны VIII/27 – XI/25");
  assert.equal(range("2025-12-29", "2026-01-04"), "2025 оны XII/29 – 2026 оны I/04");
  assert.equal(range("2026-11-02", "2026-11-02"), "2026 оны 11-р сарын 2");
});

test("the schedule preview is in Mongolian and an invalid one is empty", () => {
  const start = new Date(2026, 10, 5, 16, 0);
  const end = new Date(2026, 10, 5, 18, 5);

  assert.equal(formatSchedulePreview(start, end, "mn"), "11-р сарын 5. Пү · 16:00–18:05");
  assert.equal(formatSchedulePreview(end, start, "mn"), "");
  assert.throws(() => formatDate("not a date", "mn"), RangeError);
});

test("English dates are unchanged", () => {
  assert.equal(formatDate(LATE, "en"), "Nov 6, 2026");
  assert.equal(formatWeekdayLong(LATE, "en"), "Friday");
});

test("pages that run in the browser do not ask it for Mongolian dates", () => {
  const files = readdirSync(join(ROOT, "src"), { recursive: true })
    .map((name) => `src/${String(name).replaceAll("\\", "/")}`)
    .filter((name) => name.endsWith(".tsx"));
  const offenders = files.filter((name) => {
    const source = read(name);

    return source.startsWith('"use client"') && /Intl\.DateTimeFormat\(\s*locale|toLocale(Date|Time)String/.test(source);
  });

  // The top bar clock shows digits only, which are the same in every browser.
  assert.deepEqual(offenders, ["src/app/(admin)/_components/top-bar-clock.tsx"]);
  // The server's own range text is the same, so only the source shows which one runs.
  assert.match(read("src/lib/i18n/date-format.ts"), /if \(locale === "mn"\) \{\n\s+return mongolianDateRange\(startDate, endDate\);/);
  assert.match(read("src/lib/i18n/date-format.ts"), /return locale === "mn"\n\s+\? mongolianDate\(date, options\)/);
});

test("list dividers and file fields follow the dark theme", () => {
  assert.match(
    read("src/app/globals.css"),
    /:is\(\.dark, html\[data-theme="dark"\]\) :is\(\.divide-slate-200, \.divide-zinc-200\) > :not\(:last-child\),\n:is\(\.dark, html\[data-theme="dark"\]\) input\[type="file"\] \{\n  border-color: var\(--border\);/,
  );
  // Any other fixed divider colour would be bright on a dark page again.
  const used = new Set();
  for (const name of readdirSync(join(ROOT, "src"), { recursive: true })) {
    if (!String(name).endsWith(".tsx")) continue;
    for (const [divider] of read(`src/${name}`).matchAll(/divide-[a-z]+-\d+/g)) used.add(divider);
  }
  assert.deepEqual([...used].sort(), ["divide-slate-200", "divide-zinc-200"]);
});
