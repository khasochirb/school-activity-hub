import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const css = read("src/app/globals.css");
const appLayer = css.slice(css.indexOf("/* ---------- Signed-in app: product layer"));

test("inside the app, primary buttons are brand blue and secondary buttons are light", () => {
  assert.ok(appLayer.length > 0, "app product layer missing");
  assert.match(appLayer, /\.app-surface \.btn-primary \{[^}]*background: var\(--primary\);/);
  assert.match(appLayer, /\.app-surface \.btn-secondary \{[^}]*border-color: var\(--border\);/);
  assert.match(appLayer, /\.app-surface \.section-title \{[^}]*font-family: var\(--font-body-stack\);/);
  // Colours and type only: a size here would outrank Tailwind sizing on buttons.
  const btnRule = appLayer.match(/\.app-surface \.btn \{([^}]*)\}/)[1];
  assert.doesNotMatch(btnRule, /min-height|padding|height/);
});

test("create forms open from the header button instead of a second card", () => {
  for (const path of [
    "src/app/(admin)/_components/collapsible-form-section.tsx",
    "src/app/(admin)/_components/page-ui.tsx",
  ]) {
    assert.match(read(path), /collapsedSummary = false,/);
  }
});

test("archive, deactivate and revoke buttons are quiet", () => {
  assert.match(read("src/app/(admin)/clubs/page.tsx"), /btn btn-quiet min-h-9 px-3"\r?\n\s+confirmDescription/);
  assert.match(read("src/app/(admin)/staff/page.tsx"), /btn btn-quiet/);
  assert.match(read("src/app/(admin)/students/page.tsx"), /<PendingSubmitButton\s+className="btn btn-quiet/);
  assert.match(css, /\.btn-quiet \{/);
});

test("events filters are one visible row of chips and one search box", () => {
  const filters = read("src/app/(admin)/events/events-filters.tsx");

  assert.match(filters, /className="cl-filters"/);
  assert.match(filters, /className="cl-search cl-search-wide"/);
  assert.doesNotMatch(filters, /<details/);
});
