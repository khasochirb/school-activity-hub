import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const actions = readFileSync(join(process.cwd(), "src/app/(admin)/actions.ts"), "utf8");
// Code only: the comment above the call also describes the default.
const code = actions.replace(/^\s*\/\/.*$/gm, "");

test("logging out ends the session on this device only", () => {
  assert.match(code, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  // No sign-out without a scope: the library default is every device.
  assert.doesNotMatch(code, /signOut\(\s*\)/);
  assert.equal(code.match(/signOut\(/g).length, 1);
});
