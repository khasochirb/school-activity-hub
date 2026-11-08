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

test("club ids without RFC version bits still open their page", () => {
  const body = functionBody(read("src/lib/clubs/club-profile.ts"), "isUuid");
  const literal = body.match(/\/(\^[^/]+\$)\/i/);

  assert.ok(literal, "isUuid regex not found");
  const isUuid = new RegExp(literal[1], "i");

  // Ids of the seeded clubs on the live site.
  assert.ok(isUuid.test("5038cd74-9491-36a2-5e63-46530daba1b4"));
  assert.ok(isUuid.test("e6ca1d98-b46d-b06e-b4e2-0809c21d7718"));
  assert.ok(isUuid.test("8f14e45f-ceea-467a-9575-1f0b3c3a7c11"));
  assert.ok(!isUuid.test("not-a-uuid"));
  assert.ok(!isUuid.test("5038cd74-9491-36a2-5e63-46530daba1b4/edit"));
});

test("student home lists the student's clubs and the open ones before interests", () => {
  const dashboard = read("src/app/(admin)/dashboard/page.tsx");
  const home = functionBody(dashboard, "StudentDashboard");
  const forYou = functionBody(dashboard, "StudentClubsForYouSection");

  // The draft puts "Your clubs" in the side column, beside the suggestions.
  assert.ok(home.indexOf("<StudentMyClubsSection") > -1);
  assert.ok(home.indexOf("<StudentClubsForYouSection") > -1);
  assert.match(functionBody(dashboard, "StudentMyClubsSection"), /studentProfile\.clubs\.empty/);

  const noInterests = forYou.slice(forYou.indexOf("if (!hasInterests)"), forYou.lastIndexOf("return (\n    <Section"));
  assert.match(noInterests, /open\.slice\(0, 5\)\.map/);
  assert.match(forYou, /href: "\/clubs"/);
});

test("students do not see the staff instructions on the clubs page", () => {
  const page = read("src/app/(admin)/clubs/page.tsx");

  assert.match(page, /description=\{isStaff \? t\("clubs\.description"\) : undefined\}/);
});
