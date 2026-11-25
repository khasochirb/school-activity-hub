import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");

const css = read("src/app/globals.css");
const phones = css.slice(css.indexOf("/* ---------- Phones ----------"));

// The body of one rule inside the Phones section.
function rule(selector) {
  const start = phones.indexOf(`${selector} {\n`);

  assert.notEqual(start, -1, `missing rule: ${selector}`);

  return phones.slice(start, phones.indexOf("}", start));
}

test("a name in a list keeps its own line; tags and buttons go under it", () => {
  assert.match(phones, /\n\.cl-row-end \{\n  display: contents;\n\}\n@media \(max-width: 640px\) \{/);
  assert.match(rule("  .cl-row:has(> .cl-row-end)"), /display: grid;[\s\S]*grid-template-columns: auto minmax\(0, 1fr\) auto;/);
  assert.match(rule("  .cl-row > .cl-row-end"), /grid-row: 2;/);
  assert.match(rule("  .cl-row > .cl-grow"), /flex-basis: 9rem;/);
});

test("every list row with a tag and a button wraps them for phones", () => {
  for (const path of [
    "src/app/(admin)/students/page.tsx",
    "src/app/(admin)/staff/page.tsx",
    "src/app/(admin)/announcements/page.tsx",
    "src/app/(admin)/invite-codes/page.tsx",
    "src/app/(admin)/profile/student-profile.tsx",
    "src/app/(admin)/dashboard/page.tsx",
  ]) {
    assert.match(read(path), /<span className="cl-row-end">/, path);
  }
  const students = read("src/app/(admin)/students/page.tsx");
  const row = students.slice(students.indexOf('<span className="cl-row-end">'), students.lastIndexOf("<ActionMenu"));
  assert.match(row, /students\.list\.notJoined[\s\S]*<InactiveForm[\s\S]*<\/span>\s*$/);
});

test("one wide field or label cannot push the page sideways", () => {
  assert.match(
    rule("  :where(.grid, .compact-filter-grid, .family-main, .family-child, .family-block) > *"),
    /min-width: 0;/,
  );
  assert.match(rule("\n  select"), /max-width: 100%;/);
  assert.match(rule("  .overflow-x-auto,\n  .console-nav"), /position: relative;/);
  assert.match(
    read("src/app/(admin)/reports/report-charts.tsx"),
    /<div className="report-visually-hidden">\n\s+<table>/,
  );
});

test("fields use 16px text on phones, so an iPhone does not zoom in", () => {
  assert.match(rule("  select,\n  textarea"), /font-size: 16px !important;/);
  assert.match(phones, /input:not\(\[type="checkbox"\], \[type="radio"\], \[type="file"\]\),\n  select,\n  textarea \{/);
});

test("a closed form above a list takes no space, matching the page gap", () => {
  const gap = css.match(/\n\.cl-page \{[^}]*gap: (\d+)px;/)[1];

  assert.match(
    rule('  .cl-page > .collapsible-section-shell[data-open="false"]'),
    new RegExp(`margin-bottom: -${gap}px;`),
  );
});

test("the search box and the dropdowns use the full width", () => {
  assert.match(rule("  .cl-filters > .cl-search"), /max-width: none;\n    flex-basis: 100%;\n    margin-left: 0;/);
  assert.match(rule("  .cl-filter-selects > .cl-select"), /flex: 1 1 0;/);
});

test("the week strip shows the weekday on phones instead of a clipped 'today'", () => {
  const ui = read("src/app/(admin)/_components/clean-ui.tsx");

  assert.match(ui, /<span className="max-sm:hidden">\{day\.label\}<\/span>\n\s+<span className="sm:hidden">\{day\.weekday\}<\/span>/);
  assert.match(ui, /aria-current=\{day\.isToday \? "date" : undefined\}/);
});

test("a menu that would open off the left edge moves back on screen", () => {
  const menu = read("src/app/(admin)/_components/action-menu.tsx");

  assert.match(menu, /if \(left < margin\) menu\.style\.right = `\$\{left - margin\}px`;/);
  assert.match(menu, /className="cl-menu-pop" id=\{menuId\} ref=\{keepOnScreen\}/);
});

test("the printed club list has one column on a phone screen and two on paper", () => {
  const sheet = read("src/app/print/clubs/club-print-sheet.tsx");

  assert.match(sheet, /grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2/);
  assert.match(sheet, /max-sm:flex-col print:flex-row/);
});
