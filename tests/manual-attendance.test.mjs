import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("staff can mark a registered student present by hand, recorded as a manual check-in", () => {
  const actions = read("src/app/(admin)/events/[eventId]/attendance/actions.ts");
  const action = actions.slice(actions.indexOf("export async function markAttendeePresent"));
  // Staff only, and only for their own school's activity.
  assert.match(action, /if \(!isEventStaffActor\(actor\)\) \{\s*redirect\("\/dashboard"\);/);
  assert.match(action, /eventQuery = eventQuery\.eq\("school_id", actor\.profile\.school_id\);/);
  // Only a student who registered for this activity.
  assert.match(action, /attendee\.status !== "registered" && attendee\.status !== "attended"/);
  assert.match(action, /\.eq\("event_id", event\.id\)/);
  // Recorded as manual, by this teacher, so the method mix shows it.
  assert.match(action, /method: "manual",/);
  assert.match(action, /checked_in_by_profile_id: actor\.userId,/);
  assert.match(action, /error\.code !== "23505"/);
});

test("the attendance list offers the button only to students not yet checked in", () => {
  const page = read("src/app/(admin)/events/[eventId]/attendance/page.tsx");
  assert.equal(page.match(/<CheckInCell/g)?.length, 2, "desktop table and phone list");
  assert.match(page, /\{!isCheckedIn && attendee\.status === "registered" \? \(\s*<form action=\{markAttendeePresent\}>/);
});
