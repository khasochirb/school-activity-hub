import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");

test("only staff remove a leader, in their own school, and the student stays a member", () => {
  const actions = read("src/app/(admin)/clubs/actions.ts");
  const remove = actions.slice(
    actions.indexOf("export async function removeClubLeader"),
    actions.indexOf("async function getCurrentProfile"),
  );
  assert.match(remove, /if \(!profile \|\| !isStaff\(profile\)\) \{\n    redirect/);
  assert.match(remove, /\.update\(\{ role: "member" \}\)/);
  assert.match(remove, /\.eq\("id", membershipId\)/);
  assert.match(remove, /\.eq\("school_id", profile\.school_id\)/);
  assert.match(remove, /\.eq\("role", "leader"\)/);
  assert.match(remove, /\.eq\("status", "active"\)/);
  assert.match(remove, /await createClient\(\)/);
  assert.doesNotMatch(remove, /createAdminClient/);
});

test("removing a leader asks first", () => {
  const page = read("src/app/(admin)/clubs/page.tsx");
  const form = page.slice(page.indexOf("<form action={removeClubLeader}>"));
  assert.match(form.slice(0, form.indexOf("</form>")), /<ConfirmSubmitButton/);
});
