import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function loadCompletenessHelper() {
  const source = read("src/lib/events/event-listing-completeness.ts");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const evaluate = new Function("exports", "module", output);

  evaluate(module.exports, module);
  return module.exports;
}

const { getEventListingCompleteness } = loadCompletenessHelper();

function completeEvent(overrides = {}) {
  return {
    accessibilityNotes: "Seating available",
    category: "Academic",
    costAmount: null,
    costCurrency: null,
    costNotes: null,
    costType: "free",
    description: "A useful event description for students.",
    eligibilityNotes: "All students",
    endsAt: "2026-07-21T11:00:00.000Z",
    experienceLevel: "beginner_friendly",
    expectedCommitment: "One-time",
    location: "Library",
    requiredMaterials: "Nothing required",
    responsibleAdultRequired: true,
    responsibleStaffId: "staff-profile-id",
    startsAt: "2026-07-21T10:00:00.000Z",
    ...overrides,
  };
}

test("complete staff and platform-admin events are ready to publish", () => {
  const staffResult = getEventListingCompleteness(completeEvent());
  const platformAdminResult = getEventListingCompleteness(completeEvent());

  for (const result of [staffResult, platformAdminResult]) {
    assert.equal(result.applicableCount, 11);
    assert.equal(result.completedCount, 11);
    assert.equal(result.percentage, 100);
    assert.equal(result.status, "ready");
    assert.deepEqual(result.missingItems, []);
  }
});

test("legacy null fields remain advisory and do not crash", () => {
  const result = getEventListingCompleteness(
    completeEvent({
      accessibilityNotes: null,
      category: null,
      costType: null,
      description: null,
      eligibilityNotes: null,
      endsAt: null,
      experienceLevel: null,
      expectedCommitment: null,
      location: null,
      requiredMaterials: null,
      responsibleStaffId: null,
      startsAt: null,
    }),
  );

  assert.equal(result.completedCount, 0);
  assert.equal(result.percentage, 0);
  assert.equal(result.status, "needs_details");
  assert.equal(result.missingItems.length, 11);
});

test("student proposals omit the staff-only responsible-adult criterion", () => {
  const result = getEventListingCompleteness(
    completeEvent({
      accessibilityNotes: null,
      expectedCommitment: null,
      requiredMaterials: null,
      responsibleAdultRequired: false,
      responsibleStaffId: null,
    }),
  );

  assert.equal(result.applicableCount, 10);
  assert.equal(result.completedCount, 7);
  assert.equal(result.percentage, 70);
  assert.equal(result.status, "needs_details");
  assert.doesNotMatch(result.missingItems.join(","), /responsible_adult/);
});

test("the eighty-percent threshold is inclusive", () => {
  const result = getEventListingCompleteness(
    completeEvent({
      expectedCommitment: null,
      requiredMaterials: null,
      responsibleAdultRequired: false,
      responsibleStaffId: null,
    }),
  );

  assert.equal(result.completedCount, 8);
  assert.equal(result.applicableCount, 10);
  assert.equal(result.percentage, 80);
  assert.equal(result.status, "ready");
});

test("completeness is advisory on the intended staff surfaces only", () => {
  const helper = read("src/lib/events/event-listing-completeness.ts");
  const form = read("src/app/(admin)/events/create-event-form.tsx");
  const approvals = read("src/app/(admin)/approvals/page.tsx");
  const detail = read("src/app/(admin)/events/[eventId]/page.tsx");
  const actions = read("src/app/(admin)/events/actions.ts");

  assert.doesNotMatch(helper, /cancellation_notice|cancellationNotice/);
  assert.match(form, /EventCompletenessChecklist/);
  assert.match(form, /EVENT_COMPLETENESS_STEP_BY_ITEM/);
  assert.match(form, /submitProposalAnyway/);
  assert.match(form, /publishAnyway/);
  assert.match(approvals, /EventCompletenessBadge/);
  assert.match(detail, /canManageEvent[\s\S]{0,220}EventCompletenessChecklist/);
  assert.doesNotMatch(actions, /ListingCompleteness|listing completeness|completeness/);
});

test("English and Mongolian completeness labels are present", () => {
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  for (const dictionary of [english, mongolian]) {
    assert.match(dictionary, /completeness:\s*{/);
    assert.match(dictionary, /listingCompleteness:/);
    assert.match(dictionary, /readyToPublish:/);
    assert.match(dictionary, /needsMoreDetails:/);
    assert.match(dictionary, /detailsCompleted:/);
    assert.match(dictionary, /missingInformation:/);
    assert.match(dictionary, /publishAnyway:/);
    assert.match(dictionary, /goBackAndComplete:/);
    assert.match(dictionary, /submitProposalAnyway:/);
  }
});
