import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function loadActivitySummaryHelper() {
  const source = readFileSync(
    join(process.cwd(), "src/lib/dashboard/activity-summary.ts"),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  const evaluate = new Function("exports", "module", output);

  evaluate(runtimeModule.exports, runtimeModule);
  return runtimeModule.exports;
}

const { buildDashboardActivitySummary } = loadActivitySummaryHelper();

test("groups only approved upcoming events into the next six weeks", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const summary = buildDashboardActivitySummary(
    [
      {
        category: "Sports",
        starts_at: "2026-07-23T12:00:00.000Z",
        status: "approved",
      },
      {
        category: "Sports",
        starts_at: "2026-08-01T12:00:00.000Z",
        status: "approved",
      },
      {
        category: "Arts",
        starts_at: "2026-08-20T12:00:00.000Z",
        status: "approved",
      },
      {
        category: "Sports",
        starts_at: "2026-07-24T12:00:00.000Z",
        status: "canceled",
      },
      {
        category: "Academic",
        starts_at: "2026-07-20T12:00:00.000Z",
        status: "approved",
      },
    ],
    now,
  );

  assert.equal(summary.total, 3);
  assert.deepEqual(
    summary.weeks.map((week) => week.count),
    [1, 1, 0, 0, 1, 0],
  );
  assert.deepEqual(summary.categories, [
    { category: "Sports", count: 2 },
    { category: "Arts", count: 1 },
  ]);
});

test("handles invalid dates, missing categories, and zero data safely", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const summary = buildDashboardActivitySummary(
    [
      { category: null, starts_at: "invalid", status: "approved" },
      {
        category: null,
        starts_at: "2026-07-23T12:00:00.000Z",
        status: "approved",
      },
    ],
    now,
  );

  assert.equal(summary.total, 1);
  assert.deepEqual(summary.categories, []);
  assert.equal(summary.weeks.length, 6);
});
