"use client";

import { useEffect, useState } from "react";
import {
  SUPPORTED_THEMES,
  THEME_COOKIE,
  type ThemePreference,
} from "@/lib/theme";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type ThemeLabels = Record<ThemePreference, string>;

export function ThemeToggle({
  compact = false,
  currentTheme,
  label,
  labels,
  showLabel = true,
  switchLabel,
}: {
  compact?: boolean;
  currentTheme: ThemePreference;
  label: string;
  labels: ThemeLabels;
  showLabel?: boolean;
  switchLabel: string;
}) {
  const [theme, setTheme] = useState(currentTheme);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    const activeTheme = storedTheme ?? theme;

    applyTheme(activeTheme);

    if (activeTheme !== "system") {
      return;
    }

    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  function selectTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    persistTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className={showLabel ? "min-w-0 max-w-full space-y-1.5" : "min-w-0 max-w-full"}>
      <p
        className={
          showLabel
            ? "max-w-full break-words text-xs font-bold uppercase leading-snug tracking-wide text-slate-500"
            : "sr-only"
        }
      >
        {label}
      </p>
      <div
        aria-label={switchLabel}
        className="grid w-full max-w-full grid-cols-3 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm"
      >
        {SUPPORTED_THEMES.map((option) => {
          const active = option === theme;

          return (
            <button
              aria-label={compact ? labels[option] : undefined}
              aria-pressed={active}
              className={
                active
                  ? "choice-pill-active motion-choice min-h-8 min-w-0 cursor-pointer rounded px-1 text-center text-[0.68rem] font-bold leading-tight whitespace-nowrap sm:text-xs"
                  : "motion-choice min-h-8 min-w-0 cursor-pointer rounded px-1 text-center text-[0.68rem] font-semibold leading-tight whitespace-nowrap text-slate-600 hover:bg-slate-50 hover:text-slate-950 sm:text-xs"
              }
              key={option}
              onClick={() => selectTheme(option)}
              title={labels[option]}
              type="button"
            >
              {compact ? <ThemeIcon theme={option} /> : labels[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemeIcon({ theme }: { theme: ThemePreference }) {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {theme === "light" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : theme === "dark" ? (
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      ) : (
        <>
          <rect height="12" rx="1.5" width="18" x="3" y="4" />
          <path d="M8 20h8M12 16v4" />
        </>
      )}
    </svg>
  );
}

function persistTheme(theme: ThemePreference) {
  globalThis.document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  globalThis.localStorage.setItem(THEME_COOKIE, theme);
}

function readStoredTheme() {
  const cookieMatch = globalThis.document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`),
  );
  const cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
  const storedTheme = globalThis.localStorage.getItem(THEME_COOKIE) ?? "";
  const theme = cookieTheme || storedTheme;

  return SUPPORTED_THEMES.find((option) => option === theme);
}

function applyTheme(theme: ThemePreference) {
  const root = globalThis.document.documentElement;
  const systemPrefersDark = globalThis.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const shouldUseDarkTheme =
    theme === "dark" || (theme === "system" && systemPrefersDark);

  root.dataset.theme = theme;
  root.classList.toggle("dark", shouldUseDarkTheme);
  root.style.colorScheme = shouldUseDarkTheme ? "dark" : "light";
}
