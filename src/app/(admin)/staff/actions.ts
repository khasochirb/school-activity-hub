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

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type CreateTeacherState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function createTeacher(
  _state: CreateTeacherState,
  formData: FormData,
): Promise<CreateTeacherState> {
  const i18n = await getServerI18n();
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    return {
      message: i18n.t("staff.errors.staffOnlyCreate"),
      success: false,
    };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) {
    return {
      message: i18n.t("staff.errors.fullNameRequired"),
      success: false,
    };
  }

  if (!email) {
    return { message: i18n.t("staff.errors.emailRequired"), success: false };
  }

  if (password.length < 8) {
    return {
      message: i18n.t("staff.errors.passwordMinLength"),
      success: false,
    };
  }

  const admin = createAdminClient();
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

  if (authError || !authData.user) {
    return {
      message: i18n.t("staff.errors.teacherCreateFailed"),
      success: false,
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    school_id: profile.school_id,
    role: "teacher",
    status: "active",
    full_name: fullName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);

    return {
      message:
        profileError.code === "23505"
          ? i18n.t("staff.errors.duplicateProfile")
          : i18n.tf("staff.errors.profileCreateFailed", {
              error: i18n.t("common.somethingWentWrong"),
            }),
      success: false,
    };
  }

  revalidatePath("/staff");

  return { message: i18n.t("staff.success.created"), success: true };
}

export async function updateTeacherStatus(formData: FormData) {
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const teacherProfileId = String(formData.get("profile_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (
    !teacherProfileId ||
    teacherProfileId === profile.id ||
    !["active", "inactive"].includes(status)
  ) {
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ status })
    .eq("id", teacherProfileId)
    .eq("school_id", profile.school_id)
    .eq("role", "teacher");

  revalidatePath("/staff");
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
