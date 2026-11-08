import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);

  assert.ok(start >= 0, `${name} not found`);
  const next = source.indexOf("\nfunction ", start + 1);
  const nextAsync = source.indexOf("\nasync function ", start + 1);
  const ends = [next, nextAsync].filter((index) => index > 0);

  return source.slice(start, ends.length ? Math.min(...ends) : undefined);
}

test("signed-in users get the phone tab bar, with four tabs", () => {
  const shell = read("src/app/(admin)/_components/app-shell.tsx");
  const tabBar = read("src/app/(admin)/_components/student-tab-bar.tsx");

  assert.match(shell, /\{profile \? \(\s*<StudentTabBar/);
  // Staff get Students where students get Profile.
  assert.match(shell, /: \{ href: "\/students", label: t\("nav\.students"\) \}/);
  for (const href of ["/dashboard", "/events", "/clubs", "/profile"]) {
    assert.match(shell, new RegExp(`href: "${href}", label: t\\("nav\\.tabs\\.`));
  }
  assert.match(tabBar, /lg:hidden/);
  assert.match(tabBar, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(tabBar, /safe-area-inset-bottom/);
});

test("the student home leads with what is coming up and clubs, not staff charts", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const studentHome = functionBody(dashboard, "StudentDashboard");

  assert.doesNotMatch(studentHome, /<MetricCard|<DashboardCharts|StudentWelcomeOverview/);
  assert.ok(
    studentHome.indexOf("StudentUpcomingEvents") < studentHome.indexOf("<StudentClubsForYouSection"),
  );
  assert.ok(
    studentHome.indexOf("<StudentClubsForYouSection") < studentHome.indexOf("<LatestAnnouncementsSection"),
  );
});

test("home club suggestions run as the student and skip clubs already joined", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const loader = functionBody(dashboard, "getStudentClubsForYou");

  assert.doesNotMatch(loader, /admin|createAdminClient/);
  assert.match(loader, /filter\(\(club\) => !joined\.has\(club\.id\)\)/);
  assert.match(loader, /matchClubsToInterests\([\s\S]*3,\s*\)/);
});

test("'you joined every matching club' needs at least one matching club", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const loader = functionBody(dashboard, "getStudentClubsForYou");
  const section = functionBody(dashboard, "StudentClubsForYouSection");

  assert.match(
    loader,
    /allMatchesJoined:\s+everyMatch\.forYou\.length > 0 && notJoined\.forYou\.length === 0/,
  );
  assert.match(loader, /interestsWithoutClubs: everyMatch\.interestsWithoutClubs/);
  assert.match(section, /allMatchesJoined \? \(\s+<p[^>]*>\s+\{t\("studentProfile\.clubsForYou\.noneLeft"\)\}/);
});

test("clubs filter by category in one tap", () => {
  const clubs = read("src/app/(admin)/clubs/page.tsx");

  assert.match(clubs, /<CategoryChips/);
  assert.match(clubs, /aria-current=\{link\.active \? "page" : undefined\}/);
  assert.doesNotMatch(clubs, /name="category"\s+options=/);
});

test("the pinned join bar shows only to students who have not joined", () => {
  const club = read("src/app/(admin)/clubs/[clubId]/page.tsx");

  assert.match(
    club,
    /actor\.profile\?\.role === "student" &&\s+club\.status === "active" &&\s+!activeMembership \? \(\s+<div className="fixed/,
  );
});

test("tab labels exist in English and Mongolian", () => {
  for (const path of [
    "src/lib/i18n/dictionaries/en.ts",
    "src/lib/i18n/dictionaries/mn.ts",
  ]) {
    const dictionary = read(path);

    assert.ok(dictionary.includes("    tabs: {"), `${path} is missing nav.tabs`);
    assert.ok(dictionary.includes("noneLeft:"), `${path} is missing noneLeft`);
  }
});
