// My schedule: one week of a student's own events. An event is on the schedule
// when the student registered for it or when one of their clubs holds it.

export type ScheduleEvent = {
  club_id: string | null;
  ends_at: string;
  id: string;
  location: string | null;
  starts_at: string;
  title: string;
};

export type ScheduleItem = ScheduleEvent & {
  /** "registered" wins when the student also belongs to the club. */
  reason: "club" | "registered";
};

export type ScheduleDay = { dayKey: string; items: ScheduleItem[] };

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Monday of the requested week; anything unreadable means the current week. */
export function parseScheduleWeek(value: string | undefined, todayKey: string) {
  const dayKey =
    value && DAY_KEY.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
      ? value
      : todayKey;

  const date = new Date(`${dayKey}T12:00:00Z`);

  // Monday starts the week.
  return addDays(dayKey, -((date.getUTCDay() + 6) % 7));
}

export function offsetScheduleWeek(monday: string, weeks: number) {
  return addDays(monday, weeks * 7);
}

/** The seven days, Monday first. */
export function scheduleDayKeys(monday: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function buildScheduleDays({
  clubIds,
  dayKeyOf,
  events,
  monday,
  registeredEventIds,
}: {
  clubIds: string[];
  /** Day (YYYY-MM-DD) of a start time in the school's time zone. */
  dayKeyOf: (startsAt: string) => string;
  events: ScheduleEvent[];
  monday: string;
  registeredEventIds: string[];
}): ScheduleDay[] {
  const registered = new Set(registeredEventIds);
  const clubs = new Set(clubIds);
  const days = scheduleDayKeys(monday).map((dayKey) => ({
    dayKey,
    items: [] as ScheduleItem[],
  }));
  const byKey = new Map(days.map((day) => [day.dayKey, day]));
  const seen = new Set<string>();

  for (const event of events) {
    const reason = registered.has(event.id)
      ? "registered"
      : event.club_id && clubs.has(event.club_id)
        ? "club"
        : null;
    const day = byKey.get(dayKeyOf(event.starts_at));

    if (!reason || !day || seen.has(event.id)) continue;

    seen.add(event.id);
    day.items.push({ ...event, reason });
  }

  for (const day of days) {
    day.items.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  }

  return days;
}

function addDays(dayKey: string, days: number) {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
