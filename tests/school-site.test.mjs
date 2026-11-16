import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { bodyParagraphs, buildPageTree } from "../src/lib/site/page-tree.ts";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Resolve the app's "@/..." imports to src/*.ts so library code can be loaded as is.
const srcUrl = pathToFileURL(join(process.cwd(), "src/")).href;
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(specifier, context, next) {
        return specifier.startsWith("@/") ? next(${JSON.stringify(srcUrl)} + specifier.slice(2) + ".ts", context) : next(specifier, context);
      }`,
    ),
);

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

test("cover photos: only a controlled path in the page's own folder is accepted", async () => {
  const { buildSiteCoverPath, isControlledSiteCoverPath } = await import("../src/lib/site/site-cover.ts");
  const school = "11111111-1111-4111-8111-111111111111";
  const pageId = "22222222-2222-4222-8222-222222222222";
  const path = buildSiteCoverPath(school, pageId, "image/jpeg", "33333333-3333-4333-8333-333333333333");
  assert.equal(path, `${school}/${pageId}/cover/33333333-3333-4333-8333-333333333333.jpg`);
  assert.equal(isControlledSiteCoverPath(path, school, pageId), true);
  assert.equal(isControlledSiteCoverPath(path, school, "44444444-4444-4444-8444-444444444444"), false);
  assert.equal(isControlledSiteCoverPath(`${school}/${pageId}/cover/../x.jpg`, school, pageId), false);
});

test("cover photos: at most 5 MB and at least 1000 x 560, checked from the bytes", async () => {
  const { SITE_COVER_MAX_BYTES, SITE_COVER_MIN_HEIGHT, SITE_COVER_MIN_WIDTH, inspectSiteCover } = await import("../src/lib/site/site-cover.ts");
  assert.equal(SITE_COVER_MAX_BYTES, 5 * 1024 * 1024);
  assert.equal(SITE_COVER_MIN_WIDTH, 1000);
  assert.equal(SITE_COVER_MIN_HEIGHT, 560);
  // Smallest PNG the detector accepts: signature, IHDR, one IDAT byte, IEND.
  const png = (width, height) => {
    const bytes = new Uint8Array(58);
    const view = new DataView(bytes.buffer);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    view.setUint32(8, 13);
    bytes.set([73, 72, 68, 82], 12);
    view.setUint32(16, width);
    view.setUint32(20, height);
    view.setUint32(33, 1);
    bytes.set([73, 68, 65, 84], 37);
    bytes.set([73, 69, 78, 68], 50);
    return bytes;
  };
  assert.equal(inspectSiteCover(png(1600, 900), "image/png").ok, true);
  assert.deepEqual(inspectSiteCover(png(999, 900), "image/png"), { code: "dimensions", ok: false });
  assert.deepEqual(inspectSiteCover(png(1600, 559), "image/png"), { code: "dimensions", ok: false });
  assert.deepEqual(inspectSiteCover(png(1600, 900), "image/jpeg"), { code: "mimeMismatch", ok: false });
  assert.deepEqual(inspectSiteCover(new Uint8Array(SITE_COVER_MAX_BYTES + 1), "image/png"), { code: "tooLarge", ok: false });
});

test("cover photos are served only for a published page and kept in a private bucket", () => {
  const route = read("src/app/s/[school]/[page]/cover/route.ts");
  assert.match(route, /getPublicSite\(school\)/);
  assert.match(route, /isControlledSiteCoverPath\(path, site\.school\.id, page\.id\)/);
  const sql = read("supabase/migrations/202611170001_add_school_page_covers.sql");
  assert.match(sql, /'site-media',\s*'site-media',\s*false,/);
  assert.doesNotMatch(sql, /on storage\.objects/);
  assert.match(read("supabase/schema.sql"), /add column if not exists cover_path text/);
  const actions = read("src/app/(admin)/site/cover-actions.ts");
  assert.match(actions, /\.in\("role", \["school_admin", "teacher"\]\)/);
  assert.match(actions, /\.eq\("school_id", profile\.school_id\)/);
});

test("the home page leads with section photos and shows only the next three activities", () => {
  assert.match(read("src/app/s/[school]/page.tsx"), /getPublicActivities\(site\.school\.id, 3\)/);
  const view = read("src/app/s/[school]/site-view.tsx");
  assert.ok(view.indexOf('className="site-cards"') < view.indexOf("labels.upcoming}</h2>"));
});
