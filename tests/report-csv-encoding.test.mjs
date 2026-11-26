import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("CSV exports start with a UTF-8 byte-order mark so Excel shows Cyrillic", () => {
  const source = read("src/app/(admin)/reports/report-data.ts");
  const start = source.indexOf("function createCsv(");

  assert.ok(start >= 0, "createCsv not found");
  assert.match(source.slice(start, start + 200), /return "\\uFEFF" \+/);
});

test("the student import still accepts a file that starts with the mark", () => {
  assert.match(read("src/app/(admin)/students/actions.ts"), /\.replace\(\/\^\\uFEFF\/, ""\)/);
});
