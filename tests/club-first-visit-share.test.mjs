import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function loadClubShareHelper() {
  const output = ts.transpileModule(read("src/lib/clubs/club-share.ts"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  const evaluate = new Function("exports", "module", output);

  evaluate(runtimeModule.exports, runtimeModule);
  return runtimeModule.exports;
}

const { buildClubShareText } = loadClubShareHelper();

const labels = {
  beginnersWelcome: "Beginners welcome",
  firstVisitFree: "First visit free",
  meetingLocation: "Where",
  meetingSchedule: "When",
};

test("a shared club carries its practical facts and first-visit labels", () => {
  assert.equal(
    buildClubShareText(
      {
        beginnersWelcome: true,
        firstVisitFree: true,
        meetingLocation: "Gym",
        meetingSchedule: "Tue 15:30",
        name: "Basketball",
      },
      labels,
    ),
    "Basketball\nWhen: Tue 15:30\nWhere: Gym\nBeginners welcome · First visit free",
  );
});

test("a shared club with no details is just its name", () => {
  assert.equal(
    buildClubShareText(
      {
        beginnersWelcome: false,
        firstVisitFree: false,
        meetingLocation: null,
        meetingSchedule: null,
        name: "Chess",
      },
      labels,
    ),
    "Chess",
  );
});

test("sharing never sends data to the platform", () => {
  const button = read("src/components/share-club-button.tsx");

  assert.doesNotMatch(button, /fetch\(|supabase|"use server"/);
  assert.match(button, /navigator\.share/);
  assert.match(button, /navigator\.clipboard\.writeText/);
});

test("first-visit flags are booleans that an older save cannot clear", () => {
  const migration = read("supabase/migrations/202611010002_add_club_first_visit_flags.sql");
  const schema = read("supabase/schema.sql").replaceAll("\r\n", "\n");

  assert.match(migration, /add column if not exists beginners_welcome boolean not null default false/);
  assert.match(migration, /add column if not exists first_visit_free boolean not null default false/);
  assert.match(migration, /profile_beginners_welcome boolean default null/);
  assert.match(
    migration,
    /beginners_welcome = coalesce\(\s+profile_beginners_welcome,\s+public\.club_profiles\.beginners_welcome\s+\)/,
  );
  assert.match(migration, /drop function if exists public\.upsert_club_profile\(\s+uuid, text, text, text, text, text, text, text, text, text, text\s+\);/);
  assert.match(migration, /revoke all on function public\.upsert_club_profile\([^)]*boolean, boolean\s*\) from public, anon;/);
  assert.ok(
    schema.includes(migration.replaceAll("\r\n", "\n").trim()),
    "schema.sql must include the migration block",
  );
});

test("the club profile form sends both flags to the save function", () => {
  const actions = read("src/app/(admin)/clubs/[clubId]/edit/actions.ts");
  const profile = read("src/lib/clubs/club-profile.ts");

  assert.match(actions, /profile_beginners_welcome: values\.beginnersWelcome/);
  assert.match(actions, /profile_first_visit_free: values\.firstVisitFree/);
  assert.match(profile, /beginnersWelcome: formData\.get\("beginners_welcome"\) === "on"/);
  assert.match(profile, /firstVisitFree: formData\.get\("first_visit_free"\) === "on"/);
});

test("English and Mongolian first-visit and share text is complete", () => {
  for (const path of [
    "src/lib/i18n/dictionaries/en.ts",
    "src/lib/i18n/dictionaries/mn.ts",
  ]) {
    const dictionary = read(path);

    for (const key of [
      "beginnersWelcome:",
      "firstVisitFree:",
      "firstVisitTitle:",
      "firstVisitDescription:",
      "share: {",
      "copied:",
    ]) {
      assert.ok(dictionary.includes(key), `${path} is missing ${key}`);
    }
  }
});
