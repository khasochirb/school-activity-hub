import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("shared event selects use verified columns and explicit profile relationships", () => {
  const selects = read("src/lib/events/event-selects.ts");
  for (const column of [
    "responsible_staff_id",
    "experience_level",
    "cost_type",
    "required_materials",
    "expected_commitment",
    "supervision_information",
    "schedule_change_notice",
  ]) {
    assert.match(selects, new RegExp(`"${column}"`));
  }
  assert.match(selects, /profiles!events_created_by_profile_id_fkey/);
  assert.match(selects, /profiles!events_responsible_staff_school_fk/);
  assert.doesNotMatch(selects, /profiles\(id/);
});

test("event pages share selection definitions instead of drifting strings", () => {
  const expectations = [
    ["src/app/(admin)/events/page.tsx", "EVENT_QUICK_VIEW_SELECT"],
    ["src/app/(admin)/dashboard/page.tsx", "EVENT_QUICK_VIEW_SELECT"],
    ["src/app/(admin)/approvals/page.tsx", "EVENT_APPROVAL_SELECT"],
    ["src/app/(admin)/events/[eventId]/page.tsx", "EVENT_DETAIL_SELECT"],
    ["src/app/(admin)/events/[eventId]/attendance/page.tsx", "EVENT_ATTENDANCE_SELECT"],
    ["src/app/(admin)/events/[eventId]/calendar.ics/route.ts", "EVENT_CALENDAR_EXPORT_SELECT"],
  ];
  for (const [path, selectName] of expectations) {
    assert.match(read(path), new RegExp(`\\.select\\(${selectName}\\)`));
  }
  assert.match(
    read("src/app/(admin)/events/page.tsx"),
    /clubs!club_memberships_club_school_fk/,
  );
});

test("event creation separates insert success from readback, audit, and refresh", () => {
  const actions = read("src/app/(admin)/events/actions.ts");
  const auditHelper = read("src/lib/audit/platform-audit.ts");
  const createStart = actions.indexOf("export async function createEvent");
  const createEnd = actions.indexOf("export async function joinEvent", createStart);
  const createBlock = actions.slice(createStart, createEnd);

  assert.match(createBlock, /submission_id/);
  assert.match(createBlock, /id: eventId/);
  assert.match(createBlock, /events\.action\.create\.insert/);
  assert.match(createBlock, /events\.action\.create\.readback/);
  assert.match(createBlock, /EVENT_CREATE_RESULT_SELECT/);
  const insertStart = createBlock.indexOf('const { error: insertError }');
  const insertEnd = createBlock.indexOf("if (insertError)", insertStart);
  const insertStage = createBlock.slice(insertStart, insertEnd);
  assert.doesNotMatch(insertStage, /\.select\(/);
  assert.match(createBlock, /eventId,[\s\S]*success: true/);
  assert.match(createBlock, /createPlatformEventAudit[\s\S]*revalidatePath/);
  assert.match(auditHelper, /try \{[\s\S]*platform_audit_logs[\s\S]*catch \(error\)/);
  assert.doesNotMatch(auditHelper, /throw error/);
});

test("PostgREST schema-cache errors are classified accurately", () => {
  const errors = read("src/lib/events/event-errors.ts");
  for (const code of ["42703", "PGRST200", "PGRST201", "PGRST204"]) {
    assert.match(errors, new RegExp(`"${code}"`));
  }
  assert.match(errors, /schema_update_required/);
});

test("event failures expose only safe references and keep empty states exclusive", () => {
  const page = read("src/app/(admin)/events/page.tsx");
  const actions = read("src/app/(admin)/events/actions.ts");
  assert.match(page, /createServerErrorReference\("EVT-LIST"\)/);
  assert.match(page, /eventsError \? \([\s\S]*loadUnavailableWithReference[\s\S]*\) : selectedView/);
  assert.match(actions, /referenceId/);
  assert.match(actions, /stage: "insert"/);
  assert.doesNotMatch(actions, /description.*console\.error|console\.error.*description/);
});

test("event create buttons remain pending-disabled and retry ID is stable per attempt", () => {
  const form = read("src/app/(admin)/events/create-event-form.tsx");
  assert.match(form, /name="submission_id"/);
  assert.match(form, /disabled=\{pending\}/);
  assert.match(form, /submissionIdRef/);
  assert.match(form, /input\.value = crypto\.randomUUID\(\)/);
  assert.match(form, /\[state\.eventId\]/);
});
