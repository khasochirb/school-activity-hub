import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { bodyParagraphs, buildPageTree } from "../src/lib/site/page-tree.ts";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const page = (id, parent_id, position, title = id) => ({ body: "", id, parent_id, position, slug: id, status: "published", title });

test("pages form a two-level menu, ordered by position", () => {
  const tree = buildPageTree([page("b", null, 2), page("a", null, 1), page("a2", "a", 2), page("a1", "a", 1)]);
  assert.deepEqual(tree.map((node) => node.id), ["a", "b"]);
  assert.deepEqual(tree[0].children.map((child) => child.id), ["a1", "a2"]);
});

test("a page whose parent is not published moves to the top level instead of vanishing", () => {
  const tree = buildPageTree([page("a", null, 1), page("orphan", "unpublished-parent", 2)]);
  assert.deepEqual(tree.map((node) => node.id), ["a", "orphan"]);
});

test("page text is split into paragraphs and never parsed as markup", () => {
  assert.deepEqual(bodyParagraphs("One\nstill one\n\n\nTwo  \n\n"), ["One\nstill one", "Two"]);
  const view = read("src/app/s/[school]/site-view.tsx");
  assert.doesNotMatch(view, /dangerouslySetInnerHTML/);
});

test("the public site reads only published pages, approved upcoming activities and active clubs", () => {
  const source = read("src/lib/site/school-site.ts");
  assert.match(source, /\.from\("schools"\)[\s\S]*?\.eq\("status", "active"\)/);
  assert.match(source, /\.from\("school_pages"\)[\s\S]*?\.eq\("status", "published"\)/);
  assert.match(source, /\.from\("events"\)[\s\S]*?\.eq\("status", "approved"\)[\s\S]*?\.gte\("starts_at"/);
  assert.match(source, /\.from\("clubs"\)[\s\S]*?\.eq\("status", "active"\)/);
  // No table that holds students may be read by the public site.
  for (const table of ["student_rosters", "club_memberships", "event_attendees", "profiles", "portfolio"]) {
    assert.doesNotMatch(source, new RegExp(`from\\("${table}`), table);
  }
  assert.match(source, /\.select\("id, title, starts_at, ends_at, location, category"\)/);
});

test("the pages table is closed to the anonymous role and to students", () => {
  const migration = read("supabase/migrations/202611160001_add_school_pages.sql");
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.school_pages from anon;/);
  assert.doesNotMatch(migration, /to anon\b/);
  const policies = migration.match(/create policy[\s\S]*?;/g) ?? [];
  assert.equal(policies.length, 4);
  for (const policy of policies) {
    assert.match(policy, /to authenticated/);
    assert.match(policy, /current_user_can_manage_school\(school_id\)/);
  }
  assert.match(read("supabase/schema.sql"), /create table if not exists public\.school_pages/);
});

test("only active staff can write pages, and only in their own school", () => {
  const actions = read("src/app/(admin)/site/actions.ts");
  assert.match(actions, /\.eq\("status", "active"\)\s*\.in\("role", \["school_admin", "teacher"\]\)/);
  assert.equal(actions.match(/\.eq\("school_id", profile\.school_id\)/g)?.length, 3);
  assert.match(actions, /school_id: profile\.school_id,/);
});

test("the demo site seed targets the demo school and the cleanup removes it", () => {
  const seed = read("supabase/demo/demo-school-site-seed.sql");
  assert.match(seed, /lower\(u\.email\) = 'admin@demo-school\.test'/);
  assert.equal(seed.match(/md5\('sah-demo-page-\d+'\)::uuid, demo_school/g)?.length, 24);
  assert.match(read("supabase/demo/demo-school-cleanup.sql"), /md5\('sah-demo-page-' \|\| i\)::uuid from generate_series\(1, 24\)/);
});
