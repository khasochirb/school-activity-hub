import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/202608130004_add_club_profiles.sql";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("club profile data is optional, bounded, and school-aware", () => {
  const migration = read(migrationPath);

  assert.match(migration, /create table if not exists public\.club_profiles/);
  assert.match(migration, /club_id uuid primary key/);
  assert.match(
    migration,
    /foreign key \(club_id, school_id\)[\s\S]*references public\.clubs\(id, school_id\)/,
  );
  assert.match(migration, /tagline, 160/);
  assert.match(migration, /about, 2000/);
  assert.match(
    migration,
    /theme_key in \('warm', 'sky', 'forest', 'plum'\)/,
  );
  assert.doesNotMatch(migration, /contact|phone|social|external_url|html/);
});

test("club profile editing uses a narrow authenticated RPC", () => {
  const migration = read(migrationPath);

  assert.match(migration, /create or replace function public\.upsert_club_profile/);
  assert.match(migration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(migration, /current_user_can_edit_club_profile\(target_club_id\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(
    migration,
    /revoke all on function public\.upsert_club_profile[\s\S]*from public, anon/,
  );
  assert.match(
    migration,
    /grant execute on function public\.upsert_club_profile[\s\S]*to authenticated/,
  );
  const signature = migration.slice(
    migration.indexOf("create or replace function public.upsert_club_profile"),
    migration.indexOf("returns uuid", migration.indexOf("create or replace function public.upsert_club_profile")),
  );
  assert.doesNotMatch(
    signature,
    /school_id|name|category|status|advisor|membership|created_by/,
  );
});

test("club profile visibility and aggregates do not expose member rows", () => {
  const migration = read(migrationPath);

  assert.match(
    migration,
    /c\.school_id = public\.current_profile_school_id\(\)[\s\S]*c\.status = 'active'/,
  );
  assert.match(migration, /create or replace function public\.get_club_member_count/);
  assert.match(migration, /returns bigint/);
  assert.match(migration, /create or replace function public\.get_my_club_membership/);
  assert.doesNotMatch(
    migration,
    /grant select on table public\.club_memberships to authenticated/,
  );
});

test("club list links to the dedicated profile without nesting actions", () => {
  const clubsPage = read("src/app/(admin)/clubs/page.tsx");

  assert.match(clubsPage, /href=\{`\/clubs\/\$\{club\.id\}`\}/);
  assert.match(clubsPage, /viewNamedClub/);
  assert.match(clubsPage, /<ClubActions/);
});

test("club profile pages enforce authenticated access and render plain text", () => {
  const profilePage = read("src/app/(admin)/clubs/[clubId]/page.tsx");
  const editPage = read("src/app/(admin)/clubs/[clubId]/edit/page.tsx");

  for (const page of [profilePage, editPage]) {
    assert.match(page, /getCurrentClubActor/);
    assert.match(page, /notFound\(\)/);
    assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
  }

  assert.match(profilePage, /\.eq\("status", "approved"\)/);
  assert.match(profilePage, /\.limit\(3\)/);
  assert.match(profilePage, /get_club_member_count/);
  assert.doesNotMatch(profilePage, /first_name|last_name|email|student_number/);
  assert.match(editPage, /current_user_can_edit_club_profile/);
});

test("editor preserves values, validates fields, and revalidates both club routes", () => {
  const form = read(
    "src/app/(admin)/clubs/[clubId]/edit/club-profile-form.tsx",
  );
  const actions = read("src/app/(admin)/clubs/[clubId]/edit/actions.ts");

  assert.match(form, /useActionState/);
  assert.match(form, /useState\(initialValues\)/);
  assert.match(form, /disabled=\{pending\}/);
  assert.match(form, /aria-invalid/);
  assert.match(form, /state\.message && !state\.success/);
  assert.match(actions, /validateClubProfileValues/);
  assert.match(actions, /revalidatePath\("\/clubs"\)/);
  assert.match(actions, /revalidatePath\(`\/clubs\/\$\{clubId\}`\)/);
  assert.match(actions, /redirect\(`\/clubs\/\$\{clubId\}\?updated=1`\)/);
});

test("English and Mongolian club profile dictionaries are complete", () => {
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  for (const dictionary of [english, mongolian]) {
    assert.match(dictionary, /profile:\s*{/);
    assert.match(dictionary, /clubPage:/);
    assert.match(dictionary, /meetingSchedule:/);
    assert.match(dictionary, /upcomingActivities:/);
    assert.match(dictionary, /incompleteNotice:/);
    assert.match(dictionary, /charactersRemaining:/);
  }
});
