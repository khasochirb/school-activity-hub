"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logServerError } from "@/lib/errors/server-error";
import { toSlug } from "@/lib/slug";
import { timeServer } from "@/lib/server-timing";
import { notify } from "@/lib/notifications/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type ClubRequest = {
  id: string;
  category: string | null;
  description: string | null;
  school_id: string;
  status: "pending" | "approved" | "rejected" | "archived";
  title: string;
};

export async function supportClubRequest(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/club-requests");
  }

  const requestId = String(formData.get("club_request_id") ?? "").trim();

  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  const { data: request } = await timeServer(
    "club-requests.action.support.request",
    () =>
      supabase
        .from("club_requests")
        .select("id")
        .eq("id", requestId)
        .eq("school_id", profile.school_id)
        .eq("status", "pending")
        .maybeSingle<{ id: string }>(),
  );

  if (!request) {
    return;
  }

  await timeServer("club-requests.action.support.upsert", () =>
    supabase.from("club_request_supports").upsert(
      {
        club_request_id: request.id,
        profile_id: profile.id,
      },
      {
        ignoreDuplicates: true,
        onConflict: "club_request_id,profile_id",
      },
    ),
  );

  revalidateClubRequestPaths();
}

export async function removeClubRequestSupport(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/club-requests");
  }

  const requestId = String(formData.get("club_request_id") ?? "").trim();

  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("club-requests.action.support.delete", () =>
    supabase
      .from("club_request_supports")
      .delete()
      .eq("club_request_id", requestId)
      .eq("profile_id", profile.id),
  );

  revalidateClubRequestPaths();
}

// School admins decide on club proposals and choose the supervising teacher.
export async function approveClubRequest(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "school_admin") {
    redirect("/club-requests");
  }

  const requestId = String(formData.get("club_request_id") ?? "").trim();
  const advisorId = String(formData.get("advisor_profile_id") ?? "").trim();

  if (!requestId) {
    return;
  }

  const admin = createAdminClient();
  const advisor = advisorId
    ? (
        await admin
          .from("profiles")
          .select("id")
          .eq("id", advisorId)
          .eq("school_id", profile.school_id)
          .eq("status", "active")
          .in("role", ["teacher", "school_admin"])
          .maybeSingle<{ id: string }>()
      ).data
    : null;

  const supabase = await createClient();
  const { data: request } = await timeServer(
    "club-requests.action.approve.request",
    () =>
      supabase
        .from("club_requests")
        .select("id, school_id, title, description, category, status")
        .eq("id", requestId)
        .eq("school_id", profile.school_id)
        .eq("status", "pending")
        .maybeSingle<ClubRequest>(),
  );

  if (!request) {
    return;
  }

  const slug = await createUniqueClubSlug(supabase, request.title, profile.school_id);

  if (!slug) {
    return;
  }

  const { data: club, error: clubError } = await timeServer(
    "club-requests.action.approve.create-club",
    () =>
      supabase
        .from("clubs")
        .insert({
          school_id: profile.school_id,
          created_by_profile_id: profile.id,
          name: request.title,
          slug,
          description: request.description,
          category: request.category,
          status: "active",
          advisor_profile_id: advisor?.id ?? null,
        })
        .select("id")
        .single<{ id: string }>(),
  );

  if (clubError || !club) {
    logServerError("Club request approval club insert failed", clubError);
    return;
  }

  const { error: updateError } = await timeServer(
    "club-requests.action.approve.update-request",
    () =>
      supabase
        .from("club_requests")
        .update({
          reviewed_by_profile_id: profile.id,
          converted_club_id: club.id,
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("school_id", profile.school_id)
        .eq("status", "pending"),
  );

  if (updateError) {
    logServerError("Club request approval update failed", updateError);
  }

  await startClubWithFounders(admin, {
    clubId: club.id,
    approvedBy: profile.id,
    requestId: request.id,
    schoolId: profile.school_id,
    title: request.title,
  });

  revalidateClubRequestPaths();
}

// The founders who confirmed become the club's first members: the proposer as
// leader, the others as members. Then every founder is told.
async function startClubWithFounders(
  admin: ReturnType<typeof createAdminClient>,
  {
    approvedBy,
    clubId,
    requestId,
    schoolId,
    title,
  }: { approvedBy: string; clubId: string; requestId: string; schoolId: string; title: string },
) {
  const { data: founders } = await admin
    .from("club_request_founders")
    .select("profile_id, is_proposer")
    .eq("club_request_id", requestId)
    .eq("status", "confirmed")
    .returns<Array<{ is_proposer: boolean; profile_id: string }>>();

  if (!founders?.length) return;

  const { data: rosters } = await admin
    .from("student_rosters")
    .select("id, profile_id")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .in("profile_id", founders.map((founder) => founder.profile_id))
    .returns<Array<{ id: string; profile_id: string }>>();
  const rosterByProfile = new Map((rosters ?? []).map((roster) => [roster.profile_id, roster.id]));
  const memberships = founders
    .filter((founder) => rosterByProfile.has(founder.profile_id))
    .map((founder) => ({
      club_id: clubId,
      created_by_profile_id: approvedBy,
      role: founder.is_proposer ? "leader" : "member",
      school_id: schoolId,
      status: "active",
      student_roster_id: rosterByProfile.get(founder.profile_id),
    }));

  if (memberships.length) {
    const { error } = await admin
      .from("club_memberships")
      .upsert(memberships, { onConflict: "club_id,student_roster_id" });

    if (error) logServerError("Founding memberships insert failed", error, { clubId });
  }

  await notify(
    admin,
    founders.map((founder) => ({
      data: { club: title },
      kind: "proposal_approved" as const,
      link: `/clubs/${clubId}`,
      recipientProfileId: founder.profile_id,
      schoolId,
    })),
  );
}

export async function rejectClubRequest(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "school_admin") {
    redirect("/club-requests");
  }

  const requestId = String(formData.get("club_request_id") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  const { data: rejected } = await timeServer("club-requests.action.reject.update", () =>
    supabase
      .from("club_requests")
      .update({
        reviewed_by_profile_id: profile.id,
        rejection_reason: rejectionReason || null,
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("school_id", profile.school_id)
      .eq("status", "pending")
      .select("id, title")
      .maybeSingle<{ id: string; title: string }>(),
  );

  if (rejected) {
    const admin = createAdminClient();
    const { data: founders } = await admin
      .from("club_request_founders")
      .select("profile_id")
      .eq("club_request_id", rejected.id)
      .eq("status", "confirmed")
      .returns<Array<{ profile_id: string }>>();

    await notify(
      admin,
      (founders ?? []).map((founder) => ({
        data: { club: rejected.title, reason: rejectionReason || "—" },
        kind: "proposal_rejected" as const,
        link: "/club-requests",
        recipientProfileId: founder.profile_id,
        schoolId: profile.school_id,
      })),
    );
  }

  revalidateClubRequestPaths();
}

export async function archiveClubRequest(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    redirect("/club-requests");
  }

  const requestId = String(formData.get("club_request_id") ?? "").trim();

  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("club-requests.action.archive.update", () =>
    supabase
      .from("club_requests")
      .update({ status: "archived" })
      .eq("id", requestId)
      .eq("school_id", profile.school_id)
      .neq("status", "archived"),
  );

  revalidateClubRequestPaths();
}

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("club-requests.action.current-profile.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer(
    "club-requests.action.current-profile.profile",
    () =>
      supabase
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", user.id)
        .eq("status", "active")
        .maybeSingle<Profile>(),
  );

  return profile;
}

async function createUniqueClubSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  schoolId: string,
) {
  const baseSlug = toSlug(title) || "club";

  if (baseSlug.length < 3) {
    return null;
  }

  const { data: existingClubs } = await timeServer(
    "club-requests.action.approve.existing-slugs",
    () =>
      supabase
        .from("clubs")
        .select("slug")
        .eq("school_id", schoolId)
        .like("slug", `${baseSlug}%`)
        .returns<Array<{ slug: string }>>(),
  );
  const existingSlugs = new Set((existingClubs ?? []).map((club) => club.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const slug = `${baseSlug}-${suffix}`;

    if (!existingSlugs.has(slug)) {
      return slug;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`.slice(0, 64);
}

function isStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

function revalidateClubRequestPaths() {
  revalidatePath("/club-requests");
  revalidatePath("/clubs");
  revalidatePath("/approvals");
}

