import "server-only";

import { cookies } from "next/headers";
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  normalizeThemePreference,
  type ThemePreference,
} from "./theme";

export async function getCurrentTheme(): Promise<ThemePreference> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(THEME_COOKIE)?.value;

  return normalizeThemePreference(cookieTheme ?? DEFAULT_THEME);
}
