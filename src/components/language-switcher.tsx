"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LANGUAGE_COOKIE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/locales";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function LanguageSwitcher({
  currentLocale,
  label,
  labels,
}: {
  currentLocale: Locale;
  label: string;
  labels?: Partial<Record<Locale, string>>;
}) {
  const router = useRouter();
  const [locale, setLocale] = useState(currentLocale);
  const [isPending, startTransition] = useTransition();
  const localeLabels = {
    ...LOCALE_LABELS,
    ...labels,
  };

  function selectLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    persistLocale(nextLocale);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div aria-label={label} className="inline-flex rounded-md border border-slate-200 bg-white p-1 shadow-sm">
      {SUPPORTED_LOCALES.map((option) => {
        const active = option === locale;

        return (
          <button
            aria-pressed={active}
            className={
              active
                ? "min-h-8 cursor-pointer rounded bg-teal-50 px-3 text-sm font-bold text-teal-900"
                : "min-h-8 cursor-pointer rounded px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            }
            disabled={isPending}
            key={option}
            onClick={() => selectLocale(option)}
            type="button"
          >
            {localeLabels[option]}
          </button>
        );
      })}
    </div>
  );
}

function persistLocale(locale: Locale) {
  globalThis.document.cookie = `${LANGUAGE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  globalThis.localStorage.setItem(LANGUAGE_COOKIE, locale);
}
