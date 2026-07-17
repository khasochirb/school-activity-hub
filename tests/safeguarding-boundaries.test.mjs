import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationName = "202607170001_add_safeguarding_privacy_foundations.sql";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function migration() {
  return read(`supabase/migrations/${migrationName}`);
}

test("Phase 3A uses exactly one new safeguarding/privacy migration", () => {
  const matchingMigrations = readdirSync(join(root, "supabase/migrations")).filter(
    (name) => /safeguarding|privacy_foundations/.test(name),
  );

  assert.deepEqual(matchingMigrations, [migrationName]);
});

test("safety narratives have no reporter or platform-admin read policy", () => {
  const sql = migration();

  assert.match(
    sql,
    /Designated safeguarding staff can read same-school reports/,
  );
  assert.match(sql, /current_user_is_designated_safeguarding_staff\(school_id\)/);
  assert.match(
    sql,
    /current_profile_role\(\) in \('school_admin', 'teacher'\)/,
  );
  assert.doesNotMatch(sql, /current_user_is_platform_admin/);
  assert.doesNotMatch(sql, /for select[\s\S]{0,250}reporter_profile_id = auth\.uid\(\)[\s\S]{0,80}on public\.safety_reports/);
  assert.doesNotMatch(sql, /on public\.safety_reports[\s\S]{0,120}for delete/);
});

test("reporter receipt RPC cannot return the confidential description", () => {
  const sql = migration();
  const start = sql.indexOf("create or replace function public.get_my_safety_report_receipts");
  const end = sql.indexOf(
    "revoke all on function public.get_my_safety_report_receipts",
    start,
  );
  const receiptFunction = sql.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(receiptFunction, /where sr\.reporter_profile_id = auth\.uid\(\)/);
  assert.doesNotMatch(receiptFunction, /description|reporter_profile_id\s*,/);
});

test("restricted workflow audit stores status metadata, not narratives or exports", () => {
  const sql = migration();
  const start = sql.indexOf("create or replace function public.log_restricted_workflow_event");
  const end = sql.indexOf(
    "revoke all on function public.log_restricted_workflow_event",
    start,
  );
  const auditFunction = sql.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(auditFunction, /previous_status/);
  assert.match(auditFunction, /new_status/);
  assert.doesNotMatch(
    auditFunction,
    /description|details|response_summary|password|invite|exported_data/,
  );
  assert.doesNotMatch(
    read("src/app/(admin)/safety/actions.ts"),
    /createPlatformAuditLog|createAdminClient/,
  );
});

test("restricted pages and mutations use server-side sensitive workflow guards", () => {
  const guardedFiles = new Map([
    ["src/app/(admin)/safety/report/page.tsx", "requireActiveSchoolProfile"],
    ["src/app/(admin)/safety/my-reports/page.tsx", "requireActiveSchoolProfile"],
    ["src/app/(admin)/safety/reports/page.tsx", "requireSafeguardingStaff"],
    [
      "src/app/(admin)/safety/designations/page.tsx",
      "requireSchoolAdminForSensitiveWorkflow",
    ],
    ["src/app/(admin)/privacy/page.tsx", "requireActiveSchoolProfile"],
    ["src/app/(admin)/privacy/requests/page.tsx", "requireActiveSchoolProfile"],
    [
      "src/app/(admin)/privacy/requests/manage/page.tsx",
      "requireSchoolAdminForSensitiveWorkflow",
    ],
  ]);

  for (const [path, guard] of guardedFiles) {
    assert.match(read(path), new RegExp(`${guard}\\(\\)`), path);
  }

  const safetyActions = read("src/app/(admin)/safety/actions.ts");
  const privacyActions = read("src/app/(admin)/privacy/requests/actions.ts");
  assert.match(safetyActions, /requireSafeguardingStaff\(\)/);
  assert.match(safetyActions, /requireSchoolAdminForSensitiveWorkflow\(\)/);
  assert.match(privacyActions, /requireActiveSchoolProfile\(\)/);
  assert.match(privacyActions, /requireSchoolAdminForSensitiveWorkflow\(\)/);
});

test("safety and privacy navigation disables protected prefetch", () => {
  const shell = read("src/app/(admin)/_components/app-shell.tsx");
  const routePages = [
    "src/app/(admin)/safety/page.tsx",
    "src/app/(admin)/safety/report/page.tsx",
    "src/app/(admin)/privacy/page.tsx",
    "src/app/(admin)/privacy/requests/page.tsx",
  ];

  assert.match(shell, /href: "\/safety"[\s\S]{0,80}intentPrefetch: false/);
  assert.match(shell, /href: "\/privacy"[\s\S]{0,80}intentPrefetch: false/);

  for (const path of routePages) {
    assert.match(read(path), /prefetch={false}/, path);
  }
});

test("English and Mongolian safeguarding/privacy foundations are present", () => {
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  for (const dictionary of [english, mongolian]) {
    assert.match(dictionary, /safety:\s*{/);
    assert.match(dictionary, /privacy:\s*{/);
    assert.match(dictionary, /notEmergency:/);
    assert.match(dictionary, /researchWithdrawal:/);
  }

  assert.match(mongolian, /Аюулгүй байдал ба тусламж/);
  assert.match(mongolian, /Нууцлал ба өгөгдлийн эрх/);
});
