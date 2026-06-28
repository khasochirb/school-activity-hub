"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type UpdateSchoolSettingsState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function updateSchoolSettings(
  _state: UpdateSchoolSettingsState,
  formData: FormData,
): Promise<UpdateSchoolSettingsState> {
  const i18n = await getServerI18n();
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    return {
      message: i18n.t("settings.errors.updateStaffOnly"),
      success: false,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();

  if (!name) {
    return { message: i18n.t("settings.errors.nameRequired"), success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({ name, province: province || null })
    .eq("id", profile.school_id);

  if (error) {
    return {
      message: i18n.tf("settings.errors.updateFailed", {
        error: error.message,
      }),
      success: false,
    };
  }

  revalidatePath("/settings");

  return { message: i18n.t("settings.success.updated"), success: true };
}

async function getCurrentSchoolAdminProfile(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (!profile || profile.role !== "school_admin") {
    return null;
  }

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
