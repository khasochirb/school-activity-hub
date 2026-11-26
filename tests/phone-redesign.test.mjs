import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("the student home opens with the next registered activity", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const home = dashboard.slice(dashboard.indexOf("function StudentDashboard("));
  assert.ok(home.indexOf("<StudentNextEventCard") < home.indexOf("<StudentUpcomingEvents"));
  const card = dashboard.slice(dashboard.indexOf("function StudentNextEventCard("), dashboard.indexOf("function relativeTimeLabel("));
  assert.match(card, /registrationStatus === "registered"/);
  // Check in opens an hour before the start and closes at the end.
  assert.match(card, /now >= startsAt - 60 \* 60 \* 1000 && now <= endsAt/);
  assert.match(card, /`\/check-in\/\$\{next\.id\}`/);
  assert.match(card, /t\("checkIn\.actions\.checkIn"\)/);
  assert.doesNotMatch(card, /Date\.now\(\)/);
});

test("student club rows show a tile and the member count", () => {
  const clubs = read("src/app/(admin)/clubs/page.tsx");
  assert.match(clubs, /<ClubTile category=\{club\.category\} name=\{club\.name\} \/>/);
  assert.match(clubs, /tf\("news\.members", \{ count: memberCountByClub\.get\(club\.id\) \?\? 0 \}\)/);
  // Counts only: the service-role query selects club ids, never names.
  const countQuery = clubs.slice(clubs.indexOf("clubs.query.member-counts"), clubs.indexOf("clubs.query.member-counts") + 400);
  assert.match(countQuery, /\.select\("club_id"\)/);
});

test("the phone tab bar floats above the page", () => {
  const tabBar = read("src/app/(admin)/_components/student-tab-bar.tsx");
  assert.match(tabBar, /rounded-\[1\.4rem\]/);
  assert.match(tabBar, /bg-\[var\(--primary-soft\)\]/);
  assert.match(tabBar, /href === "\/students"/);
});
