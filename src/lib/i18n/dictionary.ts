import { en, type Dictionary } from "./dictionaries/en";
import { mn } from "./dictionaries/mn";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const dictionaries: Record<Locale, PartialDictionary> = {
  en,
  mn,
};

type PartialDictionary = {
  [Key in keyof Dictionary]?: Partial<Dictionary[Key]>;
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

function mergeDictionary(
  fallback: Dictionary,
  override: PartialDictionary,
): Dictionary {
  return Object.fromEntries(
    Object.entries(fallback).map(([section, fallbackValues]) => [
      section,
      {
        ...fallbackValues,
        ...(override[section as keyof Dictionary] ?? {}),
      },
    ]),
  ) as Dictionary;
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
