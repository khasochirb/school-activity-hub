import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { isParentAllowedPath } from "../src/lib/family/parent-paths.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("parent accounts only reach the family, sign-in and public pages", () => {
  for (const path of ["/", "/family", "/join/parent", "/login", "/reset-password", "/s/khangai-high"]) {
    assert.equal(isParentAllowedPath(path), true, path);
  }
  for (const path of ["/dashboard", "/clubs", "/students", "/events/abc", "/portfolio", "/familyx", "/settings", "/schedule"]) {
    assert.equal(isParentAllowedPath(path), false, path);
  }
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /user\?\.app_metadata\?\.account_type === PARENT_ACCOUNT_TYPE/);
  assert.match(proxy, /url\.pathname = "\/family"/);
  // The school app's layout sends parents away too.
  assert.match(read("src/app/(admin)/layout.tsx"), /profile\?\.role === "parent"\) \{\s*redirect\("\/family"\)/);
});

test("parents get no school-wide reads in the database", () => {
  const migration = read("supabase/migrations/202611230005_add_parent_accounts.sql");
  assert.match(migration, /and p\.role::text <> 'parent'/);
  assert.match(migration, /revoke all on public\.parent_links from anon, authenticated;/);
  assert.doesNotMatch(migration, /grant (insert|update|delete)/);
  assert.match(migration, /add value if not exists 'parent'/);
});

test("a parent sees only children linked to their own account", () => {
  const data = read("src/lib/family/family-data.ts");
  assert.match(data, /\.from\("parent_links"\)[\s\S]*?\.eq\("parent_profile_id", parent\.id\)/);
  assert.match(data, /data\.role !== "parent"\) return null;/);
  // Every child query is limited to the rosters from those links.
  for (const table of ["student_rosters", "club_memberships", "event_attendees"]) {
    assert.match(data, new RegExp(`\\.from\\("${table}"\\)[\\s\\S]*?\\.in\\("(id|student_roster_id)", rosterIds\\)`));
  }
});

test("codes are kept apart: parent codes never make students and vice versa", () => {
  assert.match(read("src/app/join/actions.ts"), /if \(invite\.audience !== "student"\) \{/);
  const codes = read("src/lib/family/parent-codes.ts");
  assert.match(codes, /if \(invite\.audience !== "parent"\) return \{ error: "studentCode"/);
  assert.match(codes, /if \(invite\.school_id !== parentSchoolId\) return \{ error: "otherSchool" \};/);
  // The code is marked used before the link is made, and only if still unused.
  assert.ok(codes.indexOf('.eq("use_count", 0)') < codes.indexOf('from("parent_links").insert'));
  const join = read("src/app/join/parent/actions.ts");
  assert.match(join, /app_metadata: \{ account_type: PARENT_ACCOUNT_TYPE \}/);
  assert.match(join, /role: "parent"/);
  // Generating parent codes doesn't block a student's own code.
  const actions = read("src/app/(admin)/invite-codes/actions.ts");
  assert.match(actions, /\.eq\("audience", "student"\)/);
  assert.match(actions, /\.eq\("audience", audience\)/);
});

test("a parent answers permission only for their own child's upcoming activities", () => {
  const actions = read("src/app/family/actions.ts");
  const answer = actions.slice(actions.indexOf("export async function answerPermission"));
  assert.match(answer, /if \(!\(await isParentOf\(parent\.id, rosterId\)\)\) return;/);
  assert.match(answer, /if \(!event\?\.permission_required/);
  assert.match(answer, /new Date\(event\.starts_at\)\.getTime\(\) <= Date\.now\(\)\) return;/);
  assert.match(answer, /\.eq\("student_roster_id", rosterId\)/);
  assert.match(answer, /answer !== "received" && answer !== "declined"/);
});

test("a parent sees only what their child shared with teachers, photos included", () => {
  const data = read("src/lib/family/family-data.ts");
  assert.match(data, /PARENT_VISIBLE_PORTFOLIO = \["staff", "school"\]/);
  assert.match(data, /\.eq\("is_draft", false\)/);
  const page = read("src/app/family/child/[rosterId]/page.tsx");
  assert.match(page, /!\(await isParentOf\(parent\.id, rosterId\)\)\) notFound\(\);/);
  const media = read("src/app/family/media/[entryId]/[index]/route.ts");
  assert.match(media, /entry\.is_draft/);
  assert.match(media, /isParentOf\(parent\.id, entry\.student_roster_id\)/);
  assert.match(media, /PARENT_VISIBLE_PORTFOLIO/);
});
