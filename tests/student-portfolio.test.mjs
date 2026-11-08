import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildPortfolioMediaPath,
  entryVisibleAs,
  isControlledPortfolioMediaPath,
  isPortfolioKind,
  isPortfolioVisibility,
} from "../src/lib/portfolio/portfolio.ts";

const root = process.cwd();
const migrationPath = "supabase/migrations/202611070001_add_student_portfolios.sql";
const schoolId = "aaaaaaaa-0000-4000-8000-000000000001";
const rosterId = "bbbbbbbb-0000-4000-8000-000000000001";
const entryId = "cccccccc-0000-4000-8000-000000000001";
const fileId = "dddddddd-0000-4000-8000-000000000001";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("portfolio tables are select-only for clients and gated by row-level security", () => {
  const migration = read(migrationPath);

  assert.match(migration, /alter table public\.portfolio_entries enable row level security/);
  assert.match(migration, /alter table public\.portfolio_feedback enable row level security/);
  assert.match(migration, /using \(public\.current_user_can_view_portfolio_entry\(id\)\)/);
  assert.match(
    migration,
    /revoke insert, update, delete, truncate, trigger, references\s+on table public\.portfolio_entries from authenticated/,
  );
  assert.match(migration, /revoke all privileges on table public\.portfolio_entries from anon/);
  assert.doesNotMatch(migration, /grant (insert|update|delete)[^;]*portfolio_/);
});

test("drafts and private entries stay with the owner; platform admins get no access", () => {
  const migration = read(migrationPath);
  const viewFn = migration.slice(
    migration.indexOf("create or replace function public.current_user_can_view_portfolio_entry"),
    migration.indexOf("alter function public.current_user_can_view_portfolio_entry"),
  );

  assert.match(viewFn, /not e\.is_draft/);
  assert.match(viewFn, /e\.visibility in \('staff', 'school'\) and public\.current_profile_is_staff\(\)/);
  assert.match(viewFn, /e\.visibility = 'school'/);
  assert.doesNotMatch(viewFn, /current_user_is_platform_admin/);
});

test("teacher notes are readable by the owner and staff only", () => {
  const migration = read(migrationPath);

  assert.match(
    migration,
    /current_user_can_view_portfolio_entry\(entry_id\)\s+and \(\s+public\.current_user_owns_portfolio_entry\(entry_id\)\s+or public\.current_profile_is_staff\(\)/,
  );
});

test("photo references can only be set by the server and the bucket is private", () => {
  const migration = read(migrationPath);

  assert.match(
    migration,
    /revoke all on function public\.set_portfolio_entry_media\(uuid, text\[\], uuid\)\s+from public, anon, authenticated;\s+grant execute on function public\.set_portfolio_entry_media\(uuid, text\[\], uuid\)\s+to service_role;/,
  );
  assert.match(migration, /'portfolio-media',\s+'portfolio-media',\s+false,\s+5242880/);
  assert.doesNotMatch(migration, /on storage\.objects/);
  assert.match(migration, /coalesce\(array_length\(media_paths, 1\), 0\) <= 6/);
});

test("schema.sql carries the portfolio migration", () => {
  assert.match(read("supabase/schema.sql"), /create table if not exists public\.portfolio_entries/);
});

test("photo paths are scoped to one school, student and entry", () => {
  const path = buildPortfolioMediaPath(schoolId, rosterId, entryId, "image/jpeg", fileId);

  assert.equal(path, `${schoolId}/${rosterId}/${entryId}/${fileId}.jpg`);
  assert.equal(isControlledPortfolioMediaPath(path, schoolId, rosterId, entryId), true);
  assert.equal(
    isControlledPortfolioMediaPath(path, schoolId, rosterId, "eeeeeeee-0000-4000-8000-000000000001"),
    false,
  );
  assert.equal(isControlledPortfolioMediaPath(`../${path}`, schoolId, rosterId, entryId), false);
  assert.equal(
    isControlledPortfolioMediaPath(path.replace(".jpg", ".svg"), schoolId, rosterId, entryId),
    false,
  );
  assert.equal(isControlledPortfolioMediaPath(path, "not-a-uuid", rosterId, entryId), false);
});

test("View as matches the database rules", () => {
  const base = { is_draft: false, visibility: "school" };

  assert.equal(entryVisibleAs({ ...base, is_draft: true }, "me"), true);
  assert.equal(entryVisibleAs({ ...base, is_draft: true }, "teacher"), false);
  assert.equal(entryVisibleAs({ ...base, visibility: "private" }, "teacher"), false);
  assert.equal(entryVisibleAs({ ...base, visibility: "staff" }, "teacher"), true);
  assert.equal(entryVisibleAs({ ...base, visibility: "staff" }, "classmate"), false);
  assert.equal(entryVisibleAs(base, "classmate"), true);
  assert.equal(isPortfolioKind("photos"), true);
  assert.equal(isPortfolioKind("hack"), false);
  assert.equal(isPortfolioVisibility("public"), false);
});

test("photos are served only after row-level security returns the entry", () => {
  const route = read("src/app/(admin)/portfolio/media/[entryId]/[index]/route.ts");

  assert.match(route, /createClient\(\)[\s\S]*from\("portfolio_entries"\)[\s\S]*createAdminClient\(\)/);
  assert.match(route, /isControlledPortfolioMediaPath\(/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.match(route, /"X-Content-Type-Options": "nosniff"/);
});

test("uploads are validated on the server before they are attached", () => {
  const actions = read("src/app/(admin)/portfolio/actions.ts");

  assert.match(actions, /createSignedUploadUrl\(path, \{ upsert: false \}\)/);
  assert.match(actions, /inspectPortfolioPhoto\([\s\S]*if \(!inspection\.ok\) \{\s+await removeObjects/);
  assert.match(actions, /current_user_owns_portfolio_entry/);
});

test("photos are re-encoded in the browser so location data is dropped", () => {
  const tools = read("src/app/(admin)/portfolio/entry-owner-tools.tsx");

  assert.match(tools, /canvas\.toBlob\([\s\S]*"image\/jpeg"/);
});

test("portfolio text exists in English and Mongolian and students can find it", () => {
  const en = read("src/lib/i18n/dictionaries/en.ts");
  const mn = read("src/lib/i18n/dictionaries/mn.ts");
  const shell = read("src/app/(admin)/_components/app-shell.tsx");

  for (const dictionary of [en, mn]) {
    assert.match(dictionary, /\n  portfolio: \{/);
    assert.match(dictionary, /bannerClassmate:/);
    assert.match(dictionary, /noRoster:/);
  }
  assert.match(shell, /href: "\/portfolio",\s+labelKey: "nav\.portfolio",[^}]*roles: \["student"\]/);
  assert.match(read("src/app/(admin)/students/page.tsx"), /\/portfolio\/students\/\$\{student\.id\}/);
});
