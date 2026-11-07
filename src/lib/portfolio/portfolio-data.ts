import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import {
  PORTFOLIO_ENTRY_SELECT,
  type PortfolioEntry,
} from "./portfolio";

export type PortfolioViewer = {
  fullName: string;
  id: string;
  role: "school_admin" | "teacher" | "student";
  schoolId: string;
  status: string;
};

export type PortfolioStudent = {
  displayName: string;
  gradeLabel: string | null;
  id: string;
  initials: string;
};

export type PortfolioOption = { id: string; label: string };

export async function getPortfolioI18n() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return {
    locale,
    t: (key: string) => translate(dictionary, key),
    tf: (key: string, values: Record<string, string | number>) =>
      formatTranslation(dictionary, key, values),
  };
}

export async function getPortfolioViewer(): Promise<PortfolioViewer | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, school_id, full_name, role, status")
    .eq("id", user.id)
    .maybeSingle<{
      full_name: string;
      id: string;
      role: PortfolioViewer["role"];
      school_id: string;
      status: string;
    }>();

  if (!data || data.status !== "active") return null;

  return {
    fullName: data.full_name,
    id: data.id,
    role: data.role,
    schoolId: data.school_id,
    status: data.status,
  };
}

type RosterRow = {
  first_name: string;
  grade_level: string | null;
  homeroom: string | null;
  id: string;
  last_name: string;
  preferred_name: string | null;
};

function toStudent(row: RosterRow): PortfolioStudent {
  const first = row.preferred_name || row.first_name;
  const displayName = `${first} ${row.last_name}`.trim();
  const grade = [row.grade_level, row.homeroom].filter(Boolean).join(" · ");

  return {
    displayName,
    gradeLabel: grade || null,
    id: row.id,
    initials: `${first.charAt(0)}${row.last_name.charAt(0)}`.toUpperCase(),
  };
}

const ROSTER_SELECT =
  "id, first_name, last_name, preferred_name, grade_level, homeroom";

export async function getOwnRoster(viewer: PortfolioViewer) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_rosters")
    .select(ROSTER_SELECT)
    .eq("school_id", viewer.schoolId)
    .eq("profile_id", viewer.id)
    .eq("status", "active")
    .maybeSingle<RosterRow>();

  return data ? toStudent(data) : null;
}

export async function getRosterStudent(schoolId: string, rosterId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_rosters")
    .select(ROSTER_SELECT)
    .eq("school_id", schoolId)
    .eq("id", rosterId)
    .maybeSingle<RosterRow>();

  return data ? toStudent(data) : null;
}

/** Entries the current user may see for one student (row-level security filters). */
export async function getPortfolioEntries(rosterId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_entries")
    .select(PORTFOLIO_ENTRY_SELECT)
    .eq("student_roster_id", rosterId)
    .order("is_featured", { ascending: false })
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<PortfolioEntry[]>();

  return data ?? [];
}

export async function getFeedbackCounts(entryIds: string[]) {
  if (!entryIds.length) return new Map<string, number>();

  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_feedback")
    .select("entry_id")
    .in("entry_id", entryIds)
    .returns<{ entry_id: string }[]>();
  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    counts.set(row.entry_id, (counts.get(row.entry_id) ?? 0) + 1);
  }

  return counts;
}

/** Joined clubs and attended events, for the entry form and the stats. */
export async function getStudentLinks(schoolId: string, rosterId: string) {
  const supabase = await createClient();
  const [{ data: memberships }, { data: attended }] = await Promise.all([
    supabase
      .from("club_memberships")
      .select("club_id")
      .eq("school_id", schoolId)
      .eq("student_roster_id", rosterId)
      .eq("status", "active")
      .returns<{ club_id: string }[]>(),
    supabase
      .from("event_attendees")
      .select("event_id")
      .eq("student_roster_id", rosterId)
      .eq("status", "attended")
      .returns<{ event_id: string }[]>(),
  ]);
  const clubIds = (memberships ?? []).map((row) => row.club_id);
  const eventIds = (attended ?? []).map((row) => row.event_id);
  const [{ data: clubs }, { data: events }] = await Promise.all([
    clubIds.length
      ? supabase
          .from("clubs")
          .select("id, name")
          .in("id", clubIds)
          .order("name")
          .returns<{ id: string; name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    eventIds.length
      ? supabase
          .from("events")
          .select("id, title, starts_at")
          .in("id", eventIds)
          .eq("school_id", schoolId)
          .order("starts_at", { ascending: false })
          .returns<{ id: string; starts_at: string; title: string }[]>()
      : Promise.resolve({
          data: [] as { id: string; starts_at: string; title: string }[],
        }),
  ]);

  return {
    attendedCount: eventIds.length,
    clubs: (clubs ?? []).map((club) => ({ id: club.id, label: club.name })),
    events: (events ?? []).map((event) => ({
      id: event.id,
      label: event.title,
    })),
  };
}
