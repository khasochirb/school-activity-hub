import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const foundationMigration =
  "202607170001_add_safeguarding_privacy_foundations.sql";
const simplificationMigration =
  "202607180003_simplify_safety_reporting.sql";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 3 simplification is one append-only correction after Phase 4B1", () => {
  const migrations = readdirSync(join(root, "supabase/migrations"));

  assert.ok(migrations.includes(foundationMigration));
  assert.ok(migrations.includes("202607180001_add_event_decision_information.sql"));
  assert.ok(migrations.includes("202607180002_add_event_practical_details.sql"));
  assert.ok(migrations.includes(simplificationMigration));
  assert.equal(
    migrations.filter((name) => name.includes("simplify_safety_reporting")).length,
    1,
  );
});

test("corrective migration refuses destructive rights-workflow removal when data exists", () => {
  const sql = read(`supabase/migrations/${simplificationMigration}`);

  assert.match(sql, /select count\(\*\)[\s\S]*from public\.data_rights_requests/);
  assert.match(sql, /if request_count <> 0 then[\s\S]*raise exception/);
  assert.match(sql, /if rights_audit_count <> 0 then[\s\S]*raise exception/);
  assert.match(sql, /drop table public\.data_rights_requests;/);
  assert.doesNotMatch(sql, /drop table[^;]+cascade/i);
});

test("retained safety access is same-school, actively designated, and not platform-wide", () => {
  const schema = read("supabase/schema.sql");
  const helperStart = schema.indexOf(
    "create or replace function public.current_user_is_designated_safeguarding_staff",
  );
  const helperEnd = schema.indexOf("$$;", helperStart) + 3;
  const helper = schema.slice(helperStart, helperEnd);

  assert.match(helper, /p\.id = auth\.uid\(\)/);
  assert.match(helper, /p\.school_id = target_school_id/);
  assert.match(helper, /p\.status = 'active'/);
  assert.match(helper, /p\.role in \('school_admin', 'teacher'\)/);
  assert.match(helper, /ssd\.status = 'active'/);
  assert.doesNotMatch(helper, /platform_admin/);
  assert.match(schema, /Designated safeguarding staff can read same-school reports/);
});

test("response team cap is eligibility-aware and serialized in the database", () => {
  const schema = read("supabase/schema.sql");
  const migration = read(`supabase/migrations/${simplificationMigration}`);
  const action = read("src/app/(admin)/safety/actions.ts");

  for (const sql of [schema, migration]) {
    assert.match(sql, /pg_advisory_xact_lock/);
    assert.match(sql, /active_responder_count >= 3/);
    assert.match(sql, /p\.status = 'active'/);
    assert.match(sql, /p\.role in \('school_admin', 'teacher'\)/);
    assert.match(sql, /SAFETY_RESPONSE_TEAM_LIMIT_REACHED/);
  }

  assert.match(action, /safetyResponseTeamMaximum = 3/);
  assert.match(action, /\.eq\("status", "active"\)/);
  assert.match(action, /\.in\("role", \["school_admin", "teacher"\]\)/);
  assert.match(action, /\(count \?\? 0\) >= safetyResponseTeamMaximum/);
});

test("safe receipt and audit functions never return or record narratives", () => {
  const schema = read("supabase/schema.sql");
  const receiptStart = schema.indexOf(
    "create or replace function public.get_my_safety_report_receipts",
  );
  const receiptEnd = schema.indexOf(
    "create or replace function public.prepare_safeguarding_designation",
    receiptStart,
  );
  const receipt = schema.slice(receiptStart, receiptEnd);
  const auditStart = schema.indexOf(
    "create or replace function public.log_restricted_workflow_event",
  );
  const auditEnd = schema.indexOf("drop trigger if exists", auditStart);
  const audit = schema.slice(auditStart, auditEnd);

  assert.match(receipt, /where sr\.reporter_profile_id = auth\.uid\(\)/);
  assert.doesNotMatch(receipt, /sr\.description|reporter_profile_id\s*,/);
  assert.match(audit, /previous_status/);
  assert.match(audit, /new_status/);
  assert.doesNotMatch(audit, /description|details|password|invite_code|exported_data/);
});

test("only two safety RPCs are client-executable", () => {
  const migration = read(`supabase/migrations/${simplificationMigration}`);

  assert.match(
    migration,
    /grant execute on function public\.current_user_is_designated_safeguarding_staff\(uuid\)\s+to authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.get_my_safety_report_receipts\(\)\s+to authenticated/,
  );
  for (const name of [
    "prepare_safeguarding_designation",
    "prepare_safety_report_submission",
    "protect_safety_report_workflow",
    "log_restricted_workflow_event",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `revoke all on function public\\.${name}\\(\\)\\s+from public, anon, authenticated`,
      ),
    );
    assert.doesNotMatch(
      migration,
      new RegExp(`grant execute on function public\\.${name}`),
    );
  }
});

test("visible workflow is three-state while legacy database states remain compatible", () => {
  const actions = read("src/app/(admin)/safety/actions.ts");
  const inbox = read("src/app/(admin)/safety/reports/page.tsx");
  const schema = read("supabase/schema.sql");

  assert.match(actions, /const reportStatuses = new Set\(\[\s*"in_review",\s*"closed"/);
  assert.match(inbox, /beingReviewed/);
  assert.doesNotMatch(inbox, /externalReferralAt/);
  assert.match(schema, /'acknowledged'/);
  assert.match(schema, /'external_referral'/);
});

test("retained pages and actions use server-side sensitive workflow guards", () => {
  const guardedFiles = new Map([
    ["src/app/(admin)/safety/page.tsx", "getCurrentSafeguardingAccess"],
    ["src/app/(admin)/safety/report/page.tsx", "requireActiveSchoolProfile"],
    ["src/app/(admin)/safety/my-reports/page.tsx", "requireActiveSchoolProfile"],
    ["src/app/(admin)/safety/reports/page.tsx", "requireSafeguardingStaff"],
    [
      "src/app/(admin)/safety/designations/page.tsx",
      "requireSchoolAdminForSensitiveWorkflow",
    ],
    ["src/app/(admin)/privacy/page.tsx", "requireActiveSchoolProfile"],
  ]);

  for (const [path, guard] of guardedFiles) {
    assert.match(read(path), new RegExp(`${guard}\\(\\)`), path);
  }

  const actions = read("src/app/(admin)/safety/actions.ts");
  assert.match(actions, /requireActiveSchoolProfile\(\)/);
  assert.match(actions, /requireSafeguardingStaff\(\)/);
  assert.match(actions, /requireSchoolAdminForSensitiveWorkflow\(\)/);
  assert.doesNotMatch(actions, /createAdminClient|createPlatformAuditLog/);
});

test("digital data-rights routes and application references are removed", () => {
  const removedPaths = [
    "src/app/(admin)/privacy/requests/page.tsx",
    "src/app/(admin)/privacy/requests/actions.ts",
    "src/app/(admin)/privacy/requests/manage/page.tsx",
  ];

  for (const path of removedPaths) {
    assert.equal(existsSync(join(root, path)), false, path);
  }

  const source = [
    read("src/app/(admin)/privacy/page.tsx"),
    read("src/lib/i18n/dictionaries/en.ts"),
    read("src/lib/i18n/dictionaries/mn.ts"),
  ].join("\n");
  assert.doesNotMatch(source, /privacy\/requests|data-rights request/i);
});

test("safety notice and manual privacy handling are bilingual", () => {
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  assert.match(english, /notEmergency: "This is not an emergency service\."/);
  assert.match(english, /Only the designated school safety response team can review the report/);
  assert.match(english, /Privacy requests are handled manually through the participating school/);
  assert.match(mongolian, /Энэ нь яаралтай тусламжийн үйлчилгээ биш/);
  assert.match(mongolian, /аюулгүй байдлын хариу арга хэмжээний баг/);
  assert.match(mongolian, /Нууцлалын хүсэлтийг оролцогч сургууль гараар шийдвэрлэнэ/);
});

test("safety and privacy navigation keeps protected prefetch disabled", () => {
  const shell = read("src/app/(admin)/_components/app-shell.tsx");

  assert.match(shell, /href: "\/safety"[\s\S]{0,80}intentPrefetch: false/);
  assert.match(shell, /href: "\/privacy"[\s\S]{0,80}intentPrefetch: false/);
});
