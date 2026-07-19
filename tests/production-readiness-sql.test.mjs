import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const preflight = read("supabase/production-readiness/phase3a-preflight.sql");
const postflight = read("supabase/production-readiness/phase3a-postflight.sql");
const safetySimplificationPreflight = read(
  "supabase/production-readiness/phase3-safety-simplification-preflight.sql",
);
const safetySimplificationPostflight = read(
  "supabase/production-readiness/phase3-safety-simplification-postflight.sql",
);

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function historyQuery(sql) {
  const match = sql.match(/\$history\$([\s\S]*?)\$history\$/);
  assert.ok(match, "expected one fixed migration-history query");
  assert.equal(sql.match(/\$history\$/g)?.length, 2);
  return match[1];
}

function withoutHistoryQuery(sql) {
  return sql.replace(/\$history\$[\s\S]*?\$history\$/g, "'READ_ONLY_HISTORY_QUERY'");
}

function preflightDecision({
  functions,
  historyRecorded = null,
  indexes,
  policies,
  prerequisites = true,
  tables,
}) {
  const state =
    tables === 0 && functions === 0 && policies === 0
      ? "ABSENT"
      : tables === 4 && functions === 8 && policies === 14
        ? "COMPLETE"
        : "PARTIAL";

  if (state === "COMPLETE") return "ALREADY PRESENT";
  if (state === "PARTIAL") return "FAIL";
  if (indexes !== 0 || historyRecorded === true || !prerequisites) return "FAIL";
  return "PASS";
}

function historyStatus({ schemaExists, tableExists, versionRecorded }) {
  if (!tableExists) {
    return {
      postflight: "NOT TRACKED",
      preflight: "MIGRATION HISTORY: NOT AVAILABLE",
      schemaExists,
    };
  }

  return {
    postflight: versionRecorded ? "RECORDED" : "NOT RECORDED",
    preflight: versionRecorded
      ? "MIGRATION HISTORY: VERSION RECORDED"
      : "MIGRATION HISTORY: VERSION NOT RECORDED",
    schemaExists,
  };
}

test("production readiness scripts never statically reference optional migration history", () => {
  for (const sql of [preflight, postflight]) {
    assert.match(sql, /to_regclass\('supabase_migrations\.schema_migrations'\)/);
    assert.doesNotMatch(
      withoutHistoryQuery(sql),
      /from\s+supabase_migrations\.schema_migrations/i,
    );

    const query = historyQuery(sql);
    assert.match(query, /^\s*select\s+exists\s*\(/i);
    assert.match(query, /where\s+version\s*=\s*'202607170001'/i);
    assert.doesNotMatch(
      query,
      /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do)\b/i,
    );
  }
});

test("migration-history availability states are informational", () => {
  assert.deepEqual(
    historyStatus({ schemaExists: false, tableExists: false, versionRecorded: null }),
    {
      postflight: "NOT TRACKED",
      preflight: "MIGRATION HISTORY: NOT AVAILABLE",
      schemaExists: false,
    },
  );
  assert.deepEqual(
    historyStatus({ schemaExists: true, tableExists: false, versionRecorded: null }),
    {
      postflight: "NOT TRACKED",
      preflight: "MIGRATION HISTORY: NOT AVAILABLE",
      schemaExists: true,
    },
  );
  assert.deepEqual(
    historyStatus({ schemaExists: true, tableExists: true, versionRecorded: false }),
    {
      postflight: "NOT RECORDED",
      preflight: "MIGRATION HISTORY: VERSION NOT RECORDED",
      schemaExists: true,
    },
  );
  assert.deepEqual(
    historyStatus({ schemaExists: true, tableExists: true, versionRecorded: true }),
    {
      postflight: "RECORDED",
      preflight: "MIGRATION HISTORY: VERSION RECORDED",
      schemaExists: true,
    },
  );

  assert.match(preflight, /MIGRATION HISTORY: NOT AVAILABLE/);
  assert.match(postflight, /when not table_exists then 'NOT TRACKED'/);
});

test("preflight actual-object state is authoritative", () => {
  assert.equal(
    preflightDecision({ tables: 0, functions: 0, policies: 0, indexes: 0 }),
    "PASS",
  );
  assert.equal(
    preflightDecision({ tables: 1, functions: 0, policies: 0, indexes: 0 }),
    "FAIL",
  );
  assert.equal(
    preflightDecision({ tables: 4, functions: 8, policies: 14, indexes: 7 }),
    "ALREADY PRESENT",
  );
  assert.equal(
    preflightDecision({
      tables: 0,
      functions: 0,
      policies: 0,
      indexes: 0,
      historyRecorded: true,
    }),
    "FAIL",
  );

  assert.match(preflight, /when o\.state = 'COMPLETE' then 'ALREADY PRESENT'/);
  assert.match(preflight, /when o\.state = 'PARTIAL' then 'FAIL'/);
  assert.match(preflight, /else 'PASS'/);
});

test("postflight decision depends on actual object checks, not migration history", () => {
  const decision = postflight.match(
    /postflight_decision as \(([\s\S]*?)\),\s*result_rows/,
  )?.[1];

  assert.ok(decision);
  assert.match(decision, /bool_and\(passed\)/);
  assert.doesNotMatch(decision, /migration_history|version_recorded|table_exists/);
  assert.match(postflight, /four Phase 3A tables exist/);
  assert.match(postflight, /expected constraints exist/);
  assert.match(postflight, /RLS enabled on all new tables/);
  assert.match(postflight, /exact reviewed policy set/);
  assert.match(postflight, /exact authenticated table grants/);
  assert.match(postflight, /function definitions are hardened/);
});

test("safety simplification scripts safely tolerate absent migration history", () => {
  for (const sql of [safetySimplificationPreflight, safetySimplificationPostflight]) {
    assert.match(sql, /to_regclass\('supabase_migrations\.schema_migrations'\)/);
    assert.doesNotMatch(
      withoutHistoryQuery(sql),
      /from\s+supabase_migrations\.schema_migrations/i,
    );
    assert.match(historyQuery(sql), /where\s+version\s*=\s*'202607180003'/i);
  }

  assert.match(safetySimplificationPreflight, /when not table_exists then 'NOT AVAILABLE'/);
  assert.match(safetySimplificationPostflight, /when not table_exists then 'NOT TRACKED'/);
});

test("safety simplification preflight checks zero rows and exact dependencies", () => {
  assert.match(
    safetySimplificationPreflight,
    /select count\(\*\) as request_count from public\.data_rights_requests/,
  );
  assert.match(safetySimplificationPreflight, /data-rights audit branch is empty/);
  assert.match(safetySimplificationPreflight, /expected data-rights triggers exist/);
  assert.match(safetySimplificationPreflight, /expected data-rights policies exist/);
  assert.match(safetySimplificationPreflight, /no unexpected foreign-key dependency exists/);
  assert.match(safetySimplificationPreflight, /Phase 4A and Phase 4B1 event columns exist/);
  assert.match(safetySimplificationPreflight, /then 'ALREADY PRESENT'/);
  assert.match(safetySimplificationPreflight, /when bool_and\(c\.passed\) then 'PASS'/);
});

test("safety simplification postflight is authoritative and safety-only", () => {
  const decision = safetySimplificationPostflight.match(
    /decision as \(([\s\S]*?)\),\s*result_rows/,
  )?.[1];

  assert.ok(decision);
  assert.match(decision, /bool_and\(passed\)/);
  assert.doesNotMatch(decision, /migration_history|version_recorded|table_exists/);
  assert.match(safetySimplificationPostflight, /data-rights database objects are absent/);
  assert.match(safetySimplificationPostflight, /function execution grants are exact/);
  assert.match(safetySimplificationPostflight, /three-responder database guard is installed/);
  assert.match(safetySimplificationPostflight, /platform admin receives no automatic narrative access/);
  assert.match(safetySimplificationPostflight, /audit metadata remains status-only/);
  assert.match(safetySimplificationPostflight, /Phase 4A and Phase 4B1 event columns remain/);
});

test("safety simplification readiness scripts contain only read-only executable statements", () => {
  for (const sql of [safetySimplificationPreflight, safetySimplificationPostflight]) {
    const history = historyQuery(sql);
    assert.match(history, /^\s*select\s+exists\s*\(/i);
    assert.doesNotMatch(
      history,
      /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do)\b/i,
    );

    const executable = withoutHistoryQuery(sql)
      .replace(/--.*$/gm, "")
      .replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(
      executable,
      /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do)\b/i,
    );
  }
});
