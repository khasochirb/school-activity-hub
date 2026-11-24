import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { overviewChecks, summarizeSchools } from "../src/lib/platform/overview.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");
const folder = "src/app/(admin)/super-admin/schools/[schoolId]";
const actions = read(`${folder}/actions.ts`);
const slice = (from, to) => actions.slice(actions.indexOf(from), actions.indexOf(to));
const create = slice("export async function createPlatformTeacher", "// Only a teacher of this school");
const status = slice("export async function updatePlatformTeacherStatus", "function revalidateTeacherPages");

test("both actions check the platform admin before anything else", () => {
  for (const action of [create, status]) {
    const guard = action.indexOf("await requirePlatformAdmin()");

    assert.ok(guard > 0);
    assert.ok(guard < action.indexOf("formData.get"));
    assert.ok(guard < action.indexOf("createAdminClient()"));
    assert.match(action, /isUuid\(schoolId\)/);
  }
});

test("a new account is a teacher of an active school, with the staff page's rules", () => {
  assert.match(create, /if \(!fullName\)/);
  assert.match(create, /if \(!email\)/);
  assert.match(create, /password\.length < 8/);
  assert.match(create, /\.from\("schools"\)[\s\S]+?\.eq\("status", "active"\)[\s\S]+?if \(!school\)/);
  assert.match(create, /role: "teacher",\s+school_id: schoolId,\s+status: "active"/);
  assert.doesNotMatch(create, /school_admin/);
  // The school is checked before an account exists, and no account is left without a profile.
  assert.ok(create.indexOf("if (!school)") < create.indexOf("createUser("));
  assert.match(create, /if \(profileError\) \{[\s\S]+?deleteUser\(authData\.user\.id\)/);
});

test("the status change reaches only a teacher of that school, from the other state, never yourself", () => {
  assert.match(
    status,
    /\.eq\("id", profileId\)\s+\.eq\("school_id", schoolId\)\s+\.eq\("role", "teacher"\)\s+\.eq\("status", status === "active" \? "inactive" : "active"\)/,
  );
  assert.match(status, /if \(profileId === platformAdmin\.id\)/);
  assert.match(status, /if \(error \|\| !teacher\)/);
});

test("changes are logged after they happen, without the password or email", () => {
  for (const [action, names] of [[create, ["created"]], [status, ["deactivated", "reactivated"]]]) {
    for (const name of names) assert.ok(action.includes(`"platform.teacher.${name}"`), name);
    const log = action.slice(action.indexOf("createPlatformAuditLog("), action.indexOf("revalidateTeacherPages("));
    assert.ok(log.length > 0);
    assert.doesNotMatch(log, /password|email/);
  }
  assert.ok(create.indexOf("createPlatformAuditLog(") > create.indexOf("if (profileError)"));
  assert.ok(status.indexOf("createPlatformAuditLog(") > status.indexOf("if (error || !teacher)"));
  const labels = read("src/app/(console)/super-admin/audit-labels.ts");
  for (const name of ["created", "deactivated", "reactivated"]) assert.ok(labels.includes(`"platform.teacher.${name}"`));
});

test("deactivating asks first, and the page reads teachers only", () => {
  assert.match(read(`${folder}/teacher-controls.tsx`), /\{active \? \(\s+<ConfirmSubmitButton/);
  assert.match(
    read(`${folder}/page.tsx`),
    /\.select\("id, full_name, status"\)\s+\.eq\("school_id", schoolId\)\s+\.eq\("role", "teacher"\)/,
  );
});

test("a real school with no active teacher is a warning; a demo school is not", () => {
  const school = (id, demo) => ({ id, is_demo: demo, name: id, slug: id });
  const admin = { role: "school_admin", school_id: "real" };
  const state = (staff) =>
    overviewChecks(
      summarizeSchools(
        { attendees: [], checkins: [], clubRequests: [], clubs: [], codes: [], events: [], memberships: [], rosters: [], schools: [school("real", false), school("demo", true)], signups: [], staff },
        new Date("2026-11-24T04:00:00Z"),
      ),
    ).find((c) => c.id === "noTeachers");

  assert.deepEqual(state([admin]), { count: 1, id: "noTeachers", schools: ["real"], state: "warn" });
  assert.equal(state([admin, { role: "teacher", school_id: "real" }]).state, "ok");
});
