import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  CHECK_IN_CLOSES_AFTER_MINUTES,
  CHECK_IN_OPENS_BEFORE_MINUTES,
  checkInTiming,
} from "../src/lib/events/check-in-window.ts";

const START = "2026-11-20T08:00:00Z";
const END = "2026-11-20T09:30:00Z";
const at = (iso) => new Date(iso);

test("check-in opens 30 minutes before the start and closes 30 minutes after the end", () => {
  assert.equal(CHECK_IN_OPENS_BEFORE_MINUTES, 30);
  assert.equal(CHECK_IN_CLOSES_AFTER_MINUTES, 30);
});

test("the window boundaries are inclusive; one minute outside is refused", () => {
  assert.equal(checkInTiming(at("2026-11-20T07:29:00Z"), START, END), "early");
  assert.equal(checkInTiming(at("2026-11-20T07:30:00Z"), START, END), "open");
  assert.equal(checkInTiming(at("2026-11-20T08:45:00Z"), START, END), "open");
  assert.equal(checkInTiming(at("2026-11-20T10:00:00Z"), START, END), "open");
  assert.equal(checkInTiming(at("2026-11-20T10:01:00Z"), START, END), "closed");
  assert.equal(checkInTiming(at("2026-11-21T08:00:00Z"), START, END), "closed");
});

test("a broken date never opens check-in", () => {
  assert.equal(checkInTiming(at("2026-11-20T08:00:00Z"), "not a date", END), "closed");
});

test("the QR check-in action checks the window before recording attendance", () => {
  const source = readFileSync(join(process.cwd(), "src/app/check-in/[eventId]/actions.ts"), "utf8");
  assert.match(source, /"id, school_id, status, starts_at, ends_at, capacity, permission_required, allow_connected_school_registration"/);
  const guard = source.indexOf("checkInTiming(new Date(), event.starts_at, event.ends_at)");
  assert.ok(guard > 0, "the action computes the timing");
  // The guard sits in getCheckInContext, before the insert in checkInToEvent uses the context.
  assert.ok(source.indexOf('if (timing !== "open")') > guard);
  assert.match(source, /checkIn\.errors\.notOpenYet/);
  assert.match(source, /checkIn\.errors\.closed/);
});

test("walk-in: scanning without registering joins and checks in only when nothing else is needed", () => {
  const source = readFileSync(join(process.cwd(), "src/app/check-in/[eventId]/actions.ts"), "utf8");
  const walkIn = source.slice(source.indexOf("async function canWalkIn("));
  // No permission slip, the visiting school allowed, room left.
  assert.match(walkIn, /if \(event\.permission_required\) return false;/);
  assert.match(walkIn, /event\.school_id !== profile\.school_id && !event\.allow_connected_school_registration\) return false;/);
  assert.match(walkIn, /return \(count \?\? 0\) < event\.capacity;/);
  // Walk-in is only offered inside the check-in window.
  const guard = source.indexOf('if (!attendee || attendee.status === "canceled") {');
  assert.ok(source.indexOf('if (timing !== "open") {', guard) < source.indexOf("registerWalkIn(admin", guard));
  // Recorded as a walk-in, so attendance figures can show the method mix.
  assert.match(source, /walk_in: walkIn,/);
  // The only server action in the file is the check-in itself.
  assert.deepEqual(source.match(/^export async function \w+/gm), ["export async function checkInToEvent"]);
});
