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

  if (locale === "mn") {
    return mongolianDateRange(startDate, endDate);
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
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    return "";
  }

  const dateOptions = { day: "numeric", month: "short", weekday: "short" } as const;
  const timeOptions = { hour: "numeric", minute: "2-digit" } as const;

  // The times come from the form, so they stay in the viewer's own zone.
  return `${formatIn(startDate, locale, dateOptions)} \u00b7 ${formatIn(
    startDate,
    locale,
    timeOptions,
  )}\u2013${formatIn(endDate, locale, timeOptions)}`;
}

// Without a zone, Intl uses the runtime's: UTC on the server, so a 16:00 event in
// Ulaanbaatar printed as 8:00. Calls that pass a school's zone still win.
function formatWithLocale(
  value: DateInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
) {
  return formatIn(new Date(value), locale, {
    ...options,
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  });
}

function formatIn(date: Date, locale: Locale, options: Intl.DateTimeFormatOptions) {
  return locale === "mn"
    ? mongolianDate(date, options)
    : new Intl.DateTimeFormat(resolveIntlLocale(locale), options).format(date);
}

// Chrome has no Mongolian date names and shows English instead, while the server,
// Safari and Firefox have them. Written out here, every browser shows the same
// text as the server. The forms are the standard Mongolian ones (Unicode CLDR).
const MONGOLIAN_WEEKDAYS = [
  ["Ня", "Ням"],
  ["Да", "Даваа"],
  ["Мя", "Мягмар"],
  ["Лх", "Лхагва"],
  ["Пү", "Пүрэв"],
  ["Ба", "Баасан"],
  ["Бя", "Бямба"],
];
const MONGOLIAN_MONTHS = [
  "нэгдүгээр",
  "хоёрдугаар",
  "гуравдугаар",
  "дөрөвдүгээр",
  "тавдугаар",
  "зургаадугаар",
  "долоодугаар",
  "наймдугаар",
  "есдүгээр",
  "аравдугаар",
  "арван нэгдүгээр",
  "арван хоёрдугаар",
];
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function mongolianDate(date: Date, options: Intl.DateTimeFormatOptions) {
  const at = dateParts(date, options.timeZone);
  const [shortWeekday, longWeekday] = MONGOLIAN_WEEKDAYS[at.weekday];
  const dayOfMonth = options.day === "2-digit" ? twoDigits(at.day) : String(at.day);
  const words: string[] = [];

  if (options.year) words.push(`${at.year} оны`);

  if (options.month) {
    const month =
      options.month === "long" ? `${MONGOLIAN_MONTHS[at.month - 1]} сар` : `${at.month}-р сар`;

    words.push(options.day ? `${month}ын ${dayOfMonth}` : month);
  } else if (options.day) {
    words.push(dayOfMonth);
  }

  let text = words.join(" ");

  if (options.weekday === "long") {
    text = text ? `${text}, ${longWeekday.toLowerCase()} гараг` : longWeekday;
  } else if (options.weekday) {
    text = text ? `${text}. ${shortWeekday}` : shortWeekday;
  }

  if (options.hour) {
    const time = `${at.hour}:${twoDigits(at.minute)}`;

    text = text ? `${text} ${time}` : time;
  }

  return text;
}

function mongolianDateRange(startDate: Date, endDate: Date) {
  const start = dateParts(startDate);
  const end = dateParts(endDate);
  const monthDay = (at: typeof start) => `${ROMAN_MONTHS[at.month - 1]}/${twoDigits(at.day)}`;
  const year = (at: typeof start) => `${at.year}\u202fоны`;

  if (start.year !== end.year) {
    return `${year(start)} ${monthDay(start)} \u2013 ${year(end)} ${monthDay(end)}`;
  }

  if (start.month !== end.month) {
    return `${year(start)} ${monthDay(start)} \u2013 ${monthDay(end)}`;
  }

  return start.day === end.day
    ? mongolianDate(startDate, { day: "numeric", month: "short", year: "numeric" })
    : `${year(start)} ${monthDay(start)} \u2013 ${twoDigits(end.day)}`;
}

// The date and time in the zone, read through English digits, which every
// browser has. Without a zone, the runtime's own.
function dateParts(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    minute: "numeric",
    month: "numeric",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const number = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const [year, month, day] = [number("year"), number("month"), number("day")];

  return {
    day,
    hour: number("hour"),
    minute: number("minute"),
    month,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    year,
  };
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function resolveIntlLocale(locale: Locale) {
  const preferredLocale = intlLocaleByAppLocale[locale] ?? fallbackIntlLocale;
  const supportedLocales = Intl.DateTimeFormat.supportedLocalesOf([
    preferredLocale,
  ]);

  return supportedLocales[0] ?? fallbackIntlLocale;
}
