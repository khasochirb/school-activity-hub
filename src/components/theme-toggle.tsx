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
  currentTheme,
  label,
  labels,
  showLabel = true,
  switchLabel,
}: {
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
              aria-pressed={active}
              className={
                active
                  ? "choice-pill-active min-h-8 min-w-0 cursor-pointer overflow-hidden rounded px-1.5 text-center text-xs font-bold leading-tight whitespace-nowrap"
                  : "min-h-8 min-w-0 cursor-pointer overflow-hidden rounded px-1.5 text-center text-xs font-semibold leading-tight whitespace-nowrap text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              }
              key={option}
              onClick={() => selectTheme(option)}
              type="button"
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
    </div>
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
