import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { safeNextPath } from "../src/lib/auth/safe-next-path.ts";
import { canViewEvent } from "../src/lib/events/event-visibility.ts";
import { toSlug } from "../src/lib/slug.ts";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const slugPattern = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

test("Mongolian club and school names get a valid Latin slug", () => {
  assert.equal(toSlug("Шатрын клуб"), "shatryn-klub");
  assert.equal(toSlug("Робот техник"), "robot-tekhnik");
  assert.equal(toSlug("Өсвөр үеийн дуу хоолой"), "usvur-ueiin-duu-khooloi");
  assert.equal(toSlug("Chess Club"), "chess-club");
  for (const name of ["Шатрын клуб", "Ү", "Хөгжим 2026", "Сагсан бөмбөг ".repeat(10)]) {
    const slug = toSlug(name);
    if (slug.length >= 3) assert.match(slug, slugPattern, name);
  }
  for (const path of [
    "src/app/(admin)/clubs/actions.ts",
    "src/app/(admin)/club-requests/actions.ts",
    "src/app/setup/actions.ts",
    "src/app/(admin)/super-admin/schools/new/create-school-form.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /import \{ toSlug \} from "@\/lib\/slug";/, path);
    assert.doesNotMatch(source, /function toSlug\(/, path);
  }
});

test("no uuid check rejects ids without RFC version bits", () => {
  const seededId = "5038cd74-9491-36a2-5e63-46530daba1b4";
  for (const path of [
    "src/app/(admin)/super-admin/connections/actions.ts",
    "src/app/(admin)/school-connections/actions.ts",
    "src/app/(admin)/safety/actions.ts",
    "src/app/(admin)/reports/student-report-actions.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /\[1-5\]\[0-9a-f\]\{3\}/, path);
    const literal = source.match(/\/(\^\[0-9a-f\]\{8\}[^/]+\$)\/i/);
    assert.ok(literal, `${path}: uuid regex not found`);
    assert.ok(new RegExp(literal[1], "i").test(seededId), path);
  }
});

test("schools default to the Ulaanbaatar timezone", () => {
  assert.match(read("src/lib/events/event-calendar-range.ts"), /DEFAULT_EVENT_TIME_ZONE = "Asia\/Ulaanbaatar"/);
  assert.match(read("src/app/setup/actions.ts"), /\|\| "Asia\/Ulaanbaatar"/);
  assert.match(read("src/app/(admin)/super-admin/schools/new/actions.ts"), /timezone: "Asia\/Ulaanbaatar"/);
  assert.match(read("supabase/schema.sql"), /timezone text not null default 'Asia\/Ulaanbaatar'/);
});

test("a signed-out QR scan returns to the check-in after sign-in", () => {
  assert.equal(safeNextPath("/check-in/abc"), "/check-in/abc");
  assert.equal(safeNextPath("//evil.example"), null);
  assert.equal(safeNextPath("https://evil.example"), null);
  assert.equal(safeNextPath("/\\evil.example"), null);
  assert.equal(safeNextPath(undefined), null);
  assert.match(read("src/app/check-in/[eventId]/page.tsx"), /redirect\(`\/login\?next=\$\{encodeURIComponent\(`\/check-in\/\$\{eventId\}`\)\}`\)/);
  assert.match(read("src/app/login/login-form.tsx"), /router\.push\(nextPath \?\? "\/dashboard"\)/);
});

test("students can open completed events of their school", () => {
  const profile = { role: "student", school_id: "s1" };
  const base = { connectedSchoolIds: [], profile, sharedSchoolIds: [] };
  assert.ok(canViewEvent({ ...base, event: { school_id: "s1", status: "completed" } }));
  assert.ok(!canViewEvent({ ...base, event: { school_id: "s1", status: "pending_approval" } }));
});

test("deactivated accounts get no role menu", () => {
  const layout = read("src/app/(admin)/layout.tsx");
  assert.match(layout, /\.eq\("status", "active"\)/);
  assert.match(layout, /getCurrentPlatformAdminProfile\(\)/);
});

test("invite codes are offered and counted only for students without an account", () => {
  assert.match(read("src/app/(admin)/invite-codes/page.tsx"), /filter\(\(student\) => !student\.profile_id\)/);
  assert.match(read("src/app/(admin)/invite-codes/actions.ts"), /\.is\("profile_id", null\)/);
  assert.match(read("src/app/(admin)/dashboard/page.tsx"), /studentsWithoutAccounts - activeInviteCodes/);
});

test("event buttons show only when their action can succeed", () => {
  const page = read("src/app/(admin)/events/[eventId]/page.tsx");
  assert.equal(page.match(/canManageEvent && event\.status === "approved" \?/g)?.length, 2);
  assert.match(page, /new Date\(event\.starts_at\)\.getTime\(\) >= Date\.now\(\)/);
});

test("join shows translated errors, not raw Supabase text", () => {
  const join = read("src/app/join/actions.ts");
  assert.doesNotMatch(join, /Error\?\.message \?\?/);
});

test("password forms keep the form before awaiting", () => {
  for (const path of ["src/app/reset-password/reset-password-form.tsx", "src/app/update-password/update-password-form.tsx"]) {
    const source = read(path);
    assert.match(source, /const form = event\.currentTarget;/, path);
    assert.doesNotMatch(source, /event\.currentTarget\.reset\(\)/, path);
  }
});

test("a rejection reason is shown only to staff and the student who asked", () => {
  const page = read("src/app/(admin)/club-requests/page.tsx");
  assert.match(page, /isStaff \|\| request\.created_by_profile_id === profile\.id/);
  assert.match(page, /href=\{`\/clubs\/\$\{request\.converted_club_id\}`\}/);
});

test("Mongolian common keys reuse the shipped feedback wording", () => {
  const mn = read("src/lib/i18n/dictionaries/mn.ts");
  const common = mn.slice(mn.indexOf("  common: {"), mn.indexOf("  status: {"));
  assert.match(common, /somethingWentWrong: "Алдаа гарлаа",/);
  assert.doesNotMatch(read("src/app/(admin)/dashboard/dashboard-charts.tsx"), /common\.category/);
});
