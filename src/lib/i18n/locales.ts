export const DEFAULT_LOCALE = "en";
export const LANGUAGE_COOKIE = "sah_locale";
export const SUPPORTED_LOCALES = ["en", "mn"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  mn: "Монгол",
};

export function isLocale(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}

export function normalizeLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
