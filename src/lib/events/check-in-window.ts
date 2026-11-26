// When a student may check in with the activity's QR link. Pure and import-free
// so tests/check-in-window.test.mjs pins every boundary. Outside the window a
// teacher can still mark attendance by hand on the attendance page.

export const CHECK_IN_OPENS_BEFORE_MINUTES = 30;
export const CHECK_IN_CLOSES_AFTER_MINUTES = 30;

export type CheckInTiming = "early" | "open" | "closed";

const MINUTE = 60_000;

export function checkInWindow(startsAt: string, endsAt: string | null) {
  const start = Date.parse(startsAt);
  // An activity with no end time closes 30 minutes after it starts.
  const end = endsAt ? Date.parse(endsAt) : start;

  return {
    closes: end + CHECK_IN_CLOSES_AFTER_MINUTES * MINUTE,
    opens: start - CHECK_IN_OPENS_BEFORE_MINUTES * MINUTE,
  };
}

export function checkInTiming(now: Date, startsAt: string, endsAt: string | null): CheckInTiming {
  const { closes, opens } = checkInWindow(startsAt, endsAt);
  const time = now.getTime();

  if (Number.isNaN(opens) || Number.isNaN(closes)) return "closed";
  if (time < opens) return "early";
  return time > closes ? "closed" : "open";
}
