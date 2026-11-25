import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const actions = read("src/app/(admin)/students/actions.ts");
const action = actions.slice(
  actions.indexOf("export async function reactivateStudent"),
  actions.indexOf("async function getCurrentStaffProfile"),
);
const page = read("src/app/(admin)/students/page.tsx");

test("only a school admin can make a student active again", () => {
  assert.match(
    action,
    /if \(!profile \|\| profile\.role !== "school_admin"\) \{\s+redirect\("\/dashboard"\)/,
  );
  assert.match(page, /canReactivate=\{profile\.role === "school_admin"\}/);
});

test("only an inactive student of the admin's own school changes", () => {
  assert.match(action, /\.update\(\{ status: "active" \}\)/);
  assert.match(action, /\.eq\("id", studentId\)/);
  assert.match(action, /\.eq\("school_id", profile\.school_id\)/);
  // Graduated and withdrawn students stay as they are.
  assert.match(action, /\.eq\("status", "inactive"\)/);
  assert.match(page, /const reactivate = student\.status === "inactive" && canReactivate;/);
});

test("it goes through the signed-in client, so the database rules apply", () => {
  assert.match(action, /await createClient\(\)/);
  assert.doesNotMatch(action, /createAdminClient/);
});

test("an active student keeps the inactive button and others get none", () => {
  assert.match(page, /if \(student\.status !== "active" && !reactivate\) \{\s+return null;/);
  assert.match(page, /action=\{reactivate \? reactivateStudent : markStudentInactive\}/);
  for (const lang of ["en", "mn"]) {
    assert.match(read(`src/lib/i18n/dictionaries/${lang}.ts`), /markInactive: "[^"]+",\s+reactivate: "[^"]+"/);
  }
});
