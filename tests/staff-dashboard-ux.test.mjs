import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);

  assert.ok(start >= 0, `${name} not found`);
  const next = source.indexOf("\nfunction ", start + 1);
  const nextAsync = source.indexOf("\nasync function ", start + 1);
  const ends = [next, nextAsync].filter((index) => index > 0);

  return source.slice(start, ends.length ? Math.min(...ends) : undefined);
}

test("the staff dashboard leads with the numbers, then to-dos beside quick actions", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const staff = functionBody(dashboard, "StaffDashboard");

  assert.doesNotMatch(staff, /WelcomeOverview/);
  assert.doesNotMatch(dashboard, /function WelcomeOverview/);
  assert.ok(staff.indexOf("dashboard.stats.activeClubs") < staff.indexOf("<NeedsAttention"));
  assert.ok(staff.indexOf("<NeedsAttention") < staff.indexOf("<QuickActions"));
  assert.ok(staff.indexOf("<QuickActions") < staff.indexOf("<NextSteps"));
});

test("each action appears once: the header keeps only the primary action", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const header = functionBody(dashboard, "DashboardHeaderActions");

  assert.equal((header.match(/<HeaderActionLink/g) ?? []).length, 1);
  assert.match(header, /dashboard\.quickActions\.createEvent\.label/);
});

test("needs-attention items are list rows with their count", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const attention = functionBody(dashboard, "NeedsAttention");

  assert.match(attention, /<ul className="divide-y/);
  assert.match(attention, /aria-label=\{`\$\{item\.title\}: \$\{formatNumber\(item\.count, locale\)\}/);
});

test("the sidebar marks the current page softly and uses pill switchers", () => {
  const css = read("src/app/globals.css");
  const shell = read("src/app/(admin)/_components/app-shell.tsx");

  assert.match(css, /\.nav-link-active \{\s+border-color: var\(--primary-border\);\s+background: var\(--primary-soft\);/);
  assert.match(shell, /className="pill-controls /);
  assert.match(css, /\.app-surface \.page-title,\s+\.app-surface \.stat-value \{\s+font-family: var\(--font-body-stack\);/);
});
