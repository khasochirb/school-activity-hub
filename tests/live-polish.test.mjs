import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("the profile page prints event times in the school's zone", () => {
  assert.match(read("src/app/(admin)/profile/page.tsx"), /\.select\("name, timezone"\)/);
  assert.match(read("src/app/(admin)/profile/page.tsx"), /timeZone=\{school\?\.timezone \?\? undefined\}/);
  assert.match(read("src/app/(admin)/profile/student-profile.tsx"), /formatDateTime\(event\.starts_at, locale, timeZone\)/);
});

test("Mongolian labels carry no English word and no hyphenated case ending on a placeholder", () => {
  const mn = read("src/lib/i18n/dictionaries/mn.ts");
  assert.doesNotMatch(mn, /homeroom"/);
  assert.doesNotMatch(mn, /\{school\}-д удахгүй/);
  assert.match(mn, /subtitleStaff: "\{school\} · /);
});

test("date tiles fit the Mongolian month and club card actions stay on one line", () => {
  const css = read("src/app/globals.css");
  const polish = css.slice(css.indexOf("/* Live polish, 11-Nov"));
  assert.match(polish, /\.cl-dtile \{\s*width: 62px;/);
  assert.match(polish, /\.cl-dtile span \{[^}]*white-space: nowrap;/);
  assert.match(polish, /\.cl-club-foot \.cl-tag,\s*\.cl-club-foot \.btn \{\s*white-space: nowrap;/);
});

test("top bar tabs leave room for the full app name", () => {
  const css = read("src/app/globals.css");
  assert.match(css.slice(css.lastIndexOf(".top-tab {")), /padding-inline: 10px;/);
});
