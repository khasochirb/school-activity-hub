import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { overviewChecks, summarizeSchools } from "../src/lib/platform/overview.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const folder = "src/app/(admin)/super-admin/schools/[schoolId]";
const actions = read(`${folder}/actions.ts`);
const slice = (from, to) => actions.slice(actions.indexOf(from), actions.indexOf(to));
const create = slice("export async function createPlatformClub", "// Archive or restore a club");
const status = slice("export async function updatePlatformClubStatus", "function revalidateClubPages");

test("both actions check the platform admin before anything else", () => {
  for (const action of [create, status]) {
    const guard = action.indexOf("await requirePlatformAdmin()");

    assert.ok(guard > 0);
    assert.ok(guard < action.indexOf("formData.get"));
    assert.ok(guard < action.indexOf("createAdminClient()"));
    assert.match(action, /isUuid\(schoolId\)/);
  }
});

test("a new club follows the school staff's rules and belongs to no person", () => {
  assert.match(create, /if \(!name\)/);
  assert.match(create, /if \(categoryInput && !category\)/);
  assert.match(create, /if \(slug\.length < 3\)/);
  assert.match(create, /created_by_profile_id: null/);
  assert.match(create, /status: "active",\s+\}\)/);
  // Only for a school that exists and is active.
  assert.match(create, /\.from\("schools"\)[\s\S]+?\.eq\("status", "active"\)[\s\S]+?if \(!school\)/);
});

test("archiving touches only that school's club, and only from the other state", () => {
  assert.match(status, /\.update\(\{ status \}\)/);
  assert.match(status, /\.eq\("id", clubId\)\s+\.eq\("school_id", schoolId\)\s+\.eq\("status", status === "active" \? "archived" : "active"\)/);
  assert.match(status, /if \(error \|\| !club\)/);
  // Nothing is deleted, and members stay.
  assert.doesNotMatch(actions, /\.delete\(\)/);
  assert.doesNotMatch(status, /club_memberships/);
});

test("every change is in the audit log, with a label, and only when it happened", () => {
  for (const [action, text] of [[create, '"platform.club.created"'], [status, '"platform.club.archived"'], [status, '"platform.club.restored"']]) {
    assert.ok(action.includes(text), text);
    assert.ok(action.indexOf("createPlatformAuditLog(") > action.search(/if \(error \|\| !club\)/));
  }
  const labels = read("src/app/(console)/super-admin/audit-labels.ts");
  for (const name of ["created", "archived", "restored"]) assert.ok(labels.includes(`"platform.club.${name}"`));
  // One list of labels for both pages.
  const log = read("src/app/(admin)/super-admin/audit-log/page.tsx");
  assert.match(log, /auditActionLabelKey\(action\)/);
  assert.doesNotMatch(log, /actionLabelKeyByAction/);
});

test("archiving asks first; the page shows no members", () => {
  const page = read(`${folder}/page.tsx`) + read(`${folder}/club-controls.tsx`);

  assert.match(page, /club\.status === "active" \? \(\s+<ConfirmSubmitButton/);
  assert.doesNotMatch(page, /club_memberships/);
});

test("a real school with no active club is a warning; a demo school is not", () => {
  const school = (id, demo) => ({ id, is_demo: demo, name: id, slug: id });
  const rows = (clubs) => ({
    attendees: [], checkins: [], clubRequests: [], clubs, codes: [], events: [], memberships: [], rosters: [],
    schools: [school("real", false), school("demo", true)], signups: [], staff: [{ role: "school_admin", school_id: "real" }],
  });
  const state = (clubs) => overviewChecks(summarizeSchools(rows(clubs), new Date("2026-11-24T04:00:00Z"))).find((c) => c.id === "noClubs");

  assert.deepEqual(state([]), { count: 1, id: "noClubs", schools: ["real"], state: "warn" });
  assert.equal(state([{ school_id: "real" }]).state, "ok");
});
