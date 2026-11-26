import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("join asks for the password twice and the server checks they match", () => {
  const form = read("src/app/join/join-form.tsx");
  const actions = read("src/app/join/actions.ts");

  assert.match(form, /name="confirm_password"/);
  assert.match(actions, /formData\.get\("confirm_password"\)/);
  assert.match(actions, /password !== confirmPassword/);
  assert.match(actions, /auth\.errors\.passwordMismatch/);
});

test("join explains what the email is for", () => {
  const form = read("src/app/join/join-form.tsx");

  assert.match(form, /labels\.emailHint/);
  assert.match(form, /aria-describedby="join-email-hint"/);
});

test("join labels exist in English and Mongolian", () => {
  for (const path of ["src/lib/i18n/dictionaries/en.ts", "src/lib/i18n/dictionaries/mn.ts"]) {
    const dictionary = read(path);

    assert.match(dictionary, /passwordMismatch:/);
    assert.match(dictionary, /emailHint:/);
  }
});
