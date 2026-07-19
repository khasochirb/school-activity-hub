import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationName = "202607180001_add_event_decision_information.sql";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 4A is one append-only migration after Phase 3A", () => {
  const migrations = readdirSync(join(root, "supabase/migrations")).sort();
  const phase3aIndex = migrations.indexOf(
    "202607170001_add_safeguarding_privacy_foundations.sql",
  );

  assert.equal(migrations[phase3aIndex + 1], migrationName);
  assert.match(read(`supabase/migrations/${migrationName}`), /alter table public\.events/);
});

test("responsible adult is school-aware and limited to active staff", () => {
  const migration = read(`supabase/migrations/${migrationName}`);
  const actions = read("src/app/(admin)/events/actions.ts");

  assert.match(
    migration,
    /foreign key \(responsible_staff_id, school_id\)[\s\S]*references public\.profiles\(id, school_id\)/,
  );
  assert.match(migration, /p\.school_id = new\.school_id/);
  assert.match(migration, /p\.status = 'active'/);
  assert.match(migration, /p\.role in \('school_admin', 'teacher'\)/);
  assert.match(migration, /actor_role = 'student'/);
  assert.match(
    migration,
    /actor_role = 'teacher'[\s\S]{0,420}new\.responsible_staff_id is distinct from actor_id/,
  );
  assert.match(actions, /\.eq\("school_id", profile\.school_id\)/);
  assert.match(actions, /\.eq\("status", "active"\)/);
  assert.match(actions, /\.in\("role", \["school_admin", "teacher"\]\)/);
  assert.match(
    actions,
    /actor\.profile\?\.role === "teacher"[\s\S]{0,220}requestedResponsibleStaffId !== actor\.profile\.id/,
  );
});

test("eligibility uses bounded text because roster grades are not normalized", () => {
  const schema = read("supabase/schema.sql");
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.match(schema, /grade_level text/);
  assert.match(migration, /add column if not exists eligibility_notes text/);
  assert.match(migration, /length\(eligibility_notes\) <= 500/);
  assert.doesNotMatch(migration, /minimum_grade|maximum_grade|min_grade|max_grade/);
});

test("experience level is nullable with two explicit values", () => {
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.match(
    migration,
    /create type public\.event_experience_level as enum \([\s\S]*'beginner_friendly',[\s\S]*'prior_experience_recommended'/,
  );
  assert.match(
    migration,
    /add column if not exists experience_level public\.event_experience_level;/,
  );
  assert.doesNotMatch(
    migration,
    /experience_level public\.event_experience_level not null|experience_level[\s\S]{0,80}default/,
  );
});

test("accessibility information is event-only and privacy guarded", () => {
  const migration = read(`supabase/migrations/${migrationName}`);
  const actions = read("src/app/(admin)/events/actions.ts");
  const english = read("src/lib/i18n/dictionaries/en.ts");

  assert.match(migration, /alter table public\.events[\s\S]*accessibility_notes text/);
  assert.doesNotMatch(actions, /from\("profiles"\)\.update|from\("student_rosters"\)\.update/);
  assert.match(
    english,
    /Students are not required to disclose a disability publicly\./,
  );
});

test("event mutations keep independent authorization and registration logic", () => {
  const actions = read("src/app/(admin)/events/actions.ts");
  const updateStart = actions.indexOf("export async function updateEventDecisionInfo");
  const updateEnd = actions.indexOf("export async function updateEventSharing", updateStart);
  const updateAction = actions.slice(updateStart, updateEnd);
  const joinStart = actions.indexOf("export async function joinEvent");
  const joinEnd = actions.indexOf("export async function cancelEventRegistration", joinStart);
  const joinAction = actions.slice(joinStart, joinEnd);

  assert.match(updateAction, /requireEventStaffActor\(\)/);
  assert.match(updateAction, /actor\.profile\?\.school_id !== event\.school_id/);
  assert.doesNotMatch(
    joinAction,
    /responsible_staff_id|eligibility_notes|experience_level|accessibility_notes/,
  );
});

test("event interfaces show decision information without staff email", () => {
  const pages = [
    read("src/app/(admin)/events/page.tsx"),
    read("src/app/(admin)/events/[eventId]/page.tsx"),
    read("src/app/(admin)/dashboard/page.tsx"),
    read("src/components/events/event-quick-view-modal.tsx"),
  ];

  for (const source of pages) {
    assert.match(source, /responsible|Responsible|decisionInfo/);
  }

  for (const source of pages.slice(0, 3)) {
    assert.doesNotMatch(source, /select\([^)]*email/);
  }
});

test("English and Mongolian Phase 4A dictionaries are complete", () => {
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  for (const dictionary of [english, mongolian]) {
    assert.match(dictionary, /decisionInfo:\s*{/);
    assert.match(dictionary, /responsibleAdult:/);
    assert.match(dictionary, /eligibilityNotSpecified:/);
    assert.match(dictionary, /experienceNotSpecified:/);
    assert.match(dictionary, /accessibilityNotProvided:/);
    assert.match(dictionary, /accessibilityGuidance:/);
    assert.match(dictionary, /beginnerFriendly:/);
    assert.match(dictionary, /priorExperienceRecommended:/);
  }
});
