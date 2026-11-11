import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function rule(selector) {
  const start = css.indexOf(`\n${selector} {`);
  assert.ok(start >= 0, `${selector} not found`);
  return css.slice(start, css.indexOf("\n}", start));
}

test("the link spinner animates only while a link is loading", () => {
  assert.doesNotMatch(rule(".pending-link-spinner"), /animation:/);
  assert.match(
    css,
    /\.pending-link-indicator\[data-pending="true"\] \.pending-link-spinner \{\s*animation: pending-link-spin/,
  );
});

test("no live blur on the full-screen background or the sticky top bar", () => {
  assert.doesNotMatch(rule(".app-surface::before"), /\n\s*filter:/);
  assert.doesNotMatch(rule(".app-topbar"), /backdrop-filter/);
});

test("filter chips load their page ahead of the click and answer the click at once", () => {
  const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
  for (const path of ["src/app/(admin)/events/events-filters.tsx", "src/app/(admin)/clubs/page.tsx"]) {
    const source = read(path);
    assert.match(source, /className="cl-chip"[\s\S]{0,420}\s+prefetch\r?\n/, path);
    assert.match(source, /<ChipPending \/>/, path);
  }
  assert.match(css, /\.cl-chip:has\(\.chip-pending\[data-pending="true"\]\) \{/);
});
