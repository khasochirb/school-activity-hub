import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  FOUNDERS_REQUIRED,
  canSubmitProposal,
  founderDisplayName,
} from "../src/app/(admin)/club-requests/proposal-rules.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/202611230001_add_club_proposal_founders_and_notifications.sql");

test("a proposal needs five confirmed founders and nobody still deciding", () => {
  assert.equal(FOUNDERS_REQUIRED, 5);
  assert.equal(canSubmitProposal(["confirmed", "confirmed", "confirmed", "confirmed", "confirmed"]), true);
  assert.equal(canSubmitProposal(["confirmed", "confirmed", "confirmed", "confirmed", "invited"]), false);
  assert.equal(canSubmitProposal(["confirmed", "confirmed", "confirmed", "confirmed", "declined"]), false);
  assert.equal(
    canSubmitProposal(["confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "declined"]),
    true,
  );
});

test("founders are shown as given name and family initial", () => {
  assert.equal(founderDisplayName({ first_name: "Болд", last_name: "Батболд" }), "Болд Б.");
  assert.equal(founderDisplayName({ first_name: "Leon Adiya", last_name: "rammin", preferred_name: "" }), "Leon Adiya R.");
});

test("student search exposes only name and class of visible, signed-up schoolmates", () => {
  const fn = migration.slice(migration.indexOf("function public.search_school_students"));

  assert.match(fn, /security definer/);
  assert.match(fn, /sr\.show_name_to_classmates/);
  assert.match(fn, /sr\.profile_id is not null/);
  assert.match(fn, /sr\.profile_id <> me\.id/);
  assert.match(fn, /length\(q\.term\) >= 2/);
  assert.match(fn, /limit 8/);
  assert.doesNotMatch(fn, /student_number|email/);
  assert.match(migration, /revoke all on function public\.search_school_students\(text\) from public, anon;/);
});

test("users can only read their own notifications and change only read_at", () => {
  assert.match(migration, /revoke all on public\.notifications from anon, authenticated;/);
  assert.match(migration, /grant update \(read_at\) on public\.notifications to authenticated;/);
  assert.match(migration, /using \(recipient_profile_id = auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /grant (insert|delete)[^;]*notifications/);
  assert.match(migration, /notifications_link_internal/);
});

test("founder rows are written only by the server", () => {
  assert.match(migration, /revoke all on public\.club_request_founders from anon, authenticated;/);
  assert.match(migration, /grant select on public\.club_request_founders to authenticated;/);
  assert.doesNotMatch(migration, /grant (insert|update|delete)[^;]*club_request_founders/);
});

test("students can no longer create a request that skips the founders", () => {
  const actions = read("src/app/(admin)/club-requests/actions.ts");

  assert.doesNotMatch(actions, /export async function createClubRequest/);
  assert.match(read("src/app/(admin)/club-requests/proposal-actions.ts"), /status: "gathering"/);
});

test("only school admins decide, and founders start the club", () => {
  const actions = read("src/app/(admin)/club-requests/actions.ts");
  const approve = actions.slice(actions.indexOf("export async function approveClubRequest"));

  assert.match(approve, /profile\.role !== "school_admin"/);
  assert.match(approve, /advisor_profile_id: advisor\?\.id \?\? null/);
  assert.match(actions, /role: founder\.is_proposer \? "leader" : "member"/);
  assert.match(actions, /kind: "proposal_approved"/);
});

test("gathering proposals stay out of the public list", () => {
  assert.match(read("src/app/(admin)/club-requests/page.tsx"), /\.neq\("status", "gathering"\)/);
});

test("notification links stay on the site", async () => {
  const notify = read("src/lib/notifications/notify.ts");

  assert.match(notify, /\^\\\/\(\?!\\\/\)/);
});
