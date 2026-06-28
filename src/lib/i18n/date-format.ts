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
