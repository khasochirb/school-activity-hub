import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function loadAnnouncementHelper() {
  const source = read("src/lib/announcements/announcement-create.ts");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const evaluate = new Function("exports", "module", output);

  evaluate(loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

const {
  canCreateAnnouncementForSchool,
  normalizeAnnouncementValues,
  validateAnnouncementValues,
} = loadAnnouncementHelper();

const ownSchool = "00000000-0000-4000-8000-000000000001";
const otherSchool = "00000000-0000-4000-8000-000000000002";

test("only active same-school staff can create announcements", () => {
  for (const role of ["school_admin", "teacher"]) {
    assert.equal(
      canCreateAnnouncementForSchool(
        { role, school_id: ownSchool, status: "active" },
        ownSchool,
      ),
      true,
    );
    assert.equal(
      canCreateAnnouncementForSchool(
        { role, school_id: ownSchool, status: "active" },
        otherSchool,
      ),
      false,
    );
  }

  assert.equal(
    canCreateAnnouncementForSchool(
      { role: "student", school_id: ownSchool, status: "active" },
      ownSchool,
    ),
    false,
  );
  assert.equal(
    canCreateAnnouncementForSchool(
      { role: "teacher", school_id: ownSchool, status: "inactive" },
      ownSchool,
    ),
    false,
  );
});

test("platform access alone does not grant announcement creation", () => {
  assert.equal(
    canCreateAnnouncementForSchool(
      { role: "student", school_id: ownSchool, status: "active" },
      ownSchool,
    ),
    false,
  );
});

test("announcement validation accepts both stored statuses", () => {
  for (const status of ["active", "archived"]) {
    assert.deepEqual(
      validateAnnouncementValues({ body: "Body", status, title: "Title" }),
      {},
    );
  }
});

test("announcement validation identifies invalid fields", () => {
  assert.deepEqual(
    validateAnnouncementValues({ body: "", status: "draft", title: "" }),
    {
      body: "bodyRequired",
      status: "invalidStatus",
      title: "titleRequired",
    },
  );
});

test("announcement values are normalized without losing valid content", () => {
  assert.deepEqual(
    normalizeAnnouncementValues({
      body: "  Body text  ",
      status: " archived ",
      title: "  School update  ",
    }),
    { body: "Body text", status: "archived", title: "School update" },
  );
});

test("announcement RLS grants and insert checks stay school-scoped", () => {
  const schema = read("supabase/schema.sql");
  const migration = read(
    "supabase/migrations/202608130002_harden_announcement_creation_rls.sql",
  );

  for (const source of [schema, migration]) {
    const insertPolicy = source.match(
      /create policy "School staff can create announcements"[\s\S]*?\n\s*\);/,
    )?.[0];

    assert.ok(insertPolicy);
    assert.match(
      source,
      /alter table public\.announcements enable row level security;/,
    );
    assert.match(
      source,
      /grant select, insert, update on table public\.announcements to authenticated;/,
    );
    assert.match(insertPolicy, /public\.current_user_can_manage_school\(school_id\)/);
    assert.match(insertPolicy, /created_by_profile_id = auth\.uid\(\)/);
    assert.match(insertPolicy, /status in \('active', 'archived'\)/);
    assert.doesNotMatch(insertPolicy, /current_user_is_platform_admin/);
  }
});

test("announcement database suite covers the authorization boundary", () => {
  const rlsTest = read("supabase/tests/announcement-creation-rls.sql");

  for (const expectedCase of [
    "active teacher creates an announcement for their own school",
    "active school admin creates an announcement for their own school",
    "student cannot create an announcement",
    "inactive teacher cannot create an announcement",
    "teacher cannot create an announcement for another school",
    "created_by_profile_id must match the authenticated profile",
    "unauthenticated announcement creation is rejected",
    "student SELECT behavior remains active-only and same-school",
    "staff SELECT behavior remains same-school with archived visibility",
  ]) {
    assert.match(rlsTest, new RegExp(expectedCase));
  }
});

test("failed creation keeps fields controlled and hides database details", () => {
  const form = read(
    "src/app/(admin)/announcements/create-announcement-form.tsx",
  );
  const action = read("src/app/(admin)/announcements/actions.ts");

  assert.match(form, /value={title}/);
  assert.match(form, /value={body}/);
  assert.match(form, /value={status}/);
  assert.match(form, /disabled={pending}/);
  assert.match(action, /code: error\.code/);
  assert.doesNotMatch(action, /error\.message/);
  assert.doesNotMatch(action, /console\.error[^;]*(title|body)/s);
});
