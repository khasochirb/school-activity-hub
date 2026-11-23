import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("students can filter clubs to My clubs or Other clubs", () => {
  const clubs = read("src/app/(admin)/clubs/page.tsx");
  assert.match(clubs, /CLUB_SHOW_OPTIONS = \["all", "mine", "other"\]/);
  assert.match(clubs, /clubsQuery\.in\("id"/);
  assert.match(clubs, /clubsQuery\.not\("id", "in"/);
  // The filter survives other filter links and the search form.
  assert.match(clubs, /params\.set\("show", filters\.show\)/);
  assert.match(clubs, /name="show" type="hidden"/);
});

test("club and event pages show how many classmates, with names on tap", () => {
  const component = read("src/app/(admin)/_components/classmates-from-class.tsx");
  assert.match(component, /<details className="classmates">/);
  const club = read("src/app/(admin)/clubs/[clubId]/page.tsx");
  assert.match(club, /rpc\("get_club_classmates", \{ target_club_ids: \[club\.id\] \}\)/);
  const event = read("src/app/(admin)/events/[eventId]/page.tsx");
  assert.match(event, /getClassmatesAmong\(/);
  assert.match(event, /events\.classmates\.going/);
});

test("event classmates follow the same privacy rules as clubs", () => {
  const helper = read("src/lib/classmates/classmates.ts");
  assert.match(helper, /\.eq\("show_name_to_classmates", true\)/);
  assert.match(helper, /\.eq\("school_id", viewer\.schoolId\)/);
  assert.match(helper, /id !== me\.id/);
  assert.match(helper, /homeroom\.toLowerCase\(\)/);
});

test("portfolio shows My clubs and no longer has the teacher and classmate views", () => {
  const page = read("src/app/(admin)/portfolio/page.tsx");
  assert.match(page, /portfolio\.myClubs\.title/);
  assert.doesNotMatch(page, /portfolio-viewas|\?as=|viewAs/);
});
