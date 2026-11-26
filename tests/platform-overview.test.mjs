import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  CODE_EXPIRY_DAYS,
  FUNNEL_STEPS,
  PENDING_DAYS,
  RECENT_DAYS,
  UPCOMING_DAYS,
  dailyCounts,
  overviewChecks,
  overviewTotals,
  shareOf,
  summarizeSchools,
} from "../src/lib/platform/overview.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const NOW = new Date("2026-11-24T04:00:00Z");
const at = (days, ms = 0) => new Date(NOW.getTime() + days * 86_400_000 + ms).toISOString();
const base = {
  attendees: [], checkins: [], clubRequests: [], clubs: [], codes: [], events: [], memberships: [],
  rosters: [],
  schools: [{ id: "s", is_demo: false, name: "School", slug: "school" }],
  signups: [],
  staff: [{ role: "school_admin", school_id: "s" }],
};
const student = (id, joined, school = "s") => ({ id, profile_id: joined ? `p-${id}` : null, school_id: school });
const one = (over) => summarizeSchools({ ...base, ...over }, NOW)[0];
const check = (over, id) => overviewChecks(summarizeSchools({ ...base, ...over }, NOW)).find((item) => item.id === id);

test("thresholds", () => {
  assert.deepEqual([CODE_EXPIRY_DAYS, PENDING_DAYS, RECENT_DAYS, UPCOMING_DAYS], [7, 3, 7, 30]);
});

test("each step counts students of the step before: club and events need a joined student", () => {
  const summary = one({
    attendees: [
      { status: "attended", student_roster_id: "a" },
      { status: "registered", student_roster_id: "b" },
      { status: "canceled", student_roster_id: "c" },
      { status: "attended", student_roster_id: "waiting" },
    ],
    codes: [{ expires_at: at(20), status: "active", student_roster_id: "waiting" }],
    memberships: [{ student_roster_id: "a" }, { student_roster_id: "a" }, { student_roster_id: "waiting" }],
    rosters: [student("a", true), student("b", true), student("c", true), student("waiting", false), student("none", false)],
  });

  assert.deepEqual(
    FUNNEL_STEPS.map((step) => summary[step]),
    // 5 on the list, 3 joined + 1 with a code, 3 joined, 1 in a club, 2 registered, 1 checked in.
    [5, 4, 3, 1, 2, 1],
  );
});

test("a code is usable only while active and unexpired; students who joined need none", () => {
  const rosters = [student("joined", true), student("joined-no-code", true), student("ok", false), student("soon", false), student("old", false), student("revoked", false)];
  const summary = one({
    codes: [
      { expires_at: at(20), status: "active", student_roster_id: "ok" },
      { expires_at: at(7), status: "active", student_roster_id: "soon" },
      { expires_at: at(-1), status: "active", student_roster_id: "old" },
      { expires_at: at(20), status: "revoked", student_roster_id: "revoked" },
      { expires_at: at(2), status: "active", student_roster_id: "joined" },
    ],
    rosters,
  });

  assert.equal(summary.noCode, 2);
  assert.equal(summary.codesExpiring, 1);
  assert.equal(one({ codes: [{ expires_at: at(7, 1), status: "active", student_roster_id: "ok" }], rosters: [student("ok", false)] }).codesExpiring, 0);
});

test("upcoming means approved and starting within 30 days; check-ins are the last 7 days", () => {
  const event = (days, status = "approved") => ({ created_at: at(-1), school_id: "s", starts_at: at(days), status });

  assert.equal(one({ events: [event(0), event(30), event(31), event(-1), event(3, "pending_approval")] }).upcoming, 2);
  assert.equal(one({ checkins: [{ checked_in_at: at(-6), school_id: "s" }, { checked_in_at: at(-8), school_id: "s" }] }).checkinsRecent, 1);
});

test("waiting counts events and clubs; overdue is more than 3 days", () => {
  const summary = one({
    clubRequests: [{ created_at: at(-4), school_id: "s", status: "pending" }],
    events: [{ created_at: at(-3), school_id: "s", starts_at: at(5), status: "pending_approval" }],
  });

  assert.equal(summary.pending, 2);
  assert.equal(summary.pendingOld, 1);
});

test("demo schools never count in totals or checks", () => {
  const schools = [...base.schools, { id: "d", is_demo: true, name: "Demo", slug: "demo" }];
  const rows = { ...base, clubs: [{ school_id: "d" }], rosters: [student("a", true), student("x", true, "d")], schools };
  const summaries = summarizeSchools(rows, NOW);

  assert.equal(summaries.length, 2);
  assert.equal(overviewTotals(summaries).students, 1);
  assert.equal(overviewTotals(summaries).schools, 1);
  assert.equal(overviewTotals(summaries).clubs, 0);
  // The demo school here has no admin, and that is not a problem to report.
  assert.equal(overviewChecks(summaries).find((item) => item.id === "adminMissing").state, "ok");
});

test("checks: a missing admin is an error, the rest are warnings", () => {
  assert.equal(check({ staff: [] }, "adminMissing").state, "fail");
  assert.equal(check({ staff: [{ role: "teacher", school_id: "s" }] }, "adminMissing").state, "fail");
  assert.equal(check({}, "adminMissing").state, "ok");
  assert.equal(check({ rosters: [student("a", false)] }, "noCode").state, "warn");
  assert.equal(check({ rosters: [student("a", true)] }, "noUpcoming").state, "warn");
  // Nobody has joined yet, so an empty calendar is not a problem.
  assert.equal(check({ rosters: [student("a", false)] }, "noUpcoming").state, "ok");
});

test("shares are whole percents of the list, and unknown without a list", () => {
  assert.equal(shareOf(1, 3), 33);
  assert.equal(shareOf(0, 5), 0);
  assert.equal(shareOf(0, 0), null);
});

test("the daily series ends today and fills empty days with 0", () => {
  assert.deepEqual(dailyCounts(["2026-11-24", "2026-11-22", "2026-11-24", "2026-11-01"], 3, "2026-11-24"), [
    { count: 1, day: "2026-11-22" },
    { count: 0, day: "2026-11-23" },
    { count: 2, day: "2026-11-24" },
  ]);
});

const data = read("src/app/(console)/super-admin/overview-data.ts");

test("the overview reads no names, codes or contact details", () => {
  for (const [, columns] of data.matchAll(/\.select\("([^"]+)"\)/g)) {
    if (columns.includes("slug")) continue; // schools: their own names are public
    assert.doesNotMatch(columns, /name|email|code|title|student_number|homeroom|reason|body|\*/, columns);
  }
  assert.doesNotMatch(data, /safety_reports|portfolio|safeguarding/);
});

test("every table is read in full or not shown at all", () => {
  // Without paging, anything past 1,000 rows would be dropped without an error.
  assert.equal(data.match(/\.range\(from, to\)/g).length, 11);
  assert.equal(data.match(/\.order\("id"\)/g).length, 11);
  assert.match(data, /if \(error\) \{[\s\S]+?throw new Error/);
  assert.match(read("src/app/(console)/super-admin/page.tsx"), /if \(!overview\) \{/);
});

test("platform admins only, one page at that address, and no redirect loop", () => {
  assert.match(read("src/app/(console)/super-admin/page.tsx"), /await requirePlatformAdmin\(\);/);
  assert.equal(existsSync(join(process.cwd(), "src/app/(admin)/super-admin/page.tsx")), false);
  assert.match(
    read("src/app/(admin)/dashboard/page.tsx"),
    /if \(!requestedSchoolId && \(await getCurrentPlatformAdminProfile\(\)\)\) \{\s+redirect\("\/super-admin"\)/,
  );
});

test("platform admins keep the console frame on every page, with a way to sign out", () => {
  const layout = read("src/app/(admin)/layout.tsx");
  const shell = read("src/app/(console)/console-shell.tsx");

  // Signed-out visitors are turned away before the frame is chosen.
  assert.ok(layout.indexOf('redirect("/login")') < layout.indexOf("if (platformAdminProfile) {"));
  assert.match(layout, /if \(platformAdminProfile\) \{[\s\S]*?return \(\s+<ConsoleFrame/);
  // Everyone else keeps the school app.
  assert.ok(layout.indexOf("<ConsoleFrame") < layout.lastIndexOf("<AppShell"));
  assert.match(shell, /<form action=\{logout\}>/);
  // School pages sit under the school picker and show that one school.
  // (Owner's call, 24 Nov 2026: platform admins switch school, never mix.)
  assert.match(shell, /href: "\/students"/);
  assert.ok(shell.indexOf("{schoolSwitcher}") < shell.indexOf("{school.map("));
  assert.doesNotMatch(shell, /href: "\/safety/);
});

test("a school's page switches the console to that school", () => {
  const page = read("src/app/(admin)/super-admin/schools/[schoolId]/page.tsx");

  // No cross-school links: switching is the only way into a school's pages.
  assert.doesNotMatch(page, /\?school=/);
  assert.match(page, /<SwitchToSchoolButton/);
  assert.match(page, /\.from\("clubs"\)\s+\.select\("id, name, status"\)\s+\.eq\("school_id", schoolId\)/);
});
