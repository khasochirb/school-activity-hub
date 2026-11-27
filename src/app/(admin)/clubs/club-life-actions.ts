"use server";

import { revalidatePath } from "next/cache";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { getClubAccess } from "@/lib/clubs/club-access";
import { isUuid } from "@/lib/clubs/club-profile";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { notify } from "@/lib/notifications/notify";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClubLifeState = { message: string; success: boolean };

const STATUSES = ["present", "absent", "excused"] as const;

async function managerAccess(clubId: string) {
  const actor = await requireActiveSchoolProfile();

  if (!isUuid(clubId)) return null;

  const admin = createAdminClient();
  const access = await getClubAccess(admin, actor, clubId);

  return access?.canReview ? { access, actor, admin } : null;
}

async function t(key: string) {
  return translate(getDictionary(await getCurrentLocale()), key);
}

// The leader, supervising teacher or a school admin posts an update to the
// club; every member gets a notification.
export async function postToClub(_state: ClubLifeState, formData: FormData): Promise<ClubLifeState> {
  const clubId = String(formData.get("club_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const ctx = await managerAccess(clubId);

  if (!ctx) return { message: await t("clubs.life.errors.notAllowed"), success: false };
  if (!body) return { message: await t("clubs.life.errors.emptyPost"), success: false };
  if (body.length > 2000) return { message: await t("clubs.life.errors.postTooLong"), success: false };

  const { error } = await ctx.admin.from("club_posts").insert({
    author_profile_id: ctx.actor.id,
    body,
    club_id: clubId,
    school_id: ctx.access.club.school_id,
  });

  if (error) {
    logServerError("Club post failed", error, { clubId });
    return { message: await t("clubs.life.errors.saveFailed"), success: false };
  }

  const { data: members } = await ctx.admin
    .from("club_memberships")
    .select("student_roster_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .returns<Array<{ student_roster_id: string }>>();
  const rosterIds = (members ?? []).map((row) => row.student_roster_id);
  const { data: rosters } = rosterIds.length
    ? await ctx.admin
        .from("student_rosters")
        .select("profile_id")
        .in("id", rosterIds)
        .returns<Array<{ profile_id: string | null }>>()
    : { data: [] };
  const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;

  await notify(
    ctx.admin,
    (rosters ?? [])
      .map((row) => row.profile_id)
      .filter((id): id is string => Boolean(id) && id !== ctx.actor.id)
      .map((recipientProfileId) => ({
        data: { club: ctx.access.club.name, preview },
        kind: "club_post" as const,
        link: `/clubs/${clubId}#posts`,
        recipientProfileId,
        schoolId: ctx.access.club.school_id,
      })),
  );

  revalidatePath(`/clubs/${clubId}`);

  return { message: await t("clubs.life.posted"), success: true };
}

export async function deleteClubPost(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");

  if (!isUuid(postId)) return;

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("club_posts")
    .select("id, club_id")
    .eq("id", postId)
    .maybeSingle<{ club_id: string; id: string }>();

  if (!post || !(await managerAccess(post.club_id))) return;

  await admin.from("club_posts").delete().eq("id", post.id);
  revalidatePath(`/clubs/${post.club_id}`);
}

// Saves one meeting's attendance: the date, a note, and present / absent /
// excused for each current member. Saving the same date again updates it.
export async function saveClubMeeting(_state: ClubLifeState, formData: FormData): Promise<ClubLifeState> {
  const clubId = String(formData.get("club_id") ?? "");
  const date = String(formData.get("meeting_date") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const ctx = await managerAccess(clubId);

  if (!ctx) return { message: await t("clubs.life.errors.notAllowed"), success: false };

  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`) : null;
  const tomorrow = Date.now() + 36 * 60 * 60 * 1000;

  if (!day || Number.isNaN(day.getTime()) || day.getTime() > tomorrow) {
    return { message: await t("clubs.life.errors.badDate"), success: false };
  }

  const { data: members } = await ctx.admin
    .from("club_memberships")
    .select("student_roster_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .returns<Array<{ student_roster_id: string }>>();
  const rows = (members ?? [])
    .map((row) => ({ rosterId: row.student_roster_id, status: String(formData.get(`status_${row.student_roster_id}`) ?? "") }))
    .filter((row) => STATUSES.some((status) => status === row.status));

  if (!rows.length) return { message: await t("clubs.life.errors.noMembers"), success: false };

  const { data: meeting, error } = await ctx.admin
    .from("club_meetings")
    .upsert(
      {
        club_id: clubId,
        created_by_profile_id: ctx.actor.id,
        meeting_date: date,
        note,
        school_id: ctx.access.club.school_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "club_id,meeting_date" },
    )
    .select("id")
    .single<{ id: string }>();

  if (error || !meeting) {
    logServerError("Club meeting save failed", error, { clubId });
    return { message: await t("clubs.life.errors.saveFailed"), success: false };
  }

  const { error: attendanceError } = await ctx.admin.from("club_meeting_attendance").upsert(
    rows.map((row) => ({
      marked_at: new Date().toISOString(),
      marked_by_profile_id: ctx.actor.id,
      meeting_id: meeting.id,
      school_id: ctx.access.club.school_id,
      status: row.status,
      student_roster_id: row.rosterId,
    })),
    { onConflict: "meeting_id,student_roster_id" },
  );

  if (attendanceError) {
    logServerError("Club attendance save failed", attendanceError, { clubId });
    return { message: await t("clubs.life.errors.saveFailed"), success: false };
  }

  revalidatePath(`/clubs/${clubId}`);

  return { message: await t("clubs.life.attendanceSaved"), success: true };
}

export async function deleteClubMeeting(formData: FormData) {
  const meetingId = String(formData.get("meeting_id") ?? "");

  if (!isUuid(meetingId)) return;

  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("club_meetings")
    .select("id, club_id")
    .eq("id", meetingId)
    .maybeSingle<{ club_id: string; id: string }>();

  if (!meeting || !(await managerAccess(meeting.club_id))) return;

  await admin.from("club_meetings").delete().eq("id", meeting.id);
  revalidatePath(`/clubs/${meeting.club_id}`);
}
