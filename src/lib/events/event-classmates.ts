import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type ClassRow = { homeroom: string | null; id: string };

/**
 * How many students from this student's own class are going to an event. Only
 * the number leaves this function. Same rules as public.get_club_classmates:
 * own school and class, active, not themselves, and only classmates who let
 * their class see them. A student with no class recorded gets 0.
 */
export async function countClassmatesGoing(
  admin: ReturnType<typeof createAdminClient>,
  {
    attendeeRosterIds,
    schoolId,
    studentId,
  }: {
    attendeeRosterIds: string[];
    schoolId: string;
    studentId: string;
  },
) {
  const others = new Set(attendeeRosterIds.filter((id) => id !== studentId));

  if (!others.size) return 0;

  const { data: me } = await admin
    .from("student_rosters")
    .select("id, homeroom")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle<ClassRow>();
  const myClass = classKey(me?.homeroom ?? null);

  if (!myClass) return 0;

  // The query narrows to names containing the class; the exact match is below,
  // because class names are free text.
  const { data: rows } = await admin
    .from("student_rosters")
    .select("id, homeroom")
    .eq("school_id", schoolId)
    .ilike("homeroom", `%${myClass.replace(/[%_]/g, "_")}%`)
    .eq("status", "active")
    .eq("show_name_to_classmates", true)
    .returns<ClassRow[]>();

  return (rows ?? []).filter(
    (row) => others.has(row.id) && classKey(row.homeroom) === myClass,
  ).length;
}

function classKey(homeroom: string | null) {
  return (homeroom ?? "").trim().toLowerCase();
}
