import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_LOCALE, normalizeLocale } from "../src/lib/i18n/locales.ts";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("a visitor who has not chosen a language gets Mongolian", () => {
  assert.equal(DEFAULT_LOCALE, "mn");
  assert.equal(normalizeLocale(undefined), "mn");
  assert.equal(normalizeLocale("fr"), "mn");
});

test("a chosen language is kept", () => {
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("mn"), "mn");
});

test("the dictionary returns plain English only for English, not for the default", () => {
  const dictionary = read("src/lib/i18n/dictionary.ts");

  assert.match(dictionary, /if \(locale === "en"\) \{\s+return en;/);
  assert.doesNotMatch(dictionary, /DEFAULT_LOCALE/);
  assert.match(dictionary, /mergeDictionary\(en, dictionaries\[locale\]\)/);
});

test("on a phone the schedule time has its own line", () => {
  assert.match(
    read("src/app/globals.css"),
    /@media \(max-width: 639px\) \{ \.schedule-days time \{ width: 100%; \} \}/,
  );
});
