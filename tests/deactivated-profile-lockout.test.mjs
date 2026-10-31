import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

// Deactivation only changes profiles.status; the login session stays valid.
// These helpers pair a profile lookup with the service-role client, so each
// lookup must ignore inactive profiles or a deactivated user keeps access.
const currentProfileLookups = [
  {
    path: "src/app/(admin)/staff/actions.ts",
    reason: "a deactivated school admin could create teacher accounts",
  },
  {
    path: "src/app/(admin)/staff/page.tsx",
    reason: "a deactivated school admin could list staff emails",
  },
  {
    path: "src/app/(admin)/reports/report-data.ts",
    reason: "deactivated staff could download the student roster CSV",
  },
  {
    path: "src/app/(admin)/clubs/actions.ts",
    reason: "a deactivated student could join or leave clubs",
  },
  {
    path: "src/app/(admin)/events/actions.ts",
    reason: "a deactivated student could register for or cancel events",
  },
];

for (const { path, reason } of currentProfileLookups) {
  test(`current-profile lookup in ${path} ignores inactive profiles`, () => {
    const source = read(path);
    const lookups = [
      ...source.matchAll(
        /\.from\("profiles"\)\s*\.select\("id, school_id, role"\)\s*\.eq\("id", user\.id\)([\s\S]*?)\.maybeSingle</g,
      ),
    ];

    assert.ok(lookups.length > 0, `${path}: current-profile lookup not found`);

    for (const [, filters] of lookups) {
      assert.match(filters, /\.eq\("status", "active"\)/, `${path}: ${reason}`);
    }
  });
}
