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

export function formatSchedulePreview(
  startsAt: DateInput,
  endsAt: DateInput,
  locale: Locale,
) {
  const intlLocale = resolveIntlLocale(locale);
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
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
