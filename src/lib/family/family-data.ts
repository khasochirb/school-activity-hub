import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ParentViewer = {
  fullName: string | null;
  id: string;
  schoolId: string;
};

export type FamilyChild = {
  clubs: Array<{ id: string; name: string; role: "leader" | "member" }>;
  displayName: string;
  gradeLevel: string | null;
  homeroom: string | null;
  recent: Array<{ id: string; startsAt: string; title: string }>;
  rosterId: string;
  schoolName: string | null;
  upcoming: Array<{
    id: string;
    location: string | null;
    permissionRequired: boolean;
    permissionStatus: string;
    startsAt: string;
    title: string;
  }>;
};

// The signed-in parent, or null for anyone else.
export async function getParentViewer(): Promise<ParentViewer | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, school_id, full_name, role")
    .eq("id", user.id)
    .eq("status", "active")
    .maybeSingle<{ full_name: string | null; id: string; role: string; school_id: string }>();

  if (!data || data.role !== "parent") return null;

  return { fullName: data.full_name, id: data.id, schoolId: data.school_id };
}

// Everything a parent sees about their children. Read with the service role
// only after the parent's own links are loaded: a parent never reaches a
// student they are not linked to.
export async function getFamilyChildren(parent: ParentViewer): Promise<FamilyChild[]> {
  const admin = createAdminClient();
  const { data: links } = await admin
    .from("parent_links")
    .select("student_roster_id, school_id")
    .eq("parent_profile_id", parent.id)
    .order("created_at")
    .returns<Array<{ school_id: string; student_roster_id: string }>>();
  const rosterIds = (links ?? []).map((link) => link.student_roster_id);

  if (!rosterIds.length) return [];

  const now = new Date().toISOString();
  const [{ data: rosters }, { data: memberships }, { data: attendance }] = await Promise.all([
    admin
      .from("student_rosters")
      .select("id, school_id, first_name, last_name, preferred_name, grade_level, homeroom, schools(name)")
      .in("id", rosterIds)
      .eq("status", "active")
      .returns<
        Array<{
          first_name: string;
          grade_level: string | null;
          homeroom: string | null;
          id: string;
          last_name: string;
          preferred_name: string | null;
          school_id: string;
          schools: { name: string } | null;
        }>
      >(),
    admin
      .from("club_memberships")
      .select("student_roster_id, role, clubs(id, name, status)")
      .in("student_roster_id", rosterIds)
      .eq("status", "active")
      .returns<
        Array<{
          clubs: { id: string; name: string; status: string } | null;
          role: "leader" | "member";
          student_roster_id: string;
        }>
      >(),
    admin
      .from("event_attendees")
      .select("student_roster_id, status, permission_status, events(id, title, starts_at, location, status, permission_required)")
      .in("student_roster_id", rosterIds)
      .in("status", ["registered", "attended"])
      .returns<
        Array<{
          events: {
            id: string;
            location: string | null;
            permission_required: boolean;
            starts_at: string;
            status: string;
            title: string;
          } | null;
          permission_status: string;
          status: "attended" | "registered";
          student_roster_id: string;
        }>
      >(),
  ]);

  return (rosters ?? []).map((roster) => {
    const rows = (attendance ?? []).filter((row) => row.student_roster_id === roster.id && row.events);
    const upcoming = rows
      .filter((row) => row.status === "registered" && row.events!.starts_at >= now && row.events!.status !== "canceled")
      .sort((a, b) => a.events!.starts_at.localeCompare(b.events!.starts_at))
      .slice(0, 10)
      .map((row) => ({
        id: row.events!.id,
        location: row.events!.location,
        permissionRequired: row.events!.permission_required,
        permissionStatus: row.permission_status,
        startsAt: row.events!.starts_at,
        title: row.events!.title,
      }));
    const recent = rows
      .filter((row) => row.status === "attended")
      .sort((a, b) => b.events!.starts_at.localeCompare(a.events!.starts_at))
      .slice(0, 8)
      .map((row) => ({ id: row.events!.id, startsAt: row.events!.starts_at, title: row.events!.title }));
    const clubs = (memberships ?? [])
      .filter((row) => row.student_roster_id === roster.id && row.clubs && row.clubs.status === "active")
      .map((row) => ({ id: row.clubs!.id, name: row.clubs!.name, role: row.role }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      clubs,
      displayName: `${roster.preferred_name?.trim() || roster.first_name} ${roster.last_name}`.trim(),
      gradeLevel: roster.grade_level,
      homeroom: roster.homeroom,
      recent,
      rosterId: roster.id,
      schoolName: roster.schools?.name ?? null,
      upcoming,
    };
  });
}

// True when this parent account is linked to this student.
export async function isParentOf(parentProfileId: string, rosterId: string) {
  const { data } = await createAdminClient()
    .from("parent_links")
    .select("id")
    .eq("parent_profile_id", parentProfileId)
    .eq("student_roster_id", rosterId)
    .maybeSingle<{ id: string }>();

  return Boolean(data);
}

export type FamilyPortfolioEntry = {
  body: string | null;
  entry_date: string;
  id: string;
  kind: string;
  media_paths: string[];
  title: string;
};

// What a parent sees of their child's portfolio: the same as a teacher, i.e.
// entries the student shared with staff or the school. Private entries and
// drafts stay with the student.
export const PARENT_VISIBLE_PORTFOLIO = ["staff", "school"] as const;

export async function getChildPortfolio(rosterId: string) {
  const { data } = await createAdminClient()
    .from("portfolio_entries")
    .select("id, kind, title, body, entry_date, media_paths")
    .eq("student_roster_id", rosterId)
    .eq("is_draft", false)
    .in("visibility", [...PARENT_VISIBLE_PORTFOLIO])
    .order("entry_date", { ascending: false })
    .limit(60)
    .returns<FamilyPortfolioEntry[]>();

  return data ?? [];
}
