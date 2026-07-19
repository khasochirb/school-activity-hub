"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPlatformAuditLog } from "@/lib/audit/platform-audit";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { logServerError } from "@/lib/errors/server-error";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_PATH = "/super-admin/platform-admins";
const PROFILE_STATUS_VALUES = ["active", "inactive"] as const;

type ProfileStatus = (typeof PROFILE_STATUS_VALUES)[number];

type ProfileRow = {
  full_name: string;
  id: string;
  role: "school_admin" | "teacher" | "student";
  school_id: string;
  status: ProfileStatus;
};

type PlatformAdminRow = {
  profile_id: string;
  status: ProfileStatus;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function addPlatformAdmin(formData: FormData) {
  const platformAdmin = await requirePlatformAdmin();
  const i18n = await getServerI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.platformAdmins.errors.emailRequired"),
    );
  }

  const admin = createAdminClient();
  const { error: userLookupError, user } = await findAuthUserByEmail(
    admin,
    email,
  );

  if (userLookupError) {
    redirectWithMessage(
      "error",
      i18n.tf("superAdmin.platformAdmins.errors.lookupFailed", {
        error: i18n.t("common.somethingWentWrong"),
      }),
    );
  }

  if (!user) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.platformAdmins.errors.userNotFound"),
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, school_id, role, status, full_name")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.platformAdmins.errors.profileRequired"),
    );
  }

  const { data: existingPlatformAdmin } = await admin
    .from("platform_admins")
    .select("profile_id, status")
    .eq("profile_id", profile.id)
    .maybeSingle<PlatformAdminRow>();

  if (existingPlatformAdmin) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.platformAdmins.errors.alreadyPlatformAdmin"),
    );
  }

  const { error } = await admin.from("platform_admins").insert({
    profile_id: profile.id,
    status: "active",
  });

  if (error) {
    redirectWithMessage(
      "error",
      error.code === "23505"
        ? i18n.t("superAdmin.platformAdmins.errors.alreadyPlatformAdmin")
        : i18n.tf("superAdmin.platformAdmins.errors.addFailed", {
            error: i18n.t("common.somethingWentWrong"),
          }),
    );
  }

  await createPlatformAuditLog({
    action: "platform.platform_admin.added",
    actor: platformAdmin,
    metadata: {
      school_role: profile.role,
      target_admin_email: email,
      target_admin_name: profile.full_name,
    },
    targetId: profile.id,
    targetSchoolId: profile.school_id,
    targetType: "platform_admin",
  });

  revalidatePlatformAdminPages();
  redirectWithMessage(
    "success",
    i18n.t("superAdmin.platformAdmins.success.added"),
  );
}

export async function updatePlatformAdminStatus(formData: FormData) {
  const platformAdmin = await requirePlatformAdmin();
  const i18n = await getServerI18n();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const status = parseProfileStatus(String(formData.get("status") ?? "").trim());

  if (!isUuid(profileId) || !status) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.platformAdmins.errors.invalidAction"),
    );
  }

  if (profileId === platformAdmin.id && status === "inactive") {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.platformAdmins.errors.cannotDeactivateSelf"),
    );
  }

  const admin = createAdminClient();
  const { data: existingPlatformAdmin } = await admin
    .from("platform_admins")
    .select("profile_id, status")
    .eq("profile_id", profileId)
    .maybeSingle<PlatformAdminRow>();

  if (!existingPlatformAdmin) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.platformAdmins.errors.userNotFound"),
    );
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, school_id, role, status, full_name")
    .eq("id", profileId)
    .maybeSingle<ProfileRow>();

  const { error } = await admin
    .from("platform_admins")
    .update({ status })
    .eq("profile_id", profileId);

  if (error) {
    redirectWithMessage(
      "error",
      i18n.tf("superAdmin.platformAdmins.errors.updateFailed", {
        error: i18n.t("common.somethingWentWrong"),
      }),
    );
  }

  const targetEmail = await getAuthEmailByProfileId(admin, profileId);

  await createPlatformAuditLog({
    action:
      status === "active"
        ? "platform.platform_admin.reactivated"
        : "platform.platform_admin.deactivated",
    actor: platformAdmin,
    metadata: {
      new_status: status,
      previous_status: existingPlatformAdmin.status,
      school_role: targetProfile?.role ?? null,
      target_admin_email: targetEmail,
      target_admin_name: targetProfile?.full_name ?? null,
    },
    targetId: profileId,
    targetSchoolId: targetProfile?.school_id ?? null,
    targetType: "platform_admin",
  });

  revalidatePlatformAdminPages();
  redirectWithMessage(
    "success",
    status === "active"
      ? i18n.t("superAdmin.platformAdmins.success.reactivated")
      : i18n.t("superAdmin.platformAdmins.success.deactivated"),
  );
}

function parseProfileStatus(status: string): ProfileStatus | null {
  return PROFILE_STATUS_VALUES.includes(status as ProfileStatus)
    ? (status as ProfileStatus)
    : null;
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ error: string | null; user: User | null }> {
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      logServerError("Platform admin auth user lookup failed", error);
      return { error: "lookup_failed", user: null };
    }

    const user =
      data.users.find(
        (candidate) => candidate.email?.toLowerCase() === email,
      ) ?? null;

    if (user || data.users.length < perPage) {
      return { error: null, user };
    }
  }

  return { error: null, user: null };
}

async function getAuthEmailByProfileId(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
) {
  const { data, error } = await admin.auth.admin.getUserById(profileId);

  return error ? null : data.user?.email ?? null;
}

function revalidatePlatformAdminPages() {
  revalidatePath("/super-admin");
  revalidatePath(PAGE_PATH);
  revalidatePath("/super-admin/audit-log");
}

function redirectWithMessage(type: "error" | "success", message: string): never {
  redirect(`${PAGE_PATH}?${type}=${encodeURIComponent(message)}`);
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
