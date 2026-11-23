import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

type ClassmateRoster = {
  first_name: string;
  id: string;
  last_name: string;
  preferred_name: string | null;
};

// «Б. Болд»: family-name initial, then the given (or preferred) name. The same
// form get_club_classmates returns, so clubs and events read alike.
export function classmateDisplayName(roster: Pick<ClassmateRoster, "first_name" | "last_name" | "preferred_name">) {
  const given = roster.preferred_name?.trim() || roster.first_name.trim();
  const initial = Array.from(roster.last_name.trim())[0]?.toUpperCase();

  return initial ? `${initial}. ${given}` : given;
}

// Classmates of the signed-in student among the given rosters (e.g. the
// students going to an event). Same rules as get_club_classmates: same school
// and homeroom, active, never the student themselves, and only students who
// let classmates see their name. Read with the service role after the caller
// has established that the viewer is this student.
export async function getClassmatesAmong(
  admin: Admin,
  viewer: { profileId: string; schoolId: string },
  rosterIds: string[],
) {
  if (!rosterIds.length) return [];

  const { data: me } = await admin
    .from("student_rosters")
    .select("id, homeroom")
    .eq("profile_id", viewer.profileId)
    .eq("school_id", viewer.schoolId)
    .eq("status", "active")
    .maybeSingle<{ homeroom: string | null; id: string }>();
  const homeroom = me?.homeroom?.trim();

  if (!me || !homeroom) return [];

  const ids = Array.from(new Set(rosterIds)).filter((id) => id !== me.id);

  if (!ids.length) return [];

  const { data: rows } = await admin
    .from("student_rosters")
    .select("id, first_name, last_name, preferred_name, homeroom")
    .eq("school_id", viewer.schoolId)
    .eq("status", "active")
    .eq("show_name_to_classmates", true)
    .in("id", ids)
    .returns<Array<ClassmateRoster & { homeroom: string | null }>>();

  return (rows ?? [])
    .filter((row) => row.homeroom?.trim().toLowerCase() === homeroom.toLowerCase())
    .map(classmateDisplayName)
    .sort((a, b) => a.localeCompare(b));
}
