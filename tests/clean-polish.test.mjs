import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("the top bar uses one word for events and lists Clubs for staff", () => {
  const shell = read("src/app/(admin)/_components/app-shell.tsx");
  assert.doesNotMatch(shell, /nav\.tabs\.events/);
  const start = shell.indexOf("function getTopTabs");
  const fn = shell.slice(start, shell.indexOf("\n}", start));
  const staffTabs = fn.slice(fn.lastIndexOf("  return ["));
  assert.match(staffTabs, /href: "\/clubs", icon: "clubs"/);
  assert.match(read("src/app/globals.css"), /\.top-tab \{\s*white-space: nowrap;/);
});

test("the clock is 24-hour with no English city name", () => {
  const clock = read("src/app/(admin)/_components/top-bar-clock.tsx");
  assert.match(clock, /hourCycle: "h23"/);
  assert.doesNotMatch(clock, /split\("\/"\)/);
});

test("the events subtitle names the user's own school", () => {
  const events = read("src/app/(admin)/events/page.tsx");
  // Loaded in the same query as the other school names, not in a query of its own.
  assert.match(events, /getSchoolsById\(admin, Array\.from\(new Set\(\[\.\.\.ownerSchoolIds, profile\.school_id\]\)\)\)/);
  assert.match(events, /const ownSchoolName = schoolNameById\.get\(profile\.school_id\) \?\? "";/);
  assert.match(events, /school: ownSchoolName,/);
});

test("category chips scroll in one row and the menu stays outside the scroller", () => {
  assert.match(read("src/app/(admin)/events/events-filters.tsx"), /<div className="cl-chip-scroll">/);
  assert.match(read("src/app/(admin)/clubs/page.tsx"), /className="cl-chip-scroll"/);
  assert.match(read("src/app/globals.css"), /\.cl-chip-scroll \{[^}]*overflow-x: auto;/);
});

test("club cards no longer carry the archive button; the edit page does, for staff", () => {
  const clubs = read("src/app/(admin)/clubs/page.tsx");
  assert.doesNotMatch(clubs, /action=\{archiveClub\}/);
  const edit = read("src/app/(admin)/clubs/[clubId]/edit/page.tsx");
  assert.match(edit, /action=\{archiveClub\}/);
  assert.match(edit, /actor\.profile\?\.role === "school_admin" \|\| actor\.profile\?\.role === "teacher"/);
});

test("the demo seed touches only the demo school and can be removed exactly", () => {
  const seed = read("supabase/demo/demo-school-seed.sql");
  assert.match(seed, /lower\(u\.email\) = 'admin@demo-school\.test'/);
  assert.match(seed, /raise notice 'Demo admin account not found: nothing inserted\.'/);
  assert.match(seed, /'DEMO-' \|\| lpad/);
  const cleanup = read("supabase/demo/demo-school-cleanup.sql");
  assert.match(cleanup, /student_number like 'DEMO-%'/);
  for (const kind of ["event", "roster", "announcement", "member"]) {
    assert.match(seed, new RegExp(`md5\\('sah-demo-${kind}-`));
    assert.match(cleanup, new RegExp(`md5\\('sah-demo-${kind}-`));
  }
});
