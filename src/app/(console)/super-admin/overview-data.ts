import "server-only";

import { logServerError } from "@/lib/errors/server-error";
import {
  dailyCounts,
  overviewChecks,
  overviewTotals,
  summarizeSchools,
  type OverviewRows,
} from "@/lib/platform/overview";
import { visitDay } from "@/lib/site/site-visits";
import { createAdminClient } from "@/lib/supabase/admin";

const TIME_ZONE = "Asia/Ulaanbaatar";
// The database returns at most 1,000 rows a request, without saying so.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const CHART_HISTORY_DAYS = 31;

type PageResult = PromiseLike<{ data: unknown; error: unknown }>;

// Reads every row, page by page. Throws rather than returning part of a table:
// a short read would show as a smaller number, not as an error.
async function readAll<T>(name: string, page: (from: number, to: number) => PageResult): Promise<T[]> {
  const rows: T[] = [];

  for (let index = 0; index < MAX_PAGES; index += 1) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);

    if (error) {
      logServerError(`Platform overview ${name} query failed`, error);
      throw new Error(`overview ${name}`);
    }

    const batch = (data ?? []) as T[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) return rows;
  }

  throw new Error(`overview ${name} too large`);
}

// Read with the service role after the page has called requirePlatformAdmin().
// Ids, statuses and dates only: no student names, codes or contact details.
export async function loadPlatformOverview(chartDays: number) {
  const admin = createAdminClient();
  const now = new Date();
  const today = visitDay(now, TIME_ZONE);
  const since = new Date(now.getTime() - CHART_HISTORY_DAYS * 86_400_000).toISOString();
  const read = <Key extends keyof OverviewRows>(name: Key, page: (from: number, to: number) => PageResult) =>
    readAll<OverviewRows[Key][number]>(name, page);

  const [schools, rosters, codes, memberships, attendees, checkins, clubs, events, staff, clubRequests, signups] =
    await Promise.all([
      read("schools", (from, to) =>
        admin.from("schools").select("id, name, slug, is_demo").eq("status", "active").order("name").order("id").range(from, to)),
      read("rosters", (from, to) =>
        admin.from("student_rosters").select("id, school_id, profile_id").eq("status", "active").order("id").range(from, to)),
      read("codes", (from, to) =>
        admin.from("invite_codes").select("student_roster_id, status, expires_at").order("id").range(from, to)),
      read("memberships", (from, to) =>
        admin.from("club_memberships").select("student_roster_id").eq("status", "active").order("id").range(from, to)),
      read("attendees", (from, to) =>
        admin.from("event_attendees").select("student_roster_id, status").order("id").range(from, to)),
      read("checkins", (from, to) =>
        admin.from("attendance_checkins").select("school_id, checked_in_at").eq("result", "success").gte("checked_in_at", since).order("id").range(from, to)),
      read("clubs", (from, to) =>
        admin.from("clubs").select("school_id").eq("status", "active").order("id").range(from, to)),
      read("events", (from, to) =>
        admin.from("events").select("school_id, status, starts_at, created_at").in("status", ["approved", "pending_approval"]).order("id").range(from, to)),
      read("staff", (from, to) =>
        admin.from("profiles").select("school_id, role").in("role", ["school_admin", "teacher"]).eq("status", "active").order("id").range(from, to)),
      read("clubRequests", (from, to) =>
        admin.from("club_requests").select("school_id, status, created_at").eq("status", "pending").order("id").range(from, to)),
      read("signups", (from, to) =>
        admin.from("profiles").select("school_id, created_at").eq("role", "student").order("id").range(from, to)),
    ]);

  const summaries = summarizeSchools(
    { attendees, checkins, clubRequests, clubs, codes, events, memberships, rosters, schools, signups, staff },
    now,
  );
  const real = new Set(summaries.filter((school) => !school.isDemo).map((school) => school.id));
  const days = (dates: Array<{ at: string; school: string }>) =>
    dates.filter((row) => real.has(row.school)).map((row) => visitDay(new Date(row.at), TIME_ZONE));

  return {
    checkinSeries: dailyCounts(days(checkins.map((row) => ({ at: row.checked_in_at, school: row.school_id }))), chartDays, today),
    checks: overviewChecks(summaries),
    now,
    schools: summaries,
    signupSeries: dailyCounts(days(signups.map((row) => ({ at: row.created_at, school: row.school_id }))), chartDays, today),
    totals: overviewTotals(summaries),
  };
}
