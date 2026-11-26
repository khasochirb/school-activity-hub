"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { getClubAccess, getClubReviewerIds } from "@/lib/clubs/club-access";
import {
  collectAnswers,
  parseJoinMode,
  parseQuestions,
  type JoinQuestion,
} from "@/lib/clubs/join-form";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { notify } from "@/lib/notifications/notify";
import { createAdminClient } from "@/lib/supabase/admin";

export type JoinActionState = {
  message: string;
  questionId?: string;
  success: boolean;
};

async function getT() {
  const dictionary = getDictionary(await getCurrentLocale());

  return (key: string) => translate(dictionary, key);
}

function fail(t: (key: string) => string, key: string, questionId?: string): JoinActionState {
  return { message: t(`clubs.join.errors.${key}`), questionId, success: false };
}

function revalidateClub(clubId: string) {
  revalidatePath("/clubs");
  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/apply`);
  revalidatePath(`/clubs/${clubId}/applications`);
}

// A student sends a request to join a club that takes applications.
export async function submitJoinRequest(
  _previous: JoinActionState,
  formData: FormData,
): Promise<JoinActionState> {
  const t = await getT();
  const profile = await requireActiveSchoolProfile();
  const clubId = String(formData.get("club_id") ?? "");

  if (profile.role !== "student") return fail(t, "studentsOnly");

  const admin = createAdminClient();
  const access = await getClubAccess(admin, profile, clubId);

  if (!access || access.club.status !== "active") return fail(t, "clubNotFound");
  if (!access.rosterId) return fail(t, "noRoster");
  if (access.isMember) return fail(t, "alreadyMember");
  if (access.club.join_mode !== "apply") return fail(t, "notTakingApplications");

  const { data: pending } = await admin
    .from("club_join_requests")
    .select("id")
    .eq("club_id", clubId)
    .eq("student_roster_id", access.rosterId)
    .eq("status", "pending")
    .maybeSingle<{ id: string }>();

  if (pending) return fail(t, "alreadyPending");

  const { data: questions } = await admin
    .from("club_join_questions")
    .select("id, prompt, kind, options, required")
    .eq("club_id", clubId)
    .order("position")
    .returns<Array<JoinQuestion & { id: string }>>();
  const result = collectAnswers(questions ?? [], (name) =>
    formData.getAll(name).map((value) => String(value)),
  );

  if (result.error) return fail(t, result.error, result.questionId);

  const { error } = await admin.from("club_join_requests").insert({
    answers: result.answers,
    club_id: clubId,
    profile_id: profile.id,
    school_id: access.club.school_id,
    status: "pending",
    student_roster_id: access.rosterId,
  });

  if (error) {
    logServerError("Club join request insert failed", error, { clubId });
    return fail(t, error.code === "23505" ? "alreadyPending" : "saveFailed");
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
  const reviewers = await getClubReviewerIds(admin, access.club);

  await notify(
    admin,
    reviewers.map((recipientProfileId) => ({
      data: { club: access.club.name, name },
      kind: "join_requested" as const,
      link: `/clubs/${clubId}/applications`,
      recipientProfileId,
      schoolId: access.club.school_id,
    })),
  );

  revalidateClub(clubId);
  redirect(`/clubs/${clubId}?applied=1`);
}

// The student takes back a request nobody has decided yet.
export async function withdrawJoinRequest(formData: FormData) {
  const profile = await requireActiveSchoolProfile();
  const requestId = String(formData.get("request_id") ?? "");
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("club_join_requests")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("profile_id", profile.id)
    .eq("status", "pending")
    .select("club_id")
    .maybeSingle<{ club_id: string }>();

  if (request) revalidateClub(request.club_id);
}

// The club leader, the supervising teacher or a school admin accepts or
// turns down a request.
export async function decideJoinRequest(formData: FormData) {
  const profile = await requireActiveSchoolProfile();
  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;

  if (decision !== "approve" && decision !== "reject") return;

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("club_join_requests")
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

  if (!request || request.status !== "pending") return;

  const access = await getClubAccess(admin, profile, request.club_id);

  if (!access?.canReview) return;

  if (decision === "approve") {
    const { data: existing } = await admin
      .from("club_memberships")
      .select("id, role, status")
      .eq("club_id", request.club_id)
      .eq("student_roster_id", request.student_roster_id)
      .maybeSingle<{ id: string; role: string; status: string }>();
    const { error } = existing
      ? await admin
          .from("club_memberships")
          .update({ status: "active" })
          .eq("id", existing.id)
      : await admin.from("club_memberships").insert({
          club_id: request.club_id,
          created_by_profile_id: profile.id,
          role: "member",
          school_id: request.school_id,
          status: "active",
          student_roster_id: request.student_roster_id,
        });

    if (error) {
      logServerError("Club join approval membership failed", error, { requestId });
      return;
    }
  }

  // Only a still-pending request changes, so two reviewers deciding at once
  // cannot both win.
  const { data: decided } = await admin
    .from("club_join_requests")
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

  if (decided) {
    await notify(admin, [
      {
        data: { club: access.club.name, reason: note ?? "—" },
        kind: decision === "approve" ? "join_approved" : "join_rejected",
        link: `/clubs/${request.club_id}`,
        recipientProfileId: request.profile_id,
        schoolId: request.school_id,
      },
    ]);
  }

  revalidateClub(request.club_id);
}

// Saves how students join (open or by application) and the application form.
export async function saveJoinForm(
  _previous: JoinActionState,
  formData: FormData,
): Promise<JoinActionState> {
  const t = await getT();
  const profile = await requireActiveSchoolProfile();
  const clubId = String(formData.get("club_id") ?? "");
  const joinMode = parseJoinMode(formData.get("join_mode"));
  const parsed = parseQuestions(String(formData.get("questions") ?? "[]"));

  if (!joinMode) return fail(t, "invalidForm");
  if (parsed.error !== undefined) return fail(t, parsed.error);

  const questions = parsed.questions;
  const admin = createAdminClient();
  const access = await getClubAccess(admin, profile, clubId);

  if (!access?.canReview) return fail(t, "notAllowed");

  const { error: modeError } = await admin
    .from("clubs")
    .update({ join_mode: joinMode })
    .eq("id", clubId)
    .eq("school_id", access.club.school_id);

  if (modeError) {
    logServerError("Club join mode update failed", modeError, { clubId });
    return fail(t, "saveFailed");
  }

  // Answers already sent keep their own copy of each question, so the form
  // can be replaced as a whole.
  const { error: deleteError } = await admin
    .from("club_join_questions")
    .delete()
    .eq("club_id", clubId);

  if (deleteError) {
    logServerError("Club join questions delete failed", deleteError, { clubId });
    return fail(t, "saveFailed");
  }

  if (questions.length) {
    const { error } = await admin.from("club_join_questions").insert(
      questions.map((question, position) => ({
        club_id: clubId,
        kind: question.kind,
        options: question.options,
        position,
        prompt: question.prompt,
        required: question.required,
        school_id: access.club.school_id,
      })),
    );

    if (error) {
      logServerError("Club join questions insert failed", error, { clubId });
      return fail(t, "saveFailed");
    }
  }

  revalidateClub(clubId);

  return { message: t("clubs.join.builder.saved"), success: true };
}
