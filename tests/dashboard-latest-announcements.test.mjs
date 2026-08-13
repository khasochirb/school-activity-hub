import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("dashboard announcement query is active, same-school, newest-first, and limited", () => {
  const page = read("src/app/(admin)/dashboard/page.tsx");
  const query = page.match(
    /async function getLatestDashboardAnnouncements[\s\S]*?\n}/,
  )?.[0];

  assert.ok(query);
  assert.match(query, /\.select\("id, title, body, created_at"\)/);
  assert.match(query, /\.eq\("school_id", schoolId\)/);
  assert.match(query, /\.eq\("status", "active"\)/);
  assert.match(query, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(query, /\.limit\(3\)/);
  assert.doesNotMatch(query, /createAdminClient|service.role/i);
});

test("latest announcements appear only on student and teacher dashboards", () => {
  const page = read("src/app/(admin)/dashboard/page.tsx");
  const studentDashboard = page.match(
    /function StudentDashboard[\s\S]*?function LatestAnnouncementsSection/,
  )?.[0];

  assert.match(page, /profile\.role === "teacher"/);
  assert.match(page, /<StudentDashboard[\s\S]*?latestAnnouncements=/);
  assert.match(
    page,
    /<LatestAnnouncementsSection[\s\S]*?showCreateAction[\s\S]*?tf=\{tf\}/,
  );
  assert.match(studentDashboard ?? "", /showCreateAction=\{false\}/);
  assert.doesNotMatch(studentDashboard ?? "", /announcements\.actions\.create/);
});

test("latest announcements keep empty and query-failure states exclusive", () => {
  const page = read("src/app/(admin)/dashboard/page.tsx");
  const section = page.match(
    /function LatestAnnouncementsSection[\s\S]*?function DashboardShell/,
  )?.[0];

  assert.ok(section);
  assert.match(section, /result\.failed \?/);
  assert.match(section, /: result\.announcements\.length \?/);
  assert.match(section, /latestAnnouncements\.emptyTitle/);
  assert.match(section, /latestAnnouncements\.unavailableTitle/);
  assert.match(
    page,
    /console\.error\("dashboard\.query\.latest-announcements failed", \{/,
  );
  assert.doesNotMatch(page, /error\.message/);
});

test("English and Mongolian latest-announcement labels are dictionary-backed", () => {
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  for (const [source, expected] of [
    [
      english,
      [
        "Latest announcements",
        "View all announcements",
        "No active announcements",
      ],
    ],
    [
      mongolian,
      ["Сүүлийн зарлалууд", "Бүх зарлалыг харах", "Идэвхтэй зарлал алга"],
    ],
  ]) {
    for (const label of expected) {
      assert.match(source, new RegExp(label));
    }
  }
});
