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

const SCHOOL_STATUS_VALUES = ["active", "archived"] as const;
const PROFILE_STATUS_VALUES = ["active", "inactive"] as const;

type SchoolStatus = (typeof SCHOOL_STATUS_VALUES)[number];
type ProfileStatus = (typeof PROFILE_STATUS_VALUES)[number];

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

type SchoolRow = {
  id: string;
  name: string;
  province: string | null;
  slug: string;
  status: SchoolStatus;
};

type SchoolAdminRow = {
  full_name: string;
  id: string;
  status: ProfileStatus;
};

export async function updatePlatformSchool(formData: FormData) {
  const platformAdmin = await requirePlatformAdmin();

  const i18n = await getServerI18n();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const statusInput = String(formData.get("status") ?? "").trim();
  const status = parseSchoolStatus(statusInput);

  if (!isUuid(schoolId)) {
    redirect("/super-admin/schools");
  }

  if (!name) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.t("superAdmin.schoolDetail.errors.nameRequired"),
    );
  }

  if (!status) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.t("superAdmin.schoolDetail.errors.invalidStatus"),
    );
  }

  const admin = createAdminClient();
  const { data: previousSchool } = await admin
    .from("schools")
    .select("id, name, slug, province, status")
    .eq("id", schoolId)
    .maybeSingle<SchoolRow>();

  const { error } = await admin
    .from("schools")
    .update({
      name,
      province: province || null,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId);

  if (error) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.tf("superAdmin.schoolDetail.errors.updateFailed", {
        error: error.message,
      }),
    );
  }

  await createPlatformAuditLog({
    action: "platform.school.updated",
    actor: platformAdmin,
    metadata: {
      new_name: name,
      new_province: province || null,
      new_status: status,
      previous_name: previousSchool?.name ?? null,
      previous_province: previousSchool?.province ?? null,
      previous_status: previousSchool?.status ?? null,
      school_slug: previousSchool?.slug ?? null,
    },
    targetId: schoolId,
    targetSchoolId: schoolId,
    targetType: "school",
  });

  revalidateSchoolPages(schoolId);
  redirectWithMessage(
    schoolId,
    "success",
    i18n.t("superAdmin.schoolDetail.success.updated"),
  );
}

export async function createPlatformSchoolAdmin(formData: FormData) {
  const platformAdmin = await requirePlatformAdmin();

  const i18n = await getServerI18n();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isUuid(schoolId)) {
    redirect("/super-admin/schools");
  }

  if (!fullName) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.t("superAdmin.schoolDetail.errors.adminFullNameRequired"),
    );
  }

  if (!email) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.t("superAdmin.schoolDetail.errors.adminEmailRequired"),
    );
  }

  if (password.length < 8) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.t("auth.errors.passwordMinLength"),
    );
  }

  const admin = createAdminClient();
  const { data: school } = await admin
    .from("schools")
    .select("id, name, slug, province, status")
    .eq("id", schoolId)
    .maybeSingle<SchoolRow>();

  if (!school) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.t("superAdmin.schoolDetail.errors.schoolNotFound"),
    );
  }

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
    redirectWithMessage(
      schoolId,
      "error",
      isExistingAuthUserError(authError?.message)
        ? i18n.t("superAdmin.schoolDetail.errors.adminAlreadyExists")
        : i18n.tf("superAdmin.schoolDetail.errors.adminCreateFailed", {
            error: authError?.message ?? i18n.t("common.error"),
          }),
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    school_id: schoolId,
    role: "school_admin",
    status: "active",
    full_name: fullName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);

    redirectWithMessage(
      schoolId,
      "error",
      profileError.code === "23505"
        ? i18n.t("superAdmin.schoolDetail.errors.adminAlreadyExists")
        : i18n.tf("superAdmin.schoolDetail.errors.adminProfileFailed", {
            error: profileError.message,
          }),
    );
  }

  await createPlatformAuditLog({
    action: "platform.school_admin.created",
    actor: platformAdmin,
    metadata: {
      school_name: school.name,
      school_slug: school.slug,
      target_admin_email: email,
    },
    targetId: authData.user.id,
    targetSchoolId: schoolId,
    targetType: "profile",
  });

  revalidateSchoolPages(schoolId);
  redirectWithMessage(
    schoolId,
    "success",
    i18n.t("superAdmin.schoolDetail.success.adminCreated"),
  );
}

export async function updatePlatformSchoolAdminStatus(formData: FormData) {
  const platformAdmin = await requirePlatformAdmin();

  const i18n = await getServerI18n();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const statusInput = String(formData.get("status") ?? "").trim();
  const status = parseProfileStatus(statusInput);

  if (!isUuid(schoolId) || !isUuid(profileId) || !status) {
    redirect("/super-admin/schools");
  }

  if (profileId === platformAdmin.id && status === "inactive") {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.t("superAdmin.schoolDetail.errors.cannotDeactivateSelf"),
    );
  }

  const admin = createAdminClient();
  const { data: previousAdminProfile } = await admin
    .from("profiles")
    .select("id, full_name, status")
    .eq("id", profileId)
    .eq("school_id", schoolId)
    .eq("role", "school_admin")
    .maybeSingle<SchoolAdminRow>();

  const { error } = await admin
    .from("profiles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .eq("school_id", schoolId)
    .eq("role", "school_admin");

  if (error) {
    redirectWithMessage(
      schoolId,
      "error",
      i18n.tf("superAdmin.schoolDetail.errors.adminStatusFailed", {
        error: error.message,
      }),
    );
  }

  await createPlatformAuditLog({
    action:
      status === "active"
        ? "platform.school_admin.reactivated"
        : "platform.school_admin.deactivated",
    actor: platformAdmin,
    metadata: {
      new_status: status,
      previous_status: previousAdminProfile?.status ?? null,
      target_admin_name: previousAdminProfile?.full_name ?? null,
    },
    targetId: profileId,
    targetSchoolId: schoolId,
    targetType: "profile",
  });

  revalidateSchoolPages(schoolId);
  redirectWithMessage(
    schoolId,
    "success",
    status === "active"
      ? i18n.t("superAdmin.schoolDetail.success.adminReactivated")
      : i18n.t("superAdmin.schoolDetail.success.adminDeactivated"),
  );
}

function parseSchoolStatus(status: string): SchoolStatus | null {
  return SCHOOL_STATUS_VALUES.includes(status as SchoolStatus)
    ? (status as SchoolStatus)
    : null;
}

function parseProfileStatus(status: string): ProfileStatus | null {
  return PROFILE_STATUS_VALUES.includes(status as ProfileStatus)
    ? (status as ProfileStatus)
    : null;
}

function revalidateSchoolPages(schoolId: string) {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/schools");
  revalidatePath(`/super-admin/schools/${schoolId}`);
  revalidatePath("/super-admin/audit-log");
}

function redirectWithMessage(
  schoolId: string,
  type: "error" | "success",
  message: string,
): never {
  redirect(
    `/super-admin/schools/${schoolId}?${type}=${encodeURIComponent(message)}`,
  );
}

function isExistingAuthUserError(message: string | undefined) {
  return Boolean(
    message && /already|exists|registered|duplicate/i.test(message),
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
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
