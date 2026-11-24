import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { classOptions, findOption, gradeOptions } from "../src/lib/students/class-filters.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");

const ROWS = [
  { grade_level: "10", homeroom: "А" },
  { grade_level: "7", homeroom: "Б" },
  { grade_level: "7", homeroom: "а" },
  { grade_level: "7 ", homeroom: "А " },
  { grade_level: "7", homeroom: null },
  { grade_level: null, homeroom: "А" },
  { grade_level: " ", homeroom: "В" },
];

test("grades are listed once, in number order, without blanks", () => {
  assert.deepEqual(
    gradeOptions(ROWS).map((option) => option.label),
    ["7", "10"],
  );
});

test("a grade or class keeps every spelling stored for it", () => {
  const grade = findOption(gradeOptions(ROWS), "7");
  assert.deepEqual(grade.values, ["7", "7 "]);

  const classes = classOptions(ROWS, grade);
  assert.deepEqual(classes.map((option) => option.label), ["а", "Б"]);
  assert.deepEqual(findOption(classes, "А").values, ["а", "А "]);
});

test("classes come only from the chosen grade, and unknown values are ignored", () => {
  const grade = findOption(gradeOptions(ROWS), "10");
  assert.deepEqual(classOptions(ROWS, grade).map((option) => option.label), ["А"]);
  assert.equal(findOption(gradeOptions(ROWS), "12"), null);
  assert.equal(findOption(gradeOptions(ROWS), ""), null);
});

test("the student list filters by grade and class and keeps them while searching and paging", () => {
  const page = read("src/app/(admin)/students/page.tsx");
  assert.match(page, /studentsQuery\.in\("grade_level", selectedGrade\.values\)/);
  assert.match(page, /studentsQuery\.in\("homeroom", selectedClass\.values\)/);
  assert.match(page, /name="grade" type="hidden" value=\{filters\.grade\}/);
  assert.match(page, /name="class" type="hidden" value=\{filters\.classGroup\}/);
  assert.match(page, /studentsPageHref\(nextPage, filters\)/);
  assert.match(page, /studentsPageHref\(1, \{ \.\.\.filters, status: value \}\)/);
  // Choosing another grade drops the class of the old one.
  assert.match(page, /studentsPageHref\(1, \{ \.\.\.filters, classGroup: "", grade \}\)/);
  assert.match(page, /Boolean\(searchQuery \|\| selectedStatus \|\| selectedGrade\)/);
});

test("the grades are read in full, from the viewer's own school only", () => {
  const page = read("src/app/(admin)/students/page.tsx");
  const reader = page.slice(page.indexOf("async function getRosterClasses"), page.indexOf("// Clubs and event sign-ups"));
  assert.match(reader, /\.eq\("school_id", schoolId\)/);
  assert.match(reader, /\.range\(from, from \+ pageSize - 1\)/);
  assert.match(reader, /< pageSize\) return rows/);
});
