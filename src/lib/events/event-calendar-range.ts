export type EventBrowseView = "list" | "month" | "week";

export const DEFAULT_EVENT_TIME_ZONE = "America/Vancouver";

const dayKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const monthPattern = /^(\d{4})-(\d{2})$/;

export function shouldApplyEventTimeFilter(view: EventBrowseView) {
  return view !== "month";
}

export function isEventTimeFilterActive(
  view: EventBrowseView,
  time: "past" | "upcoming",
) {
  return shouldApplyEventTimeFilter(view) && time !== "upcoming";
}

export function resolveEventTimeZone(value: string | null | undefined) {
  const candidate = value?.trim() || DEFAULT_EVENT_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return DEFAULT_EVENT_TIME_ZONE;
  }
}

export function currentCalendarMonth(value: Date, timeZone: string) {
  return eventCalendarDayKey(value, timeZone).slice(0, 7);
}

export function parseCalendarMonth(
  value: string,
  fallbackDate: Date,
  timeZone: string,
) {
  const match = monthPattern.exec(value);

  if (!match) {
    return currentCalendarMonth(fallbackDate, timeZone);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return month >= 1 && month <= 12
    ? `${year}-${String(month).padStart(2, "0")}`
    : currentCalendarMonth(fallbackDate, timeZone);
}

export function offsetCalendarMonth(month: string, offset: number) {
  const monthDate = calendarDateFromDayKey(`${month}-01`);
  monthDate.setUTCMonth(monthDate.getUTCMonth() + offset);

  return `${monthDate.getUTCFullYear()}-${String(
    monthDate.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

export function getMonthCalendarGridDateKeys(month: string) {
  const monthDate = calendarDateFromDayKey(`${month}-01`);
  const daysSinceMonday = (monthDate.getUTCDay() + 6) % 7;
  const firstGridDate = addUtcDays(monthDate, -daysSinceMonday);

  return Array.from({ length: 42 }, (_, index) =>
    calendarDateKey(addUtcDays(firstGridDate, index)),
  );
}

export function getMonthCalendarQueryRange(month: string, timeZone: string) {
  const gridDateKeys = getMonthCalendarGridDateKeys(month);
  const fromDay = gridDateKeys[0];
  const toDay = calendarDateKey(
    addUtcDays(calendarDateFromDayKey(gridDateKeys.at(-1) ?? fromDay), 1),
  );
  const resolvedTimeZone = resolveEventTimeZone(timeZone);

  return {
    from: zonedStartOfDayToUtc(fromDay, resolvedTimeZone).toISOString(),
    to: zonedStartOfDayToUtc(toDay, resolvedTimeZone).toISOString(),
  };
}

export function eventCalendarDayKey(
  value: Date | number | string,
  timeZone: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = getZonedParts(date, resolveEventTimeZone(timeZone));

  return [parts.year, parts.month, parts.day]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

export function calendarDateFromDayKey(dayKey: string) {
  const match = dayKeyPattern.exec(dayKey);

  if (!match) {
    return new Date(Date.UTC(1970, 0, 1, 12));
  }

  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );
}

export function calendarDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function zonedStartOfDayToUtc(dayKey: string, timeZone: string) {
  const targetDate = calendarDateFromDayKey(dayKey);
  const targetTimestamp = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
  );
  let candidateTimestamp = targetTimestamp;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getZonedParts(new Date(candidateTimestamp), timeZone);
    const representedTimestamp = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const correction = targetTimestamp - representedTimestamp;

    candidateTimestamp += correction;

    if (correction === 0) {
      break;
    }
  }

  return new Date(candidateTimestamp);
}

function getZonedParts(date: Date, timeZone: string) {
  const values = new Map(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      second: "2-digit",
      timeZone,
      year: "numeric",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    day: values.get("day") ?? 1,
    hour: values.get("hour") ?? 0,
    minute: values.get("minute") ?? 0,
    month: values.get("month") ?? 1,
    second: values.get("second") ?? 0,
    year: values.get("year") ?? 1970,
  };
}
