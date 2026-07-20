import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationName =
  "202607180005_add_event_supervision_schedule_updates.sql";
const read = (path) => readFileSync(join(root, path), "utf8");

test("Phase 4B2A is one append-only migration after platform event access", () => {
  const migrations = readdirSync(join(root, "supabase/migrations")).sort();
  const previousIndex = migrations.indexOf(
    "202607180004_add_global_platform_admin_event_access.sql",
  );
  assert.equal(migrations[previousIndex + 1], migrationName);
});

test("migration adds only a bounded nullable cancellation notice", () => {
  const migration = read(`supabase/migrations/${migrationName}`);
  assert.match(migration, /add column if not exists cancellation_notice text/);
  assert.match(migration, /length\(cancellation_notice\) between 1 and 1000/);
  assert.match(migration, /btrim\(cancellation_notice\)/);
  assert.match(migration, /notify pgrst, 'reload schema'/);
  assert.match(migration, /enforce_event_staff_cancellation_notice/);
  assert.match(migration, /current_user_can_manage_school\(new\.school_id\)/);
  assert.doesNotMatch(
    migration,
    /supervision_information|schedule_change_notice|cancellation_notice text not null|create index|create table/,
  );
});

test("shared parser trims, normalizes blanks, and bounds the notice", () => {
  const parser = read("src/lib/events/event-cancellation-notice.ts");
  assert.match(parser, /String\(value \?\? ""\)\.trim\(\)/);
  assert.match(parser, /return normalized \|\| null/);
  assert.match(parser, /EVENT_CANCELLATION_NOTICE_MAX_LENGTH = 1000/);
  assert.match(parser, /cancellation_notice_too_long/);
});

test("server update preserves authorization, school scope, and structured errors", () => {
  const actions = read("src/app/(admin)/events/actions.ts");
  const start = actions.indexOf(
    "export async function updateEventCancellationNotice",
  );
  const end = actions.indexOf("export async function updateEventSharing", start);
  const update = actions.slice(start, end);
  assert.match(update, /requireEventStaffActor\(\)/);
  assert.match(update, /getManageableEvent\(actor, eventId\)/);
  assert.match(update, /\.eq\("school_id", event\.school_id\)/);
  assert.match(update, /classifyEventServiceError/);
  assert.match(update, /platform\.event\.cancellation_notice_updated/);
  const errorClassifier = read("src/lib/events/event-errors.ts");
  assert.match(errorClassifier, /"42703"/);
  assert.match(errorClassifier, /"PGRST204"/);
  assert.match(errorClassifier, /schema_update_required/);
  const createStart = actions.indexOf("export async function createEvent");
  const createEnd = actions.indexOf("export async function joinEvent", createStart);
  const create = actions.slice(createStart, createEnd);
  assert.match(create, /!isStaff[\s\S]*staffSupervisionScheduleOnly/);
});

test("existing cancellation remains authoritative and isolated", () => {
  const actions = read("src/app/(admin)/events/actions.ts");
  const start = actions.indexOf("export async function cancelEvent(");
  const end = actions.indexOf("export async function updateEventSafety", start);
  const cancellation = actions.slice(start, end);
  assert.match(cancellation, /status: "canceled"/);
  assert.match(cancellation, /\.eq\("status", "approved"\)/);
  assert.doesNotMatch(
    cancellation,
    /event_attendees|attendance_checkins|cancellation_notice/,
  );
});

test("compact surfaces show indicators while quick view and detail show full text", () => {
  const cards = read("src/app/(admin)/events/event-browser.tsx");
  const dashboard = read("src/app/(admin)/dashboard/student-upcoming-events.tsx");
  const quickView = read("src/components/events/event-quick-view-modal.tsx");
  const detail = read("src/app/(admin)/events/[eventId]/page.tsx");
  assert.match(cards, /item\.cancellationNotice/);
  assert.match(cards, /labels\.scheduleUpdate/);
  assert.match(dashboard, /event\.cancellationNotice/);
  assert.match(quickView, /event\.cancellationNotice/);
  assert.match(detail, /event\.cancellation_notice/);
  assert.doesNotMatch(detail, /event\.supervision_information/);
  assert.doesNotMatch(quickView, /staff.*email|phone/i);
});

test("central selects and relationships remain stable", () => {
  const selects = read("src/lib/events/event-selects.ts");
  assert.match(selects, /"cancellation_notice"/);
  assert.doesNotMatch(selects, /"supervision_information"|"schedule_change_notice"/);
  assert.match(selects, /profiles!events_created_by_profile_id_fkey/);
  assert.match(selects, /profiles!events_responsible_staff_school_fk/);
  assert.doesNotMatch(selects, /profiles\(id/);
});

test("English and Mongolian dictionaries contain every new concept", () => {
  for (const path of [
    "src/lib/i18n/dictionaries/en.ts",
    "src/lib/i18n/dictionaries/mn.ts",
  ]) {
    const dictionary = read(path);
    assert.match(dictionary, /supervisionSchedule:\s*{/);
    for (const key of [
      "importantScheduleUpdate",
      "scheduleChangeNotice",
      "scheduleNoticeGuidance",
      "scheduleUpdate",
      "supervisionGuidance",
      "supervisionInformation",
      "supervisionNotSpecified",
    ]) {
      assert.match(dictionary, new RegExp(`${key}:`));
    }
    assert.match(dictionary, /supervisionTooLong:/);
    assert.match(dictionary, /scheduleNoticeTooLong:/);
  }
});

test("calendar descriptions include notices without replacing structured values", () => {
  const calendar = read("src/lib/events/event-calendar.ts");
  assert.match(calendar, /event\.cancellationNotice\?\.trim\(\)/);
  assert.match(calendar, /DTSTART:/);
  assert.match(calendar, /DTEND:/);
  assert.match(calendar, /LOCATION:/);
});

test("Phase 4B2A readiness scripts are read-only and classify partial state", () => {
  const preflight = read("supabase/production-readiness/phase4b2a-preflight.sql");
  const postflight = read("supabase/production-readiness/phase4b2a-postflight.sql");

  for (const sql of [preflight, postflight]) {
    const executable = sql
      .replace(/--.*$/gm, "")
      .replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(
      executable,
      /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do)\b/i,
    );
    assert.doesNotMatch(sql, /supabase_migrations\.schema_migrations/);
  }

  assert.match(preflight, /when column_count = 0 then 'PASS'/);
  assert.match(preflight, /when column_count = 1 then 'ALREADY PRESENT'/);
  assert.match(preflight, /else 'FAIL'/);
  assert.match(postflight, /Phase 4B2A postflight decision/);
});
