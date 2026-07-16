import type { Locale } from "./locales";

type DateInput = Date | number | string;

const fallbackIntlLocale = "en-CA";

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

export function formatDateTime(value: DateInput, locale: Locale) {
  return formatWithLocale(value, locale, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: DateInput, locale: Locale) {
  return formatWithLocale(value, locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLongDate(value: DateInput, locale: Locale) {
  return formatWithLocale(value, locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

export function formatMonthYear(value: DateInput, locale: Locale) {
  return formatWithLocale(value, locale, {
    month: "long",
    year: "numeric",
  });
}

export function formatWeekdayShort(value: DateInput, locale: Locale) {
  return formatWithLocale(value, locale, { weekday: "short" });
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

function formatWithLocale(
  value: DateInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), options).format(
    new Date(value),
  );
}

function resolveIntlLocale(locale: Locale) {
  const preferredLocale = intlLocaleByAppLocale[locale] ?? fallbackIntlLocale;
  const supportedLocales = Intl.DateTimeFormat.supportedLocalesOf([
    preferredLocale,
  ]);

  return supportedLocales[0] ?? fallbackIntlLocale;
}
