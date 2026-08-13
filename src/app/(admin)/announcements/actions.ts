"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canCreateAnnouncementForSchool,
  normalizeAnnouncementValues,
  type AnnouncementFormValues,
  type AnnouncementValidationErrors,
  validateAnnouncementValues,
} from "@/lib/announcements/announcement-create";
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
  status: "active" | "inactive";
};

export type CreateAnnouncementState = {
  fieldErrors: Partial<Record<keyof AnnouncementFormValues, string>>;
  message: string;
  success: boolean;
  values: AnnouncementFormValues;
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
  const values = normalizeAnnouncementValues({
    body: formData.get("body"),
    status: formData.get("status"),
    title: formData.get("title"),
  });
  const profile = await getCurrentProfile();

  if (!profile || !canCreateAnnouncementForSchool(profile, profile.school_id)) {
    return {
      fieldErrors: {},
      message: i18n.t("announcements.errors.staffOnlyCreate"),
      success: false,
      values,
    };
  }

  const validationErrors = validateAnnouncementValues(values);
  const fieldErrors = translateValidationErrors(validationErrors, i18n);
  const firstError = Object.values(fieldErrors)[0];

  if (firstError) {
    return {
      fieldErrors,
      message: firstError,
      success: false,
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await timeServer("announcements.action.create.insert", () =>
    supabase.from("announcements").insert({
      school_id: profile.school_id,
      created_by_profile_id: profile.id,
      title: values.title,
      body: values.body,
      status: values.status,
    }),
  );

  if (error) {
    console.error("Announcement creation failed", {
      code: error.code,
      profileRole: profile.role,
      profileStatus: profile.status,
      schoolId: profile.school_id,
      status: values.status,
    });

    return {
      fieldErrors: {},
      message: i18n.tf("announcements.errors.createFailed", {
        error: i18n.t("common.somethingWentWrong"),
      }),
      success: false,
      values,
    };
  }

  revalidatePath("/announcements");

  return {
    fieldErrors: {},
    message: i18n.t("announcements.success.created"),
    success: true,
    values: { body: "", status: "active", title: "" },
  };
}

export async function archiveAnnouncement(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !canCreateAnnouncementForSchool(profile, profile.school_id)) {
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
        .select("id, school_id, role, status")
        .eq("id", user.id)
        .maybeSingle<Profile>(),
  );

  return profile;
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}

function translateValidationErrors(
  errors: AnnouncementValidationErrors,
  i18n: ServerI18n,
) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, error]) => [
      field,
      i18n.t(`announcements.errors.${error}`),
    ]),
  ) as Partial<Record<keyof AnnouncementFormValues, string>>;
}
