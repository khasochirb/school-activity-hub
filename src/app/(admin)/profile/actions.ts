"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function updateProfile(
  _state: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const i18n = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!fullName) {
    return {
      message: i18n.t("profile.errors.fullNameRequired"),
      success: false,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return {
      message: i18n.tf("profile.errors.updateFailed", {
        error: error.message,
      }),
      success: false,
    };
  }

  revalidatePath("/profile");

  return { message: i18n.t("profile.success.updated"), success: true };
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}
