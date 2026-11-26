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

test("undo removes only a manual check-in, only for staff of that school", () => {
  const actions = read("src/app/(admin)/events/[eventId]/attendance/actions.ts");
  const undo = actions.slice(actions.indexOf("export async function undoMarkAttendeePresent"), actions.indexOf("function parsePermissionStatus("));
  assert.match(undo, /if \(!isEventStaffActor\(actor\)\) \{\s*redirect\("\/dashboard"\);/);
  assert.match(undo, /eventQuery = eventQuery\.eq\("school_id", actor\.profile\.school_id\);/);
  // The delete is pinned to this attendee, this activity, this school and manual rows only.
  const del = undo.slice(undo.indexOf(".delete()"), undo.indexOf("if (error)"));
  for (const filter of ['.eq("event_attendee_id", attendee.id)', '.eq("event_id", event.id)', '.eq("school_id", event.school_id)', '.eq("method", "manual")']) {
    assert.ok(del.includes(filter), filter);
  }
  // Back to registered only when no successful check-in is left (a QR check-in stays).
  assert.match(undo, /if \(!count\) \{/);
  const page = read("src/app/(admin)/events/[eventId]/attendance/page.tsx");
  assert.match(page, /\{isCheckedIn && checkinMethod === "manual" \? \(\s*<form action=\{undoMarkAttendeePresent\}>/);
});
