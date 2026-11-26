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

const SHORT_LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  mn: "МН",
};

export function LanguageSwitcher({
  className = "w-full max-w-full",
  compact = false,
  currentLocale,
  label,
  labels,
}: {
  className?: string;
  compact?: boolean;
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
    <div
      aria-label={label}
      className={`grid ${className} grid-cols-2 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm`}
    >
      {SUPPORTED_LOCALES.map((option) => {
        const active = option === locale;

        return (
          <button
            aria-label={compact ? localeLabels[option] : undefined}
            aria-pressed={active}
            className={
              active
                ? "choice-pill-active motion-choice min-h-8 min-w-0 cursor-pointer rounded px-2 text-center text-sm font-bold leading-snug break-words whitespace-normal"
                : "motion-choice min-h-8 min-w-0 cursor-pointer rounded px-2 text-center text-sm font-semibold leading-snug break-words whitespace-normal text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }
            disabled={isPending}
            key={option}
            onClick={() => selectLocale(option)}
            title={compact ? localeLabels[option] : undefined}
            type="button"
          >
            {compact ? SHORT_LOCALE_LABELS[option] : localeLabels[option]}
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
