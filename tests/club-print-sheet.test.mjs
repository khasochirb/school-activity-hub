import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("the print sheet needs a signed-in, active profile and reads under RLS", () => {
  const page = read("src/app/print/clubs/page.tsx");

  assert.match(page, /if \(!user\) \{\s+redirect\("\/login"\);/);
  assert.match(page, /profile\.status !== "active"/);
  assert.doesNotMatch(page, /createAdminClient|supabase\/admin/);
  assert.match(page, /\.eq\("school_id", profile\.school_id\)/);
  assert.match(page, /\.eq\("status", "active"\)/);
});

test("the QR code points at the clubs page on this site", () => {
  const page = read("src/app/print/clubs/page.tsx");

  assert.match(page, /const clubsUrl = `\$\{baseUrl\}\/clubs`;/);
  assert.match(page, /QRCode\.toString\(clubsUrl,/);
});

test("the sheet prints dark ink on white in every theme", () => {
  const sheet = read("src/app/print/clubs/club-print-sheet.tsx");
  const css = read("src/app/globals.css");

  assert.doesNotMatch(sheet, /\b(bg-white|text-slate-\d+|border-slate-\d+)\b/);
  assert.match(sheet, /bg-\[#ffffff\]/);
  assert.match(sheet, /print:hidden/);
  assert.match(css, /@media print \{[\s\S]*html,\s+body \{\s+background: #ffffff !important;/);
});

test("only staff see the print link on the clubs page", () => {
  const clubs = read("src/app/(admin)/clubs/page.tsx");

  assert.match(clubs, /isStaff \? \(\s+<>\s+<Link[\s\S]*?href="\/print\/clubs"/);
});

test("print text exists in English and Mongolian", () => {
  for (const path of [
    "src/lib/i18n/dictionaries/en.ts",
    "src/lib/i18n/dictionaries/mn.ts",
  ]) {
    const dictionary = read(path);

    for (const key of ["    print: {", "scanHint:", "qrLabel:", "printButton:", "footer:"]) {
      assert.ok(dictionary.includes(key), `${path} is missing ${key}`);
    }
  }
});
