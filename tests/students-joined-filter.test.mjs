import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { countJoined, joinedByClass, rosterClasses, rosterGrades } from "../src/lib/students/roster-counts.ts";

const page = readFileSync(join(process.cwd(), "src/app/(admin)/students/page.tsx"), "utf8").replaceAll("\r\n", "\n");

const row = (grade_level, homeroom, profile_id, status = "active") => ({ grade_level, homeroom, profile_id, status });
const ROWS = [
  row("10", "10а", "p1"),
  row("10", "10а", null),
  row("10", "10б", null),
  row("9", "9а", "p2"),
  row("9 ", "9а", "p3"),
  row("9", "9а", "p4", "inactive"),
  row("9", "9а", null, "inactive"),
  row("9", null, null),
  row(null, null, "p5"),
];

test("joined counts cover active students only and follow the grade and class", () => {
  assert.deepEqual(countJoined(ROWS, "", ""), { joined: 4, notJoined: 3 });
  assert.deepEqual(countJoined(ROWS, "10", ""), { joined: 1, notJoined: 2 });
  assert.deepEqual(countJoined(ROWS, "10", "10а"), { joined: 1, notJoined: 1 });
  assert.deepEqual(countJoined(ROWS, "9", ""), { joined: 2, notJoined: 1 });
});

test("the lines show joined out of total, by grade and then by class", () => {
  assert.deepEqual(joinedByClass(ROWS, ""), [
    { joined: 1, label: "-", total: 1 },
    { joined: 2, label: "9", total: 3 },
    { joined: 1, label: "10", total: 3 },
  ]);
  assert.deepEqual(joinedByClass(ROWS, "10"), [
    { joined: 1, label: "10а", total: 2 },
    { joined: 0, label: "10б", total: 1 },
  ]);
  assert.deepEqual(joinedByClass(ROWS, "9").find((line) => line.label === "-"), { joined: 0, label: "-", total: 1 });
});

test("grades are in number order and classes belong to the chosen grade", () => {
  assert.deepEqual(rosterGrades(ROWS), ["9", "10"]);
  assert.deepEqual(rosterClasses(ROWS, "10"), ["10а", "10б"]);
  assert.deepEqual(rosterClasses(ROWS, ""), ["9а", "10а", "10б"]);
});

test("joined and not joined list active students with and without an account", () => {
  assert.match(page, /"joined"\) \{\n\s+studentsQuery = studentsQuery\.eq\("status", "active"\)\.not\("profile_id", "is", null\);/);
  assert.match(page, /"not-joined"\) \{\n\s+studentsQuery = studentsQuery\.eq\("status", "active"\)\.is\("profile_id", null\);/);
  assert.match(page, /\["active", "inactive", "joined", "not-joined"\]\.includes\(value\)/);
  assert.match(page, /\["joined", t\("students\.list\.joinedApp"\), joinedCount\.joined\]/);
  assert.match(page, /\["not-joined", t\("students\.list\.notJoined"\), joinedCount\.notJoined\]/);
});

test("a class from another grade is dropped instead of emptying the list", () => {
  assert.match(page, /const classOptions = rosterClasses\(rosterRows, selectedGrade\);\n\s+const selectedClass = pickOption\(classOptions,/);
  assert.match(page, /return options\.includes\(value\) \? value : "";/);
});

test("a filter with no matches does not say the school has no students", () => {
  assert.match(page, /Boolean\(searchQuery \|\| selectedStatus \|\| selectedGrade \|\| selectedClass\)/);
  assert.match(page, /\) : hasFilters \? \(/);
});

test("the counts read every student of the viewer's own school", () => {
  const reader = page.slice(page.indexOf("async function getRosterRows"), page.indexOf("// Clubs and event sign-ups"));
  assert.match(reader, /\.eq\("school_id", schoolId\)/);
  assert.match(reader, /\.range\(from, from \+ pageSize - 1\)/);
  assert.match(reader, /< pageSize\) return rows/);
});
