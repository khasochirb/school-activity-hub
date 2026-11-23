"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { getClubAccess, getLeaveReviewerIds } from "@/lib/clubs/club-access";
import { parseLeaveRequest } from "@/lib/clubs/leave-form";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { notify } from "@/lib/notifications/notify";
import { createAdminClient } from "@/lib/supabase/admin";

export type LeaveActionState = {
  message: string;
  success: boolean;
};

async function fail(key: string): Promise<LeaveActionState> {
  const dictionary = getDictionary(await getCurrentLocale());

  return { message: translate(dictionary, `clubs.leave.errors.${key}`), success: false };
}

function revalidateClub(clubId: string) {
  revalidatePath("/clubs");
  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/leave`);
  revalidatePath(`/clubs/${clubId}/applications`);
  revalidatePath("/portfolio");
}

// A member asks to leave, saying why. The membership only ends when the club
// leader, the supervising teacher or a school admin approves.
export async function submitLeaveRequest(
  _previous: LeaveActionState,
  formData: FormData,
): Promise<LeaveActionState> {
  const profile = await requireActiveSchoolProfile();
  const clubId = String(formData.get("club_id") ?? "");

  if (profile.role !== "student") return fail("studentsOnly");

  const parsed = parseLeaveRequest({
    feedback: formData.get("feedback"),
    reason: formData.get("reason"),
    reasonKind: formData.get("reason_kind"),
  });

  if (parsed.error !== undefined) return fail(parsed.error);

  const input = parsed.input;
  const admin = createAdminClient();
  const access = await getClubAccess(admin, profile, clubId);

  if (!access || !access.rosterId) return fail("clubNotFound");
  if (!access.isMember) return fail("notMember");

  const { error } = await admin.from("club_leave_requests").insert({
    club_id: clubId,
    feedback: input.feedback,
    profile_id: profile.id,
    reason: input.reason,
    reason_kind: input.reasonKind,
    school_id: access.club.school_id,
    status: "pending",
    student_roster_id: access.rosterId,
  });

  if (error) {
    logServerError("Club leave request insert failed", error, { clubId });
    return fail(error.code === "23505" ? "alreadyPending" : "saveFailed");
  }

  const { data: roster } = await admin
    .from("student_rosters")
    .select("first_name, last_name, preferred_name, homeroom")
    .eq("id", access.rosterId)
    .maybeSingle<{ first_name: string; homeroom: string | null; last_name: string; preferred_name: string | null }>();
  const name = roster
    ? `${roster.preferred_name?.trim() || roster.first_name} ${roster.last_name}`.trim() +
      (roster.homeroom ? ` (${roster.homeroom})` : "")
    : "";
  const reviewers = await getLeaveReviewerIds(admin, access.club, profile.id);

  await notify(
    admin,
    reviewers.map((recipientProfileId) => ({
      data: { club: access.club.name, name },
      kind: "leave_requested" as const,
      link: `/clubs/${clubId}/applications?tab=leaving`,
      recipientProfileId,
      schoolId: access.club.school_id,
    })),
  );

  revalidateClub(clubId);
  redirect(`/clubs/${clubId}/leave?sent=1`);
}

// The student changes their mind before anyone decides.
export async function withdrawLeaveRequest(formData: FormData) {
  const profile = await requireActiveSchoolProfile();
  const requestId = String(formData.get("request_id") ?? "");
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("club_leave_requests")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("profile_id", profile.id)
    .eq("status", "pending")
    .select("club_id")
    .maybeSingle<{ club_id: string }>();

  if (request) revalidateClub(request.club_id);
}

// The club leader, the supervising teacher or a school admin approves (the
// membership ends) or keeps the student in the club with a message. Nobody
// decides their own request.
export async function decideLeaveRequest(formData: FormData) {
  const profile = await requireActiveSchoolProfile();
  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;

  if (decision !== "approve" && decision !== "reject") return;

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("club_leave_requests")
    .select("id, club_id, school_id, student_roster_id, profile_id, status")
    .eq("id", requestId)
    .maybeSingle<{
      club_id: string;
      id: string;
      profile_id: string;
      school_id: string;
      status: string;
      student_roster_id: string;
    }>();

  if (!request || request.status !== "pending" || request.profile_id === profile.id) return;

  const access = await getClubAccess(admin, profile, request.club_id);

  if (!access?.canReview) return;

  // Only a still-pending request changes, so two reviewers deciding at once
  // cannot both win.
  const { data: decided } = await admin
    .from("club_leave_requests")
    .update({
      decided_at: new Date().toISOString(),
      decided_by_profile_id: profile.id,
      decision_note: note,
      status: decision === "approve" ? "approved" : "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!decided) return;

  if (decision === "approve") {
    const { error } = await admin
      .from("club_memberships")
      .update({ status: "inactive" })
      .eq("club_id", request.club_id)
      .eq("student_roster_id", request.student_roster_id)
      .eq("status", "active");

    if (error) logServerError("Club leave approval membership failed", error, { requestId });
  }

  await notify(admin, [
    {
      data: { club: access.club.name, reason: note ?? "—" },
      kind: decision === "approve" ? "leave_approved" : "leave_rejected",
      link: `/clubs/${request.club_id}`,
      recipientProfileId: request.profile_id,
      schoolId: request.school_id,
    },
  ]);

  revalidateClub(request.club_id);
}
