"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type CreateAnnouncementState = {
  message: string;
  success: boolean;
};

export async function createAnnouncement(
  _state: CreateAnnouncementState,
  formData: FormData,
): Promise<CreateAnnouncementState> {
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    return {
      message: "Only school admins and teachers can create announcements.",
      success: false,
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();

  if (!title) {
    return { message: "Announcement title is required.", success: false };
  }

  if (!body) {
    return { message: "Announcement body is required.", success: false };
  }

  if (!["active", "archived"].includes(status)) {
    return { message: "Choose a valid announcement status.", success: false };
  }

  const supabase = await createClient();
  const { error } = await timeServer("announcements.action.create.insert", () =>
    supabase.from("announcements").insert({
      school_id: profile.school_id,
      created_by_profile_id: profile.id,
      title,
      body,
      status,
    }),
  );

  if (error) {
    return {
      message: `Announcement could not be created: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/announcements");

  return { message: "Announcement created.", success: true };
}

export async function archiveAnnouncement(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    redirect("/announcements");
  }

  const announcementId = String(formData.get("announcement_id") ?? "").trim();

  if (!announcementId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("announcements.action.archive.update", () =>
    supabase
      .from("announcements")
      .update({ status: "archived" })
      .eq("id", announcementId)
      .eq("school_id", profile.school_id)
      .eq("status", "active"),
  );

  revalidatePath("/announcements");
}

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer(
    "announcements.action.current-profile.auth-get-user",
    () => supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer(
    "announcements.action.current-profile.profile",
    () =>
      supabase
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", user.id)
        .maybeSingle<Profile>(),
  );

  return profile;
}

function isStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}
