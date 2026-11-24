import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

// React clears <form action={...}> after every submit, errors included, so one
// mistake wiped a whole club idea or sign-up. These forms keep what was typed.
const FORMS = [
  "src/app/(admin)/club-requests/create-club-request-form.tsx",
  "src/app/(admin)/clubs/[clubId]/apply/apply-form.tsx",
  "src/app/(admin)/clubs/[clubId]/leave/leave-form.tsx",
  "src/app/join/join-form.tsx",
  "src/app/join/parent/parent-join-form.tsx",
];

test("forms keep what was typed when the server answers with an error", () => {
  for (const file of FORMS) {
    const source = read(file);
    assert.doesNotMatch(source, /action=\{formAction\}/, file);
    assert.match(source, /onSubmit=\{submitKeepingInput\(formAction\)\}/, file);
  }
});

test("the club idea form clears only after it was sent", () => {
  const source = read("src/app/(admin)/club-requests/create-club-request-form.tsx");
  assert.match(source, /if \(state\.success\) formRef\.current\?\.reset\(\);/);
});
