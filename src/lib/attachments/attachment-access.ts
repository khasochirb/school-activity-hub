import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttachmentOwnerType } from "./attachments";

export type AttachmentAccess = {
  actorId: string;
  canManage: boolean;
  canView: boolean;
  schoolId: string;
};

type Actor = { id: string; role: string; school_id: string };

// Who may see and who may manage the files of one club, event or
// announcement. Always the signed-in person's own school only; parents get
// nothing (they see their child through the family pages).
//   club:         see if active (or staff, or a member); manage if school
//                 admin, teacher, the club's leader or its supervising teacher
//   event:        see if approved or completed (or staff, or its creator);
//                 manage if school admin, teacher or its creator
//   announcement: see if active (or staff); manage if school admin or teacher
export async function getAttachmentAccess(
  ownerType: AttachmentOwnerType,
  ownerId: string,
): Promise<AttachmentAccess | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: actor } = await admin
    .from("profiles")
    .select("id, role, school_id")
    .eq("id", user.id)
    .eq("status", "active")
    .maybeSingle<Actor>();

  if (!actor || !["school_admin", "teacher", "student"].includes(actor.role)) return null;

  const staff = actor.role === "school_admin" || actor.role === "teacher";
  const result = (canView: boolean, canManage: boolean): AttachmentAccess => ({
    actorId: actor.id,
    canManage,
    canView: canView || canManage,
    schoolId: actor.school_id,
  });

  if (ownerType === "club") {
    const { data: club } = await admin
      .from("clubs")
      .select("id, school_id, status, advisor_profile_id")
      .eq("id", ownerId)
      .maybeSingle<{ advisor_profile_id: string | null; id: string; school_id: string; status: string }>();

    if (!club || club.school_id !== actor.school_id) return null;

    const membership = staff ? null : await myMembership(admin, actor, club.id);
    const isLeader = membership?.role === "leader";

    return result(
      club.status === "active" || staff || Boolean(membership),
      staff || isLeader || club.advisor_profile_id === actor.id,
    );
  }

  if (ownerType === "event") {
    const { data: event } = await admin
      .from("events")
      .select("id, school_id, status, created_by_profile_id")
      .eq("id", ownerId)
      .maybeSingle<{ created_by_profile_id: string | null; id: string; school_id: string; status: string }>();

    if (!event || event.school_id !== actor.school_id) return null;

    const isCreator = event.created_by_profile_id === actor.id;

    return result(["approved", "completed"].includes(event.status) || staff || isCreator, staff || isCreator);
  }

  const { data: announcement } = await admin
    .from("announcements")
    .select("id, school_id, status")
    .eq("id", ownerId)
    .maybeSingle<{ id: string; school_id: string; status: string }>();

  if (!announcement || announcement.school_id !== actor.school_id) return null;

  return result(announcement.status === "active" || staff, staff);
}

async function myMembership(admin: ReturnType<typeof createAdminClient>, actor: Actor, clubId: string) {
  const { data: roster } = await admin
    .from("student_rosters")
    .select("id")
    .eq("profile_id", actor.id)
    .eq("school_id", actor.school_id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!roster) return null;

  const { data } = await admin
    .from("club_memberships")
    .select("role")
    .eq("club_id", clubId)
    .eq("student_roster_id", roster.id)
    .eq("status", "active")
    .maybeSingle<{ role: "leader" | "member" }>();

  return data;
}

export type AttachmentRow = {
  content_type: string;
  created_at: string;
  file_name: string;
  id: string;
  size_bytes: number;
};

export async function listAttachments(ownerType: AttachmentOwnerType, ownerId: string, schoolId: string) {
  const { data } = await createAdminClient()
    .from("attachments")
    .select("id, file_name, content_type, size_bytes, created_at")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .eq("school_id", schoolId)
    .order("created_at")
    .returns<AttachmentRow[]>();

  return data ?? [];
}
