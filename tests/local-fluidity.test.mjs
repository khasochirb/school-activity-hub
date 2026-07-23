import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("shared disclosures keep content mounted and inaccessible while closed", () => {
  const disclosure = read("src/components/animated-disclosure.tsx");
  const forms = read(
    "src/app/(admin)/_components/collapsible-form-section.tsx",
  );

  assert.match(disclosure, /className="disclosure-motion"/);
  assert.match(disclosure, /inert={!isOpen}/);
  assert.match(disclosure, /aria-expanded={isOpen}/);
  assert.match(forms, /inert={!isOpen}/);
  assert.match(forms, /returnFocusRef\.current = detail\.trigger/);
  assert.match(forms, /writeStoredOpenState\(id, nextOpen\)/);
  assert.doesNotMatch(forms, /isOpen \? \(\s*<div className="collapsible-form-content/);
});

test("quick view and confirmation overlays animate out without delaying actions", () => {
  const quickView = read(
    "src/components/events/event-quick-view-modal.tsx",
  );
  const confirmation = read("src/components/confirm-submit-button.tsx");

  assert.match(quickView, /overlay-backdrop-closing/);
  assert.match(quickView, /overlay-panel-closing/);
  assert.match(quickView, /MOTION_NORMAL_MS/);
  assert.match(confirmation, /FOCUSABLE_SELECTOR/);
  assert.match(confirmation, /event\.key === "Escape"/);
  assert.match(confirmation, /closeDialog\(false\);[\s\S]{0,220}form\?\.requestSubmit\(\)/);
  assert.match(confirmation, /submitStartedRef\.current/);
});

test("local panels and feedback reuse bounded motion with reduced-motion overrides", () => {
  const css = read("src/app/globals.css");
  const calendar = read("src/app/(admin)/events/event-calendar.tsx");
  const eventForm = read("src/app/(admin)/events/create-event-form.tsx");
  const reducedMotion = css.slice(
    css.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
  );

  assert.match(css, /\.disclosure-motion[\s\S]{0,320}grid-template-rows/);
  assert.match(css, /\.overlay-panel[\s\S]{0,180}var\(--motion-normal\)/);
  assert.match(css, /\.toast-card[\s\S]{0,120}feedback-enter/);
  assert.match(calendar, /key={`desktop-\$\{selectedDateKey\}`}/);
  assert.match(calendar, /className="local-panel-enter/);
  assert.match(eventForm, /className="local-step-panel"/);
  assert.match(eventForm, /data-active={active \? "true" : "false"}/);
  assert.match(reducedMotion, /\.local-panel-enter/);
  assert.match(reducedMotion, /\.overlay-backdrop/);
  assert.match(reducedMotion, /\.disclosure-motion/);
  assert.doesNotMatch(css, /transition-all|transition:\s*all/);
});

test("drawers and mobile navigation retain Phase 2 behavior while sharing motion", () => {
  const drawer = read(
    "src/app/(admin)/_components/mobile-menu-drawer.tsx",
  );
  const navigation = read(
    "src/app/(admin)/_components/mobile-app-nav.tsx",
  );

  assert.match(drawer, /motionDuration\(MOTION_LARGE_MS\)/);
  assert.match(drawer, /closeDrawer\(false\)/);
  assert.match(navigation, /className="disclosure-motion"/);
  assert.match(navigation, /inert={!open}/);
});

test("homepage flow and dashboard sequence stay lightweight and accessible", () => {
  const css = read("src/app/globals.css");
  const flow = read("src/components/homepage-activity-flow.tsx");
  const homepage = read("src/app/page.tsx");
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const routeTransition = read(
    "src/app/(admin)/_components/route-content-transition.tsx",
  );
  const reducedMotion = css.slice(
    css.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
  );

  assert.match(homepage, /HomepageActivityFlow/);
  assert.match(flow, /sessionStorage\.setItem/);
  assert.match(flow, /aria-hidden="true" className="activity-flow-viewport/);
  assert.match(flow, /<ul className="sr-only">/);
  assert.match(css, /\.activity-flow-track[\s\S]{0,220}transform/);
  assert.match(css, /animation-play-state: paused/);
  assert.match(reducedMotion, /\.activity-flow-track/);
  assert.match(reducedMotion, /\.activity-flow-group \+ \.activity-flow-group/);
  assert.match(dashboard, /dashboard-sequence page-stack/);
  assert.match(routeTransition, /pathname === "\/dashboard"/);
});
