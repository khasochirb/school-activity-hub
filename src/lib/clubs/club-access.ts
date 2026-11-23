import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { JoinMode } from "./join-form";

type Admin = ReturnType<typeof createAdminClient>;

export type ClubForAccess = {
  advisor_profile_id: string | null;
  id: string;
  join_mode: JoinMode;
  name: string;
  school_id: string;
  status: string;
};

type Actor = { id: string; role: string; school_id: string | null };

// Who may review a club's join requests and edit its application form:
// the club leader, the supervising teacher, or a school admin of the club's
// school (meeting notes 23 Nov 2026: "The club leader and the club supervisor
// approve join requests"; school admins can always step in).
export async function getClubAccess(admin: Admin, actor: Actor, clubId: string) {
  const { data: club } = await admin
    .from("clubs")
    .select("id, school_id, name, status, advisor_profile_id, join_mode")
    .eq("id", clubId)
    .maybeSingle<ClubForAccess>();

  if (!club || !actor.school_id || club.school_id !== actor.school_id) {
    return null;
  }

  const { data: roster } =
    actor.role === "student"
      ? await admin
          .from("student_rosters")
          .select("id")
          .eq("profile_id", actor.id)
          .eq("school_id", club.school_id)
          .eq("status", "active")
          .maybeSingle<{ id: string }>()
      : { data: null };
  const { data: membership } = roster
    ? await admin
        .from("club_memberships")
        .select("role, status")
        .eq("club_id", club.id)
        .eq("student_roster_id", roster.id)
        .maybeSingle<{ role: "leader" | "member"; status: "active" | "inactive" }>()
    : { data: null };
  const isMember = membership?.status === "active";
  const isLeader = isMember && membership?.role === "leader";
  const isSupervisor = club.advisor_profile_id === actor.id;
  const isSchoolAdmin = actor.role === "school_admin";

  return {
    canReview: isLeader || isSupervisor || isSchoolAdmin,
    club,
    isLeader,
    isMember,
    isSchoolAdmin,
    isSupervisor,
    rosterId: roster?.id ?? null,
  };
}

// The people told about a new request: the club's leaders and its
// supervising teacher.
export async function getClubReviewerIds(admin: Admin, club: ClubForAccess) {
  const { data: leaders } = await admin
    .from("club_memberships")
    .select("student_roster_id")
    .eq("club_id", club.id)
    .eq("role", "leader")
    .eq("status", "active")
    .returns<Array<{ student_roster_id: string }>>();
  const rosterIds = (leaders ?? []).map((row) => row.student_roster_id);
  const { data: rosters } = rosterIds.length
    ? await admin
        .from("student_rosters")
        .select("profile_id")
        .in("id", rosterIds)
        .returns<Array<{ profile_id: string | null }>>()
    : { data: [] };
  const ids = new Set(
    (rosters ?? []).map((row) => row.profile_id).filter((id): id is string => Boolean(id)),
  );

  if (club.advisor_profile_id) ids.add(club.advisor_profile_id);

  return Array.from(ids);
}

// Waiting join and leave requests together, for the club page's badge.
export async function countPendingClubRequests(admin: Admin, clubId: string) {
  const [{ count: joins }, { count: leaves }] = await Promise.all([
    admin
      .from("club_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
    admin
      .from("club_leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
  ]);

  return (joins ?? 0) + (leaves ?? 0);
}

// Who is told about a leave request: the club's leaders and supervising
// teacher except the student leaving, or the school admins when that leaves
// nobody (a club with no other leader and no supervisor).
export async function getLeaveReviewerIds(admin: Admin, club: ClubForAccess, leaverProfileId: string) {
  const reviewers = (await getClubReviewerIds(admin, club)).filter((id) => id !== leaverProfileId);

  if (reviewers.length) return reviewers;

  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("school_id", club.school_id)
    .eq("role", "school_admin")
    .eq("status", "active")
    .returns<Array<{ id: string }>>();

  return (admins ?? []).map((row) => row.id);
}
