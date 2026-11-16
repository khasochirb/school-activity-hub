import "server-only";

import {
  UPCOMING_WINDOW_DAYS,
  evaluateSiteChecks,
  shiftDay,
  type ConsolePage,
  type ConsoleSchool,
  type ViewRow,
} from "@/lib/site/site-health";
import { visitDay } from "@/lib/site/site-visits";
import { createAdminClient } from "@/lib/supabase/admin";

const CONSOLE_TIME_ZONE = "Asia/Ulaanbaatar";

// Everything the sites console shows, read with the service role. The page
// calls requirePlatformAdmin() before this runs.
export async function loadSitesConsole() {
  const admin = createAdminClient();
  const now = new Date();
  const today = visitDay(now, CONSOLE_TIME_ZONE);
  const windowEnd = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 86_400_000).toISOString();

  const [schoolsResult, pagesResult, eventsResult, viewsResult] = await Promise.all([
    admin.from("schools").select("id, name, slug").eq("status", "active").order("name").returns<ConsoleSchool[]>(),
    admin
      .from("school_pages")
      .select("id, school_id, parent_id, slug, title, status, body, cover_path, updated_at")
      .returns<ConsolePage[]>(),
    admin
      .from("events")
      .select("school_id")
      .eq("status", "approved")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", windowEnd)
      .returns<Array<{ school_id: string }>>(),
    admin
      .from("school_site_views")
      .select("school_id, page_key, day, views")
      .gte("day", shiftDay(today, -59))
      .returns<ViewRow[]>(),
  ]);

  const schools = schoolsResult.data ?? [];
  const pages = pagesResult.data ?? [];
  const views = viewsResult.data ?? [];
  const upcomingBySchool = new Map<string, number>();

  for (const event of eventsResult.data ?? []) {
    upcomingBySchool.set(event.school_id, (upcomingBySchool.get(event.school_id) ?? 0) + 1);
  }

  const counterReachable = !viewsResult.error;
  const checks = evaluateSiteChecks({ counterReachable, pages, schools, today, upcomingBySchool, views });

  return { checks, counterReachable, now, pages, schools, today, upcomingBySchool, views };
}
