import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  QUIET_SITE_DAYS,
  STALE_PAGE_DAYS,
  UPCOMING_WINDOW_DAYS,
  dailySeries,
  evaluateSiteChecks,
  firstProblem,
  normalizeChartDays,
  overallState,
  percentChange,
  sumViews,
} from "../src/lib/site/site-health.ts";
import { isCountableVisit, visitDay } from "../src/lib/site/site-visits.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const TODAY = "2026-11-16";
const school = { id: "s1", name: "School One", slug: "school-one" };
const page = (over = {}) => ({
  body: "Text",
  cover_path: "s1/p/cover/x.jpg",
  id: "p1",
  parent_id: null,
  school_id: "s1",
  slug: "p1",
  status: "published",
  title: "Page",
  updated_at: "2026-11-10T00:00:00Z",
  ...over,
});
const healthy = {
  counterReachable: true,
  pages: [page()],
  schools: [school],
  today: TODAY,
  upcomingBySchool: new Map([["s1", 2]]),
  views: [{ day: TODAY, page_key: "", school_id: "s1", views: 3 }],
};
const stateOf = (input, id) => evaluateSiteChecks(input).find((check) => check.id === id);

test("thresholds: stale after 90 days, quiet after 7, upcoming looks 30 days ahead", () => {
  assert.equal(STALE_PAGE_DAYS, 90);
  assert.equal(QUIET_SITE_DAYS, 7);
  assert.equal(UPCOMING_WINDOW_DAYS, 30);
});

test("a healthy site passes every check", () => {
  const checks = evaluateSiteChecks(healthy);
  assert.equal(overallState(checks), "ok");
  assert.equal(firstProblem(checks), null);
});

test("a page last changed exactly 90 days ago is fine; 91 days is stale", () => {
  assert.equal(stateOf({ ...healthy, pages: [page({ updated_at: "2026-08-18T09:00:00Z" })] }, "stalePages").state, "ok");
  assert.equal(stateOf({ ...healthy, pages: [page({ updated_at: "2026-08-17T09:00:00Z" })] }, "stalePages").state, "warn");
});

test("a site with a visit 6 days ago is not quiet; one with its last visit 7 days ago is", () => {
  const visitOn = (day) => ({ ...healthy, views: [{ day, page_key: "", school_id: "s1", views: 1 }] });
  assert.equal(stateOf(visitOn("2026-11-10"), "quietSites").state, "ok");
  assert.equal(stateOf(visitOn("2026-11-09"), "quietSites").state, "warn");
});

test("empty text, a section with no photo and no upcoming activity each raise a warning", () => {
  assert.equal(stateOf({ ...healthy, pages: [page({ body: "  \n" })] }, "emptyPages").count, 1);
  // Only top-level sections need a photo; a sub-page without one is fine.
  assert.equal(stateOf({ ...healthy, pages: [page({ cover_path: null })] }, "missingPhotos").state, "warn");
  assert.equal(stateOf({ ...healthy, pages: [page(), page({ cover_path: null, id: "p2", parent_id: "p1" })] }, "missingPhotos").state, "ok");
  assert.equal(stateOf({ ...healthy, upcomingBySchool: new Map() }, "noUpcoming").state, "warn");
});

test("drafts never count as a problem, and draft pages are not judged as published", () => {
  const input = { ...healthy, pages: [page(), page({ body: "", cover_path: null, id: "d", status: "draft" })] };
  assert.deepEqual([stateOf(input, "drafts").state, stateOf(input, "drafts").count], ["ok", 1]);
  assert.equal(overallState(evaluateSiteChecks(input)), "ok");
});

test("a missing counter table is a failure and leads the banner", () => {
  const checks = evaluateSiteChecks({ ...healthy, counterReachable: false, upcomingBySchool: new Map() });
  assert.equal(overallState(checks), "fail");
  assert.equal(firstProblem(checks).id, "counter");
  // Without the counter, "nobody opened it" cannot be judged.
  assert.equal(checks.find((check) => check.id === "quietSites").state, "ok");
});

test("figures: daily series fills gaps with zero, sums include both ends, change needs a base", () => {
  const rows = [
    { day: "2026-11-14", page_key: "", school_id: "s1", views: 2 },
    { day: "2026-11-16", page_key: "a", school_id: "s1", views: 5 },
    { day: "2026-11-16", page_key: "", school_id: "s2", views: 1 },
  ];
  assert.deepEqual(dailySeries(rows, 3, TODAY), [
    { day: "2026-11-14", views: 2 },
    { day: "2026-11-15", views: 0 },
    { day: "2026-11-16", views: 6 },
  ]);
  assert.equal(sumViews(rows, "2026-11-14", "2026-11-16"), 8);
  assert.equal(sumViews(rows, "2026-11-15", "2026-11-15"), 0);
  assert.equal(percentChange(130, 100), 30);
  assert.equal(percentChange(5, 0), null);
  assert.equal(normalizeChartDays("30"), 30);
  assert.equal(normalizeChartDays("9"), 14);
});

test("visits: crawlers and prefetches are not counted; the day is the school's own", () => {
  assert.equal(isCountableVisit("Mozilla/5.0 (iPhone) Safari", null), true);
  assert.equal(isCountableVisit("Googlebot/2.1", null), false);
  assert.equal(isCountableVisit("facebookexternalhit/1.1", null), false);
  assert.equal(isCountableVisit(null, null), false);
  assert.equal(isCountableVisit("Mozilla/5.0 Chrome", "prefetch"), false);
  assert.equal(visitDay(new Date("2026-11-16T17:30:00Z"), "Asia/Ulaanbaatar"), "2026-11-17");
  assert.equal(visitDay(new Date("2026-11-16T15:59:00Z"), "Asia/Ulaanbaatar"), "2026-11-16");
});

test("the counter stores no visitor data and is closed to every browser role", () => {
  const sql = read("supabase/migrations/202611170002_add_school_site_views.sql");
  const table = sql.slice(sql.indexOf("create table"), sql.indexOf(");") + 2);
  for (const column of ["ip", "user_agent", "cookie", "profile_id", "user_id", "device"]) {
    assert.doesNotMatch(table, new RegExp(`\\b${column}\\b`), column);
  }
  assert.match(sql, /revoke all on table public\.school_site_views from anon, authenticated;/);
  assert.match(sql, /revoke execute on function public\.record_school_site_view\(uuid, text, date\)\s+from public, anon, authenticated;/);
  assert.doesNotMatch(sql, /create policy/);
  assert.match(read("supabase/schema.sql"), /create table if not exists public\.school_site_views/);
});

test("the visit route counts only active schools' published pages and the console is platform-admin only", () => {
  const route = read("src/app/s/[school]/visit/route.ts");
  assert.match(route, /getPublicSite\(school\)/);
  assert.match(route, /if \(pageSlug && !page\) return done;/);
  assert.doesNotMatch(route, /x-forwarded-for|cookies\(/i);
  assert.match(read("src/app/(console)/super-admin/sites/page.tsx"), /await requirePlatformAdmin\(\);/);
  assert.match(read("src/app/(admin)/site/actions.ts"), /"visit"\]\);/);
});

test("the 7-day average trails each day and counts days before the data as 0", async () => {
  const { AVERAGE_WINDOW_DAYS, trailingAverage } = await import("../src/lib/site/site-health.ts");
  assert.equal(AVERAGE_WINDOW_DAYS, 7);
  const rows = [{ day: "2026-11-16", page_key: "", school_id: "s1", views: 14 }];
  assert.deepEqual(trailingAverage(rows, 2, "2026-11-16"), [
    { day: "2026-11-15", views: 0 },
    { day: "2026-11-16", views: 2 },
  ]);
  const week = Array.from({ length: 7 }, (_, i) => ({ day: `2026-11-${10 + i}`, page_key: "", school_id: "s1", views: 7 }));
  assert.equal(trailingAverage(week, 1, "2026-11-16")[0].views, 7);
});

test("the console has its own shell that admits platform admins only", () => {
  const layout = read("src/app/(console)/layout.tsx");
  assert.match(layout, /await requirePlatformAdmin\(\)/);
  assert.match(read("src/app/(console)/console-shell.tsx"), /href: "\/super-admin\/sites"/);
});
