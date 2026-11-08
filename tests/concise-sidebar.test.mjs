import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const shell = read("src/app/(admin)/_components/app-shell.tsx");
const sidebarList = shell.slice(shell.indexOf("const navSections"), shell.indexOf("const mobilePrimaryNav"));

function primaryHrefs(role) {
  const hrefs = [];
  for (const match of sidebarList.matchAll(/href: "([^"]+)",?\s*labelKey: "[^"]+",?\s*primaryFor: (ALL_ROLES|\[[^\]]*\])/g)) {
    const roles = match[2] === "ALL_ROLES" ? ["school_admin", "teacher", "student"] : match[2];
    if (roles.includes(role)) hrefs.push(match[1]);
  }
  return hrefs;
}

test("each role's sidebar shows five or six main items", () => {
  assert.deepEqual(primaryHrefs("student"), ["/dashboard", "/events", "/clubs", "/portfolio", "/club-requests"]);
  assert.deepEqual(primaryHrefs("school_admin"), ["/dashboard", "/events", "/clubs", "/students", "/approvals", "/reports"]);
  assert.deepEqual(primaryHrefs("teacher"), primaryHrefs("school_admin"));
});

test("everything else sits under one More group that opens when a page inside it is active", () => {
  const nav = read("src/app/(admin)/_components/app-nav.tsx");
  assert.match(nav, /<details className="nav-more group min-w-0" open=\{moreHasActive\}>/);
  assert.match(shell, /moreLabel=\{t\("nav\.more"\)\}/);
});

test("the sidebar collapses to an icon rail and remembers it", () => {
  const toggle = read("src/app/(admin)/_components/sidebar-toggle.tsx");
  assert.match(toggle, /document\.cookie = `\$\{SIDEBAR_COOKIE\}=/);
  assert.match(toggle, /aria-expanded=\{!collapsed\}/);
  assert.match(shell, /data-sidebar=\{sidebarCollapsed \? "collapsed" : "expanded"\}/);
  const css = read("src/app/globals.css");
  assert.match(css, /\.app-surface\[data-sidebar="collapsed"\] > aside \{\s*width: 4\.75rem;/);
  assert.match(css, /\.app-surface\[data-sidebar="collapsed"\] > \.app-content \{\s*padding-left: 4\.75rem;/);
});

test("the cookie name reaches the server as a string, not a client reference", () => {
  assert.match(read("src/lib/ui/sidebar-cookie.ts"), /export const SIDEBAR_COOKIE = "sah-sidebar";/);
  assert.match(shell, /import \{ SIDEBAR_COOKIE \} from "@\/lib\/ui\/sidebar-cookie";/);
  assert.doesNotMatch(read("src/app/(admin)/_components/sidebar-toggle.tsx"), /export const SIDEBAR_COOKIE/);
});
