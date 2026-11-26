import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { formatDateTime, formatTime } from "../src/lib/i18n/date-format.ts";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("event times print in the school's zone, not the server's", () => {
  // 08:00 UTC is 16:00 in Ulaanbaatar. Vercel runs in UTC; this machine does
  // not, so the test pins UTC or a missing zone would pass here by accident.
  process.env.TZ = "UTC";
  const startsAt = "2026-11-10T08:00:00Z";
  assert.match(formatDateTime(startsAt, "en", "Asia/Ulaanbaatar"), /4:00/);
  assert.match(formatTime(startsAt, "en", "Asia/Ulaanbaatar"), /4:00/);
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  assert.match(dashboard, /buildStudentQuickViewEvents\(analytics, profile, locale, t, baseUrl, identity\.timeZone\)/);
  assert.match(dashboard, /formatDateTime\(event\.starts_at, locale, timeZone\)/);
  assert.match(dashboard, /formatCalendarDateBadge\(event\.starts_at, locale, timeZone\)/);
});

test("drawer rows are quiet: an icon, a label, an accent bar on the current page", () => {
  const nav = read("src/app/(admin)/_components/mobile-app-nav.tsx");
  assert.match(nav, /className=\{\["drawer-row nav-link-motion", secondary \? "drawer-row-secondary" : ""\]\.join\(" "\)\}/);
  assert.match(nav, /\{active \? <span aria-hidden="true" className="drawer-indicator" \/> : null\}/);
  assert.doesNotMatch(nav, /uppercase/);
  const css = read("src/app/globals.css");
  assert.match(css, /\.drawer-row\[aria-current="page"\] \{\s*background: var\(--card-soft\);/);
});

test("the drawer foot is one account row that opens a menu", () => {
  const shell = read("src/app/(admin)/_components/app-shell.tsx");
  const account = shell.slice(shell.indexOf("function MobileAccount("));
  assert.match(account, /<details className="drawer-account group/);
  assert.match(account, /<LanguageSwitcher compact/);
  assert.match(account, /<ThemeToggle compact/);
  assert.match(account, /action=\{logout\}/);
});

test("a date formatted without a zone uses the school default, not the server's UTC", () => {
  process.env.TZ = "UTC";
  assert.match(formatDateTime("2026-11-10T08:00:00Z", "en"), /4:00/);
  const zone = /DEFAULT_EVENT_TIME_ZONE = "([^"]+)"/.exec(read("src/lib/events/event-calendar-range.ts"))[1];
  assert.match(read("src/lib/i18n/date-format.ts"), new RegExp(`const DEFAULT_TIME_ZONE = "${zone}";`));
});
