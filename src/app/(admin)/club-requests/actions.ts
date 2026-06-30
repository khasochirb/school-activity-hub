"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseActivityCategory } from "@/lib/activity-categories";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
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

export type CreateClubRequestState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
};

const MAX_PENDING_STUDENT_REQUESTS = 3;

export async function createClubRequest(
  _state: CreateClubRequestState,
  formData: FormData,
): Promise<CreateClubRequestState> {
  const i18n = await getServerI18n();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    return {
      message: i18n.t("clubRequests.errors.studentsOnlyCreate"),
      success: false,
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryInput = String(formData.get("category") ?? "").trim();
  const category = parseActivityCategory(categoryInput);

  if (!title) {
    return { message: i18n.t("clubRequests.errors.titleRequired"), success: false };
  }

  if (categoryInput && !category) {
    return {
      message: i18n.t("clubRequests.errors.invalidCategory"),
      success: false,
    };
  }

  const supabase = await createClient();
  const { count } = await timeServer("club-requests.action.create.pending-count", () =>
    supabase
      .from("club_requests")
      .select("id", { count: "exact", head: true })
      .eq("school_id", profile.school_id)
      .eq("created_by_profile_id", profile.id)
      .eq("status", "pending"),
  );

  if ((count ?? 0) >= MAX_PENDING_STUDENT_REQUESTS) {
    return {
      message: i18n.t("clubRequests.errors.tooManyPending"),
      success: false,
    };
  }

  const { data: request, error } = await timeServer(
    "club-requests.action.create.insert",
    () =>
      supabase
        .from("club_requests")
        .insert({
          school_id: profile.school_id,
          created_by_profile_id: profile.id,
          title,
          description: description || null,
          category: category || null,
          status: "pending",
        })
        .select("id")
        .single<{ id: string }>(),
  );

  if (error || !request) {
    console.error("Club request creation failed", error);
    return {
      message: i18n.t("clubRequests.errors.createFailed"),
      success: false,
    };
  }

  await timeServer("club-requests.action.create.auto-support", () =>
    supabase.from("club_request_supports").insert({
      club_request_id: request.id,
      profile_id: profile.id,
    }),
  );

  revalidateClubRequestPaths();

  return {
    message: i18n.t("clubRequests.success.created"),
    success: true,
  };
}

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

export async function approveClubRequest(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    redirect("/club-requests");
  }

  const requestId = String(formData.get("club_request_id") ?? "").trim();

  if (!requestId) {
    return;
  }

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
        })
        .select("id")
        .single<{ id: string }>(),
  );

  if (clubError || !club) {
    console.error("Club request approval club insert failed", clubError);
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
    console.error("Club request approval update failed", updateError);
  }

  revalidateClubRequestPaths();
}

export async function rejectClubRequest(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    redirect("/club-requests");
  }

  const requestId = String(formData.get("club_request_id") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("club-requests.action.reject.update", () =>
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
      .eq("status", "pending"),
  );

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

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return { t };
}

async function createUniqueClubSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  schoolId: string,
) {
  const baseSlug = toSlug(title);

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
}

function toSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "club";
}
