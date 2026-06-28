"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
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

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function createAnnouncement(
  _state: CreateAnnouncementState,
  formData: FormData,
): Promise<CreateAnnouncementState> {
  const i18n = await getServerI18n();
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    return {
      message: i18n.t("announcements.errors.staffOnlyCreate"),
      success: false,
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();

  if (!title) {
    return {
      message: i18n.t("announcements.errors.titleRequired"),
      success: false,
    };
  }

  if (!body) {
    return {
      message: i18n.t("announcements.errors.bodyRequired"),
      success: false,
    };
  }

  if (!["active", "archived"].includes(status)) {
    return {
      message: i18n.t("announcements.errors.invalidStatus"),
      success: false,
    };
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
      message: i18n.tf("announcements.errors.createFailed", {
        error: error.message,
      }),
      success: false,
    };
  }

  revalidatePath("/announcements");

  return { message: i18n.t("announcements.success.created"), success: true };
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

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}
