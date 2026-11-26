import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("sign-in offers a password toggle and a way in for new students", () => {
  const form = read("src/app/login/login-form.tsx");

  assert.match(form, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(form, /aria-pressed=\{showPassword\}/);
  assert.match(form, /autoComplete="current-password"/);
  assert.match(form, /href="\/join"/);
  assert.doesNotMatch(form, /text-teal-/);
});

test("the sign-in panel previews the app with reviewed labels and is hidden from screen readers", () => {
  const shell = read("src/components/auth-shell.tsx");

  assert.match(shell, /<AuthPanelPreview t=\{t\} tf=\{tf\} \/>/);
  assert.match(shell, /aria-hidden="true" className="auth-panel-preview/);
  assert.match(shell, /studentProfile\.clubsForYou\.reason/);
});

test("the sign-in panel is navy, not the black panel with the sun disc", () => {
  const css = read("src/app/globals.css");
  const panel = css.slice(css.indexOf(":root .auth-panel {"));

  assert.doesNotMatch(panel.slice(0, panel.indexOf("}")), /var\(--sun\)/);
  assert.match(panel, /linear-gradient\(160deg, #0b1120/);
});

test("sign-in pages use the compact pill switchers and a brand-blue action", () => {
  const shell = read("src/components/auth-shell.tsx");
  const css = read("src/app/globals.css");

  assert.match(shell, /<LanguageSwitcher\s+className="w-auto"\s+compact/);
  assert.match(shell, /<ThemeToggle\s+compact/);
  assert.match(shell, /className="auth-controls /);
  assert.match(css, /\.auth-card \.btn-primary \{[^}]*background: var\(--primary\);/);
});

test("password toggle text exists in English and Mongolian", () => {
  for (const path of [
    "src/lib/i18n/dictionaries/en.ts",
    "src/lib/i18n/dictionaries/mn.ts",
  ]) {
    const dictionary = read(path);

    assert.ok(dictionary.includes("showPassword:"), `${path} is missing showPassword`);
    assert.ok(dictionary.includes("hidePassword:"), `${path} is missing hidePassword`);
  }
});
