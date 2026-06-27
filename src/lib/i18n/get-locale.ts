import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE,
  normalizeLocale,
  type Locale,
} from "./locales";

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LANGUAGE_COOKIE)?.value;

  return normalizeLocale(cookieLocale ?? DEFAULT_LOCALE);
}
