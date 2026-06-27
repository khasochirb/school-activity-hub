import { en, type Dictionary, type PartialDictionary } from "./dictionaries/en";
import { mn } from "./dictionaries/mn";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const dictionaries: Record<Locale, PartialDictionary> = {
  en,
  mn,
};

export function getDictionary(locale: Locale): Dictionary {
  if (locale === DEFAULT_LOCALE) {
    return en;
  }

  return mergeDictionary(en, dictionaries[locale]);
}

export function translate(dictionary: Dictionary, key: string): string {
  return getStringAtPath(dictionary, key) ?? getStringAtPath(en, key) ?? key;
}

export function formatTranslation(
  dictionary: Dictionary,
  key: string,
  values: Record<string, string | number>,
): string {
  return translate(dictionary, key).replace(/\{(\w+)\}/g, (match, name) => {
    const value = values[name];

    return value === undefined ? match : String(value);
  });
}

function mergeDictionary(
  fallback: unknown,
  override: unknown,
): Dictionary {
  return deepMergeDictionary(fallback, override) as Dictionary;
}

function getStringAtPath(dictionary: Dictionary, key: string) {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, dictionary);

  return typeof value === "string" ? value : undefined;
}

function deepMergeDictionary(fallback: unknown, override: unknown): unknown {
  if (typeof fallback === "string") {
    return typeof override === "string" ? override : fallback;
  }

  if (!isRecord(fallback)) {
    return fallback;
  }

  const overrideRecord = isRecord(override) ? override : {};

  return Object.fromEntries(
    Object.entries(fallback).map(([key, fallbackValue]) => [
      key,
      deepMergeDictionary(fallbackValue, overrideRecord[key]),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
