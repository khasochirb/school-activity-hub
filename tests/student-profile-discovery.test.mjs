import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function loadStudentJourneyHelper() {
  const output = ts.transpileModule(read("src/lib/students/student-journey.ts"), {
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

const {
  buildStudentMilestones,
  countDistinctCategories,
  initialsForName,
  matchClubsToInterests,
  parseInterestSelection,
} = loadStudentJourneyHelper();

const clubs = [
  { category: "Sports", id: "c1", name: "Volleyball" },
  { category: "Arts", id: "c2", name: "Film" },
  { category: "Sports", id: "c3", name: "Basketball" },
  { category: null, id: "c4", name: "Chess" },
];

test("clubs for you follow the student's interest order, then club name", () => {
  const { forYou } = matchClubsToInterests(clubs, ["Arts", "Sports"]);

  assert.deepEqual(
    forYou.map(({ club, matchedInterest }) => [club.name, matchedInterest]),
    [
      ["Film", "Arts"],
      ["Basketball", "Sports"],
      ["Volleyball", "Sports"],
    ],
  );
});

test("an interest with no club is returned so the student can propose one", () => {
  const result = matchClubsToInterests(clubs, ["Outdoor", "Arts", "Outdoor"]);

  assert.deepEqual(result.interestsWithoutClubs, ["Outdoor"]);
  assert.equal(result.forYou.length, 1);
});

test("clubs for you are capped and empty interests match nothing", () => {
  assert.equal(matchClubsToInterests(clubs, ["Sports"], 1).forYou.length, 1);
  assert.deepEqual(matchClubsToInterests(clubs, []), {
    forYou: [],
    interestsWithoutClubs: [],
  });
});

test("interest selection keeps only known categories, once each", () => {
  assert.deepEqual(
    parseInterestSelection(
      ["Sports", " Arts ", "Sports", "Hacking", "", null],
      ["Sports", "Arts", "Other"],
    ),
    ["Sports", "Arts"],
  );
});

test("milestones are private progress counts, capped at their target", () => {
  const milestones = buildStudentMilestones({
    categoriesTried: 2,
    clubsJoined: 4,
    ideasProposed: 0,
    sessionsAttended: 7,
  });

  assert.deepEqual(
    milestones.map(({ achieved, key, progress, target }) => [
      key,
      progress,
      target,
      achieved,
    ]),
    [
      ["firstClub", 1, 1, true],
      ["explorer", 2, 3, false],
      ["regular", 5, 5, true],
      ["ideaMaker", 0, 1, false],
    ],
  );
});

test("milestones never rank or compare students", () => {
  const source = read("src/lib/students/student-journey.ts");

  assert.doesNotMatch(source, /streak|leaderboard|rank|percentile|points/i);
});

test("categories tried ignore missing categories", () => {
  assert.equal(countDistinctCategories(["Sports", null, "Sports", "Arts"]), 2);
});

test("initials work for Mongolian and single names", () => {
  assert.equal(initialsForName("Болд Батбаяр"), "ББ");
  assert.equal(initialsForName("  Anu  "), "A");
  assert.equal(initialsForName(""), "?");
});

test("student interests table is limited to the platform categories and protected by RLS", () => {
  const migration = read("supabase/migrations/202610310001_add_student_interests.sql");
  const categories = read("src/lib/activity-categories.ts")
    .match(/ACTIVITY_CATEGORIES = \[([\s\S]*?)\] as const/)[1]
    .match(/"([^"]+)"/g)
    .map((value) => value.slice(1, -1));

  for (const category of categories) {
    assert.match(migration, new RegExp(`'${category}'`), category);
  }

  assert.match(migration, /enable row level security/);
  assert.match(migration, /profile_id = auth\.uid\(\)\s+or public\.current_user_can_manage_school\(school_id\)/);
  assert.match(migration, /public\.current_profile_role\(\) = 'student'/);
  assert.match(migration, /revoke all on table public\.student_interests from public, anon;/);
  assert.match(migration, /grant select, insert, delete on table public\.student_interests to authenticated;/);
  assert.doesNotMatch(migration, /for update/);
});

test("schema.sql carries the student interests table from the migration", () => {
  const schema = read("supabase/schema.sql").replaceAll("\r\n", "\n");
  const migration = read("supabase/migrations/202610310001_add_student_interests.sql").replaceAll("\r\n", "\n");

  assert.ok(schema.includes(migration.trim()), "schema.sql must include the migration block");
});

test("student profile and interest code never uses the service-role client", () => {
  for (const path of [
    "src/app/(admin)/profile/interests/actions.ts",
    "src/app/(admin)/profile/interests/page.tsx",
    "src/app/(admin)/profile/student-profile.tsx",
    "src/lib/students/student-interests.ts",
    "src/lib/students/student-profile-data.ts",
  ]) {
    assert.doesNotMatch(read(path), /createAdminClient|supabase\/admin/, path);
  }
});

test("saving interests requires an active student and a known return path", () => {
  const actions = read("src/app/(admin)/profile/interests/actions.ts");

  assert.match(actions, /\.eq\("status", "active"\)/);
  assert.match(actions, /profile\.role !== "student"/);
  assert.match(actions, /path === "\/clubs" \? "\/clubs" : "\/profile"/);
});

test("English and Mongolian student profile text is complete", () => {
  for (const path of [
    "src/lib/i18n/dictionaries/en.ts",
    "src/lib/i18n/dictionaries/mn.ts",
  ]) {
    const dictionary = read(path);

    for (const key of [
      "studentProfile: {",
      "clubsForYou: {",
      "interestsPage: {",
      "milestones: {",
      "privacyNote:",
      "noClubYet:",
    ]) {
      assert.ok(dictionary.includes(key), `${path} is missing ${key}`);
    }
  }
});
