import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { foldForSearch, matchesStudent } from "../src/lib/students/name-search.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const huslen = { first_name: "Хүслэн", homeroom: "10ё", last_name: "Амарбат", student_number: null };

test("staff find a student by typing, in Cyrillic or Latin, or by class", () => {
  assert.equal(foldForSearch("Хүслэн"), foldForSearch("huslen"));
  for (const query of ["хүсл", "Huslen", "khuslen", "амарбат", "amarbat", "хүслэн 10ё", "10ё"]) {
    assert.equal(matchesStudent(query, huslen), true, query);
  }
  for (const query of ["болд", "хүслэн 11а", "x", ""]) {
    assert.equal(matchesStudent(query, huslen), false, query);
  }
});

test("the single-code form searches instead of listing every student", () => {
  const form = read("src/app/(admin)/invite-codes/generate-invite-form.tsx");
  assert.doesNotMatch(form, /<select/);
  assert.match(form, /matchesStudent\(query, student\)/);
  assert.match(form, /disabled=\{!hasStudents \|\| !chosen\}/);
});

test("only school admins reset a sign-in; the old login is retired, the student keeps their data", () => {
  const reset = read("src/app/(admin)/students/reset-actions.ts");
  assert.match(reset, /if \(actor\.role !== "school_admin"\) return fail/);
  assert.match(reset, /\.eq\("school_id", actor\.school_id\)/);
  assert.match(reset, /ban_duration: "876000h"/);
  assert.match(reset, /update\(\{ profile_id: null, status: "active" \}\)/);
  assert.match(reset, /update\(\{ status: "revoked" \}\)/);
  // Nothing tied to the student (clubs, attendance, portfolio) is deleted.
  assert.doesNotMatch(reset, /\.delete\(\)|deleteUser/);
  assert.match(read("src/app/(admin)/students/[studentId]/reset/page.tsx"), /if \(actor\.role !== "school_admin"\) redirect\("\/students"\);/);
});

test("an inactive student can be made active again", () => {
  assert.match(read("src/app/(admin)/students/actions.ts"), /export async function markStudentActive[\s\S]*?update\(\{ status: "active" \}\)/);
});
