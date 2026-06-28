export const DEFAULT_THEME = "system";
export const THEME_COOKIE = "sah_theme";
export const SUPPORTED_THEMES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof SUPPORTED_THEMES)[number];

export function isThemePreference(
  value: string | undefined,
): value is ThemePreference {
  return SUPPORTED_THEMES.some((theme) => theme === value);
}

export function normalizeThemePreference(
  value: string | undefined,
): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME;
}
