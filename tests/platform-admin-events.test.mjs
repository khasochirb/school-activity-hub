import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = "supabase/migrations/202607180004_add_global_platform_admin_event_access.sql";
const read = (path) => readFileSync(join(root, path), "utf8");

test("platform event access is an append-only, RLS-scoped migration", () => {
  const sql = read(migration);
  for (const table of ["events", "event_attendees", "attendance_checkins", "event_school_shares"]) {
    assert.match(sql, new RegExp(`on public\\.${table}`));
  }
  assert.match(sql, /current_user_is_platform_admin\(\)/);
  assert.doesNotMatch(sql, /disable row level security|using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i);
});

test("platform event authority is profile-independent and server-derived", () => {
  const helper = read("src/lib/auth/event-access.ts");
  const actions = read("src/app/(admin)/events/actions.ts");
  assert.match(helper, /from\("platform_admins"\)/);
  assert.match(helper, /status", "active"/);
  assert.match(actions, /getCurrentEventActor\(\)/);
  assert.doesNotMatch(actions, /formData\.get\(["']isPlatformAdmin/);
});

test("platform event writes require explicit validated school context", () => {
  const actions = read("src/app/(admin)/events/actions.ts");
  const page = read("src/app/(admin)/events/page.tsx");
  assert.match(actions, /formData\.get\("school_id"\)/);
  assert.match(actions, /validateActivePlatformEventSchool\(targetSchoolId\)/);
  assert.match(actions, /fieldErrors\?: Record<string, string>/);
  assert.match(actions, /school_id: message/);
  assert.match(actions, /responsible_staff_id: i18n\.t/);
  assert.match(page, /get_platform_event_school_options/);
  assert.match(page, /get_platform_event_staff_options/);
});

test("platform event audits contain identifiers and outcome, not narratives", () => {
  const actions = read("src/app/(admin)/events/actions.ts");
  const auditStart = actions.indexOf("async function createPlatformEventAudit");
  const auditEnd = actions.indexOf("function eventDecisionInfoErrorMessage", auditStart);
  const auditBlock = actions.slice(auditStart, auditEnd);
  assert.match(auditBlock, /targetId: eventId/);
  assert.match(auditBlock, /targetSchoolId: schoolId/);
  assert.match(auditBlock, /outcome: "success"/);
  assert.doesNotMatch(auditBlock, /description|accessibility|materials|permission_note/);
});

test("event loading errors cannot fall through to an empty state", () => {
  const page = read("src/app/(admin)/events/page.tsx");
  assert.match(page, /eventsError \? \([\s\S]*loadUnavailable[\s\S]*\) : selectedView/);
});

test("English and Mongolian platform-event labels are complete", () => {
  for (const path of [
    "src/lib/i18n/dictionaries/en.ts",
    "src/lib/i18n/dictionaries/mn.ts",
  ]) {
    const dictionary = read(path);
    const eventsStart = dictionary.indexOf("  events: {");
    const eventsEnd = dictionary.indexOf("\n  safety: {", eventsStart);
    const events = dictionary.slice(eventsStart, eventsEnd);

    assert.match(events, /platform:\s*{/);
    assert.match(events, /selectSchoolRequired:/);
    assert.match(events, /selectedSchool:\s*"[^"]*\{school\}[^"]*"/);
    assert.match(events, /creatingForSchool:\s*"[^"]*\{school\}[^"]*"/);
    assert.match(dictionary, /loadUnavailable:/);
  }
});

test("platform school context is interpolated once inside the create form", () => {
  const page = read("src/app/(admin)/events/page.tsx");
  const form = read("src/app/(admin)/events/create-event-form.tsx");

  assert.match(
    page,
    /tf\("events\.platform\.selectedSchool",\s*{\s*school: selectedPlatformSchool\.name/,
  );
  assert.match(
    page,
    /tf\("events\.platform\.creatingForSchool",\s*{\s*school: selectedPlatformSchool\.name/,
  );
  assert.match(form, /labels\.creatingForSchool/);
  assert.doesNotMatch(form, /labels\.platformMode|labels\.selectedSchool/);
});
