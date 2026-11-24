import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("only a platform admin can switch, only themselves, and every switch is logged", () => {
  const sql = read("supabase/migrations/202611240001_platform_admin_school_switcher.sql");
  assert.match(sql, /me uuid := auth\.uid\(\)/);
  assert.match(sql, /from public\.platform_admins pa where pa\.profile_id = me and pa\.status = 'active'/);
  assert.match(sql, /update public\.profiles set school_id = target_school_id where id = me;/);
  assert.match(sql, /insert into public\.platform_audit_logs[\s\S]*'platform_admin\.switch_school'/);
  assert.match(sql, /revoke all on function public\.platform_admin_switch_school\(uuid\) from public, anon;/);
});

test("platform admins lose the database rules that read or change every school's events", () => {
  const sql = read("supabase/migrations/202611240002_platform_admins_one_school_at_a_time.sql");
  for (const policy of [
    "Platform admins can view all events",
    "Platform admins can update all events",
    "Platform admins can create events",
    "Platform admins can view event attendees",
    "Platform admins can view attendance checkins",
    "Platform admins can view event shares",
    "Platform admins can view event clubs",
  ]) {
    assert.ok(sql.includes(`drop policy if exists "${policy}"`), policy);
  }
});

test("school pages treat a platform admin as the admin of one school", () => {
  for (const file of ["src/lib/auth/event-access.ts", "src/lib/auth/club-access.ts"]) {
    assert.match(read(file), /isPlatformAdmin: Boolean\(platformAdminResult\.data\) && !profile/, file);
  }
});

test("notifications only show the school the account is in now", () => {
  assert.match(read("src/app/(admin)/layout.tsx"), /\.eq\("school_id", profileResult\.data\?\.school_id/);
  assert.match(read("src/app/(admin)/notifications/page.tsx"), /\.eq\("school_id", me\?\.school_id/);
});
