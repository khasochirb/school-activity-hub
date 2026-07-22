import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("motion tokens use the shared fast, normal, and large timings", () => {
  const css = read("src/app/globals.css");

  assert.match(css, /--motion-fast:\s*120ms/);
  assert.match(css, /--motion-normal:\s*180ms/);
  assert.match(css, /--motion-large:\s*240ms/);
  assert.match(css, /--motion-ease-out:\s*cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  assert.match(css, /--default-transition-duration:\s*var\(--motion-normal\)/);
  assert.match(css, /--default-transition-timing-function:\s*var\(--motion-ease-out\)/);
  assert.doesNotMatch(css, /transition-all|transition:\s*all/);
});

test("buttons, inputs, navigation, choices, and cards use bounded transitions", () => {
  const css = read("src/app/globals.css");

  for (const selector of [
    ".btn",
    ".interactive-card",
    ".interactive-chip",
    ".motion-choice",
    ".nav-link",
    ".nav-link-motion",
  ]) {
    assert.match(css, new RegExp(selector.replaceAll(".", "\\.")));
  }

  assert.match(css, /input:not\(\[type="checkbox"\]\)[\s\S]{0,500}background-color var\(--motion-normal\)/);
  assert.match(css, /\.btn:not\(:disabled\):active\s*{\s*transform:\s*scale\(0\.98\)/);
  assert.match(css, /\.interactive-card:active\s*{\s*transform:\s*scale\(0\.99\)/);
  assert.match(css, /button\[aria-busy="true"\][\s\S]{0,180}opacity:\s*0\.62/);
});

test("card lift is limited to hover-capable pointers", () => {
  const css = read("src/app/globals.css");
  const hoverMedia = css.match(
    /@media \(hover: hover\) and \(pointer: fine\)\s*{[\s\S]*?\n}/,
  )?.[0];

  assert.ok(hoverMedia);
  assert.match(hoverMedia, /\.interactive-card:hover/);
  assert.match(hoverMedia, /translateY\(-1px\)/);
});

test("reduced motion removes movement while preserving immediate state styles", () => {
  const css = read("src/app/globals.css");
  const reducedMotion = css.slice(
    css.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
  );

  assert.match(reducedMotion, /--motion-fast:\s*0ms/);
  assert.match(reducedMotion, /--motion-normal:\s*0ms/);
  assert.match(reducedMotion, /--motion-large:\s*0ms/);
  assert.match(reducedMotion, /animation:\s*none/);
  assert.match(reducedMotion, /transform:\s*none !important/);
  assert.doesNotMatch(reducedMotion, /\.choice-pill-active\s*{[^}]*background:\s*transparent/);
});

test("shared interactive surfaces opt into the motion primitives", () => {
  const files = [
    "src/app/(admin)/dashboard/page.tsx",
    "src/app/(admin)/events/event-browser.tsx",
    "src/app/(admin)/events/event-calendar.tsx",
    "src/app/(admin)/events/event-week-calendar.tsx",
  ].map(read);
  const mobileNav = read("src/app/(admin)/_components/mobile-app-nav.tsx");
  const language = read("src/components/language-switcher.tsx");
  const theme = read("src/components/theme-toggle.tsx");

  assert.ok(files.every((source) => source.includes("interactive-card")));
  assert.match(mobileNav, /nav-link-motion/);
  assert.match(language, /motion-choice/);
  assert.match(theme, /motion-choice/);
});
