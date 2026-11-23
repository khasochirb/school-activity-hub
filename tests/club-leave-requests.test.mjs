import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { LEAVE_REASONS, parseLeaveRequest } from "../src/lib/clubs/leave-form.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("a leave request needs a reason; feedback is optional", () => {
  assert.equal(parseLeaveRequest({ feedback: "", reason: "x", reasonKind: "bored" }).error, "chooseReason");
  assert.equal(parseLeaveRequest({ feedback: "", reason: "   ", reasonKind: "busy" }).error, "explainReason");
  assert.equal(parseLeaveRequest({ feedback: "a".repeat(2001), reason: "x", reasonKind: "busy" }).error, "feedbackTooLong");
  assert.deepEqual(parseLeaveRequest({ feedback: "  ", reason: " Exams ", reasonKind: "busy" }).input, {
    feedback: null,
    reason: "Exams",
    reasonKind: "busy",
  });
  // The database allows exactly the same reasons.
  const migration = read("supabase/migrations/202611230004_add_club_leave_requests.sql");
  for (const reason of LEAVE_REASONS) assert.match(migration, new RegExp(`'${reason}'`));
});

test("leaving never ends a membership without a reviewer's approval", () => {
  const actions = read("src/app/(admin)/clubs/actions.ts");
  const leave = actions.slice(actions.indexOf("export async function leaveClub"), actions.indexOf("export async function assignClubLeader"));
  assert.doesNotMatch(leave, /club_memberships/);
  assert.match(leave, /redirect\(`\/clubs\/\$\{clubId\}\/leave`\)/);

  const leaveActions = read("src/app/(admin)/clubs/leave-actions.ts");
  const decide = leaveActions.slice(leaveActions.indexOf("export async function decideLeaveRequest"));
  assert.match(decide, /request\.profile_id === profile\.id\) return;/);
  assert.match(decide, /if \(!access\?\.canReview\) return;/);
  assert.match(decide, /\.eq\("status", "pending"\)/);
  assert.match(decide, /update\(\{ status: "inactive" \}\)/);
  // The membership update only runs after this reviewer won the decision.
  assert.ok(decide.indexOf("if (!decided) return;") < decide.indexOf('update({ status: "inactive" })'));
});

test("leave reasons reach the club's reviewers, or the school admins when there are none", () => {
  const access = read("src/lib/clubs/club-access.ts");
  assert.match(access, /filter\(\(id\) => id !== leaverProfileId\)/);
  assert.match(access, /\.eq\("role", "school_admin"\)/);
  assert.match(read("src/app/(admin)/clubs/[clubId]/applications/page.tsx"), /tab=leaving/);
});

test("leave requests are read-only for clients", () => {
  const migration = read("supabase/migrations/202611230004_add_club_leave_requests.sql");
  assert.match(migration, /revoke all on public\.club_leave_requests from anon, authenticated;/);
  assert.doesNotMatch(migration, /grant (insert|update|delete)/);
  assert.match(migration, /club_leave_requests_one_pending[\s\S]*where status = 'pending'/);
  assert.match(read("supabase/schema.sql"), /create table if not exists public\.club_leave_requests/);
});
