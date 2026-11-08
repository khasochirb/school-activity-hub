import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/202611080002_add_club_classmates.sql");
const fn = migration.slice(
  migration.indexOf("create or replace function public.get_club_classmates"),
  migration.indexOf("create or replace function public.set_show_name_to_classmates"),
);

test("classmates are limited to the student's own school and class, never themselves", () => {
  assert.match(fn, /security definer/);
  assert.match(fn, /public\.current_student_roster_id\(\)/);
  assert.match(fn, /classmate\.school_id = me\.school_id/);
  assert.match(fn, /lower\(btrim\(classmate\.homeroom\)\) = lower\(btrim\(me\.homeroom\)\)/);
  assert.match(fn, /classmate\.id <> me\.id/);
  assert.match(fn, /classmate\.status = 'active'/);
  assert.match(fn, /cm\.status = 'active'/);
  // A student with no class recorded sees nobody.
  assert.match(fn, /nullif\(btrim\(sr\.homeroom\), ''\) is not null/);
});

test("only a first name and family initial leave the database, and students can opt out", () => {
  assert.match(fn, /returns table \(club_id uuid, display_name text\)/);
  // Mongolian order: «Б. Болд».
  assert.match(fn, /upper\(left\(btrim\(classmate\.last_name\), 1\)\) \|\| '\. '\s+\|\| btrim\(coalesce/);
  assert.match(fn, /and classmate\.show_name_to_classmates/);
  assert.match(migration, /revoke all on function public\.get_club_classmates\(uuid\[\]\) from public, anon;/);
  assert.match(read("supabase/schema.sql"), /show_name_to_classmates boolean not null default true/);
});

test("club rows show up to three classmates and the profile has the opt-out switch", () => {
  const clubs = read("src/app/(admin)/clubs/page.tsx");
  assert.match(clubs, /rpc\("get_club_classmates", \{ target_club_ids: clubIds \}\)/);
  assert.match(clubs, /names\.slice\(0, 3\)/);
  const profile = read("src/app/(admin)/profile/page.tsx");
  assert.match(profile, /action=\{setShowNameToClassmates\}/);
  assert.match(profile, /defaultChecked=\{studentRoster\.show_name_to_classmates !== false\}/);
  assert.match(read("src/app/(admin)/profile/actions.ts"), /rpc\("set_show_name_to_classmates"/);
});
