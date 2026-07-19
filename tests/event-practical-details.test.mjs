import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const phase4aMigration = "202607180001_add_event_decision_information.sql";
const migrationName = "202607180002_add_event_practical_details.sql";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 4B1 is one append-only migration immediately after Phase 4A", () => {
  const migrations = readdirSync(join(root, "supabase/migrations")).sort();
  const phase4aIndex = migrations.indexOf(phase4aMigration);

  assert.equal(migrations[phase4aIndex + 1], migrationName);
  assert.equal(
    migrations[phase4aIndex + 2],
    "202607180003_simplify_safety_reporting.sql",
  );
});

test("cost uses nullable explicit type and exact decimal MNT storage", () => {
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.match(migration, /event_cost_type as enum[\s\S]*'free'[\s\S]*'paid'[\s\S]*'variable'/);
  assert.match(migration, /cost_amount numeric\(12, 2\)/);
  assert.match(migration, /cost_currency = 'MNT'/);
  assert.match(migration, /cost_amount > 0/);
  assert.doesNotMatch(migration, /\bmoney\b|double precision|\breal\b/);
  assert.doesNotMatch(migration, /cost_type public\.event_cost_type not null|cost_type[\s\S]{0,80}default/);
});

test("shared server parser normalizes and validates all practical details", () => {
  const parser = read("src/lib/events/event-practical-details.ts");

  assert.match(parser, /String\(value \?\? ""\)\.trim\(\)/);
  assert.match(parser, /invalid_cost_amount/);
  assert.match(parser, /invalid_cost_currency/);
  assert.match(parser, /variable_cost_notes_required/);
  assert.match(parser, /EVENT_REQUIRED_MATERIALS_MAX_LENGTH = 1000/);
  assert.match(parser, /EVENT_EXPECTED_COMMITMENT_MAX_LENGTH = 500/);
});

test("event actions preserve server authorization and registration behavior", () => {
  const actions = read("src/app/(admin)/events/actions.ts");
  const updateStart = actions.indexOf("export async function updateEventPracticalDetails");
  const updateEnd = actions.indexOf("export async function updateEventSharing", updateStart);
  const updateAction = actions.slice(updateStart, updateEnd);
  const joinStart = actions.indexOf("export async function joinEvent");
  const joinEnd = actions.indexOf("export async function cancelEventRegistration", joinStart);
  const joinAction = actions.slice(joinStart, joinEnd);

  assert.match(updateAction, /isSchoolStaff\(profile\)/);
  assert.match(updateAction, /\.eq\("school_id", profile\.school_id\)/);
  assert.match(actions, /parseEventPracticalDetails\(formData\)/);
  assert.doesNotMatch(joinAction, /cost_type|required_materials|expected_commitment/);
});

test("cards stay concise while quick view and detail show practical information", () => {
  const cards = read("src/app/(admin)/events/event-browser.tsx");
  const quickView = read("src/components/events/event-quick-view-modal.tsx");
  const detail = read("src/app/(admin)/events/[eventId]/page.tsx");

  assert.match(cards, /item\.costLabel/);
  assert.doesNotMatch(cards, /requiredMaterialsLabel|expectedCommitmentLabel/);
  assert.match(quickView, /requiredMaterialsLabel/);
  assert.match(quickView, /expectedCommitmentLabel/);
  assert.match(detail, /events\.formGroups\.practicalDetails/);
});

test("English and Mongolian practical-details dictionaries are complete", () => {
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  for (const dictionary of [english, mongolian]) {
    assert.match(dictionary, /practicalDetails:\s*{/);
    assert.match(dictionary, /costNotSpecified:/);
    assert.match(dictionary, /variableCost:/);
    assert.match(dictionary, /requiredMaterials:/);
    assert.match(dictionary, /expectedCommitment:/);
    assert.match(dictionary, /privacyGuidance:/);
  }
});

test("Phase 4B1 introduces no student affordability or equipment ownership fields", () => {
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.doesNotMatch(
    migration,
    /alter table public\.(profiles|student_rosters|event_attendees)/,
  );
  assert.doesNotMatch(
    migration,
    /affordability|financial_status|owned_materials|equipment_ownership/,
  );
});
