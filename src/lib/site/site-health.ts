// Rules behind the platform admins' school sites console. Pure functions with no
// imports, so every threshold is pinned by tests/sites-console.test.mjs.

export const STALE_PAGE_DAYS = 90;
export const QUIET_SITE_DAYS = 7;
export const UPCOMING_WINDOW_DAYS = 30;
export const CHART_DAY_OPTIONS = [7, 14, 30] as const;

export type CheckState = "fail" | "warn" | "ok";

export type ConsoleSchool = { id: string; name: string; slug: string };

export type ConsolePage = {
  body: string;
  cover_path: string | null;
  id: string;
  parent_id: string | null;
  school_id: string;
  slug: string;
  status: string;
  title: string;
  updated_at: string;
};

export type ViewRow = { day: string; page_key: string; school_id: string; views: number };

export type CheckId = "counter" | "liveSites" | "emptyPages" | "missingPhotos" | "stalePages" | "noUpcoming" | "quietSites" | "drafts";

export type SiteCheck = { count: number; id: CheckId; schools: string[]; state: CheckState };

// YYYY-MM-DD, `offset` days from `day`.
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

// One bar per day, oldest first, ending on `today`; days with no row count 0.
export function dailySeries(rows: ViewRow[], days: number, today: string) {
  const byDay = new Map<string, number>();

  for (const row of rows) byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.views);

  return Array.from({ length: days }, (_, index) => {
    const day = shiftDay(today, index - days + 1);
    return { day, views: byDay.get(day) ?? 0 };
  });
}

// Views from `from` to `to`, both days included.
export function sumViews(rows: ViewRow[], from: string, to: string) {
  return rows.reduce((total, row) => (row.day >= from && row.day <= to ? total + row.views : total), 0);
}

// Whole-number percent change; null when there is no earlier figure to compare with.
export function percentChange(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

export function normalizeChartDays(value: string | undefined) {
  const days = Number(value);
  return (CHART_DAY_OPTIONS as readonly number[]).includes(days) ? days : 14;
}

const worst = (states: CheckState[]): CheckState =>
  states.includes("fail") ? "fail" : states.includes("warn") ? "warn" : "ok";

export function overallState(checks: SiteCheck[]) {
  return worst(checks.map((check) => check.state));
}

// The first check that is not fine, in the order the console lists them.
export function firstProblem(checks: SiteCheck[]) {
  return checks.find((check) => check.state === "fail") ?? checks.find((check) => check.state === "warn") ?? null;
}

export function evaluateSiteChecks(input: {
  counterReachable: boolean;
  pages: ConsolePage[];
  schools: ConsoleSchool[];
  today: string;
  upcomingBySchool: Map<string, number>;
  views: ViewRow[];
}): SiteCheck[] {
  const { counterReachable, pages, schools, today, upcomingBySchool, views } = input;
  const published = pages.filter((page) => page.status === "published");
  const liveIds = new Set(published.map((page) => page.school_id));
  const live = schools.filter((school) => liveIds.has(school.id));
  const nameOf = new Map(schools.map((school) => [school.id, school.name]));
  const namesFor = (items: Array<{ school_id: string }>) =>
    [...new Set(items.map((item) => nameOf.get(item.school_id) ?? ""))].filter(Boolean);
  const staleBefore = shiftDay(today, -STALE_PAGE_DAYS);
  const quietFrom = shiftDay(today, -(QUIET_SITE_DAYS - 1));

  const emptyPages = published.filter((page) => !page.body.trim());
  const sections = published.filter((page) => !page.parent_id);
  const missingPhotos = sections.filter((page) => !page.cover_path);
  const stalePages = published.filter((page) => page.updated_at.slice(0, 10) < staleBefore);
  const noUpcoming = live.filter((school) => !(upcomingBySchool.get(school.id) ?? 0));
  const quiet = live.filter((school) => sumViews(views.filter((row) => row.school_id === school.id), quietFrom, today) === 0);
  const drafts = pages.filter((page) => page.status !== "published");

  return [
    { count: counterReachable ? 0 : 1, id: "counter", schools: [], state: counterReachable ? "ok" : "fail" },
    { count: live.length, id: "liveSites", schools: live.map((school) => school.name), state: live.length ? "ok" : "warn" },
    { count: emptyPages.length, id: "emptyPages", schools: namesFor(emptyPages), state: emptyPages.length ? "warn" : "ok" },
    { count: missingPhotos.length, id: "missingPhotos", schools: namesFor(missingPhotos), state: missingPhotos.length ? "warn" : "ok" },
    { count: stalePages.length, id: "stalePages", schools: namesFor(stalePages), state: stalePages.length ? "warn" : "ok" },
    { count: noUpcoming.length, id: "noUpcoming", schools: noUpcoming.map((school) => school.name), state: noUpcoming.length ? "warn" : "ok" },
    {
      count: quiet.length,
      id: "quietSites",
      schools: quiet.map((school) => school.name),
      // Without the counter there is nothing to judge.
      state: counterReachable && quiet.length ? "warn" : "ok",
    },
    // Drafts are normal work in progress: listed, never a problem.
    { count: drafts.length, id: "drafts", schools: namesFor(drafts), state: "ok" },
  ];
}
