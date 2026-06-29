"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPlatformAuditLog } from "@/lib/audit/platform-audit";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateSchoolState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

type NewSchool = {
  id: string;
};

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export async function createPlatformSchool(
  _state: CreateSchoolState,
  formData: FormData,
): Promise<CreateSchoolState> {
  const platformAdmin = await requirePlatformAdmin();

  const i18n = await getServerI18n();
  const name = String(formData.get("name") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const intent = String(formData.get("intent") ?? "school_only");
  const adminFullName = String(formData.get("admin_full_name") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "")
    .trim()
    .toLowerCase();
  const adminPassword = String(formData.get("admin_password") ?? "");
  const hasAnyAdminField = Boolean(
    adminFullName || adminEmail || adminPassword,
  );
  const shouldCreateAdmin =
    intent === "school_and_admin" || hasAnyAdminField;

  if (!name) {
    return {
      message: i18n.t("superAdmin.newSchool.errors.nameRequired"),
      success: false,
    };
  }

  if (!slug) {
    return {
      message: i18n.t("superAdmin.newSchool.errors.slugRequired"),
      success: false,
    };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      message: i18n.t("superAdmin.newSchool.errors.invalidSlug"),
      success: false,
    };
  }

  if (!["active", "archived"].includes(status)) {
    return {
      message: i18n.t("superAdmin.newSchool.errors.invalidStatus"),
      success: false,
    };
  }

  if (shouldCreateAdmin) {
    if (!adminFullName || !adminEmail || !adminPassword) {
      return {
        message: i18n.t("superAdmin.newSchool.errors.adminFieldsRequired"),
        success: false,
      };
    }

    if (adminPassword.length < 8) {
      return {
        message: i18n.t("auth.errors.passwordMinLength"),
        success: false,
      };
    }
  }

  const admin = createAdminClient();
  const { data: existingSchool } = await admin
    .from("schools")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSchool) {
    return {
      message: i18n.t("superAdmin.newSchool.errors.slugExists"),
      success: false,
    };
  }

  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({
      name,
      province: province || null,
      slug,
      status,
    })
    .select("id")
    .single<NewSchool>();

  if (schoolError || !school) {
    return {
      message:
        schoolError?.code === "23505"
          ? i18n.t("superAdmin.newSchool.errors.slugExists")
          : i18n.tf("superAdmin.newSchool.errors.createFailed", {
              error: schoolError?.message ?? i18n.t("common.error"),
            }),
      success: false,
    };
  }

  if (shouldCreateAdmin) {
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName,
        },
      });

    if (authError || !authData.user) {
      await admin.from("schools").delete().eq("id", school.id);

      return {
        message: i18n.tf("superAdmin.newSchool.errors.adminCreateFailed", {
          error: authError?.message ?? i18n.t("common.error"),
        }),
        success: false,
      };
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authData.user.id,
      school_id: school.id,
      role: "school_admin",
      status: "active",
      full_name: adminFullName,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      await admin.from("schools").delete().eq("id", school.id);

      return {
        message: i18n.tf("superAdmin.newSchool.errors.adminProfileFailed", {
          error: profileError.message,
        }),
        success: false,
      };
    }

    await createPlatformAuditLog({
      action: "platform.school_admin.created",
      actor: platformAdmin,
      metadata: {
        school_name: name,
        school_slug: slug,
        target_admin_email: adminEmail,
      },
      targetId: authData.user.id,
      targetSchoolId: school.id,
      targetType: "profile",
    });
  }

  await createPlatformAuditLog({
    action: "platform.school.created",
    actor: platformAdmin,
    metadata: {
      created_school_admin: shouldCreateAdmin,
      school_name: name,
      school_slug: slug,
      school_status: status,
      target_admin_email: shouldCreateAdmin ? adminEmail : null,
    },
    targetId: school.id,
    targetSchoolId: school.id,
    targetType: "school",
  });

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/schools");
  revalidatePath("/super-admin/audit-log");

  redirect(
    `/super-admin/schools?success=${encodeURIComponent(
      i18n.t("superAdmin.newSchool.success.created"),
    )}`,
  );
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}
