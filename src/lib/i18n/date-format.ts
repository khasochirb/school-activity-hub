import type { Locale } from "./locales";

type DateInput = Date | number | string;

const fallbackIntlLocale = "en-CA";

// Kept equal to DEFAULT_EVENT_TIME_ZONE in lib/events/event-calendar-range.ts (a test
// checks it). Declared here so this file has no imports and node can load it in tests.
const DEFAULT_TIME_ZONE = "Asia/Ulaanbaatar";

const intlLocaleByAppLocale: Record<Locale, string> = {
  en: "en-CA",
  mn: "mn-MN",
};

export function formatDate(value: DateInput, locale: Locale) {
  return formatWithLocale(value, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(value: DateInput, locale: Locale) {
  return formatDate(value, locale);
}

export function formatDateTime(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return formatWithLocale(value, locale, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone,
    year: "numeric",
  });
}

export function formatTime(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return formatWithLocale(value, locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function formatLongDate(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return formatWithLocale(value, locale, {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric",
  });
}

export function formatMonthYear(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return formatWithLocale(value, locale, {
    month: "long",
    timeZone,
    year: "numeric",
  });
}

export function formatWeekdayShort(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return formatWithLocale(value, locale, { timeZone, weekday: "short" });
}

/** Day grouping key (YYYY-MM-DD) in the given time zone, for timeline lists. */
export function formatDayKey(value: DateInput, timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timeZone ?? DEFAULT_TIME_ZONE,
    year: "numeric",
  }).format(new Date(value));
}

/** "Nov 8" style heading for a day in a timeline. */
export function formatTimelineDay(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return formatWithLocale(value, locale, { day: "numeric", month: "short", timeZone });
}

export function formatWeekdayLong(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return formatWithLocale(value, locale, { timeZone, weekday: "long" });
}

export function formatCalendarDateBadge(
  value: DateInput,
  locale: Locale,
  timeZone?: string,
) {
  return {
    day: formatWithLocale(value, locale, { day: "2-digit", timeZone }),
    month: formatWithLocale(value, locale, { month: "short", timeZone }),
  };
}

export function formatDateRange(
  startsAt: DateInput,
  endsAt: DateInput,
  locale: Locale,
) {
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const rangeFormatter = formatter as Intl.DateTimeFormat & {
    formatRange?: (start: Date, end: Date) => string;
  };

  return rangeFormatter.formatRange
    ? rangeFormatter.formatRange(startDate, endDate)
    : `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

export function formatSchedulePreview(
  startsAt: DateInput,
  endsAt: DateInput,
  locale: Locale,
) {
  const intlLocale = resolveIntlLocale(locale);
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    return "";
  }

  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
  const timeFormatter = new Intl.DateTimeFormat(intlLocale, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateFormatter.format(startDate)} \u00b7 ${timeFormatter.format(
    startDate,
  )}\u2013${timeFormatter.format(endDate)}`;
}

// Without a zone, Intl uses the runtime's: UTC on the server, so a 16:00 event in
// Ulaanbaatar printed as 8:00. Calls that pass a school's zone still win.
function formatWithLocale(
  value: DateInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    ...options,
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  }).format(new Date(value));
}

function resolveIntlLocale(locale: Locale) {
  const preferredLocale = intlLocaleByAppLocale[locale] ?? fallbackIntlLocale;
  const supportedLocales = Intl.DateTimeFormat.supportedLocalesOf([
    preferredLocale,
  ]);

  return supportedLocales[0] ?? fallbackIntlLocale;
}
