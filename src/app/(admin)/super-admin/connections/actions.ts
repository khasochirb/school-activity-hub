"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_PATH = "/super-admin/connections";

type ConnectionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked"
  | "archived";

type ExistingConnection = {
  id: string;
  status: ConnectionStatus;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function createPlatformConnection(formData: FormData) {
  const platformAdmin = await requirePlatformAdmin();
  const i18n = await getServerI18n();
  const requesterSchoolId = String(
    formData.get("requester_school_id") ?? "",
  ).trim();
  const receiverSchoolId = String(
    formData.get("receiver_school_id") ?? "",
  ).trim();
  const statusInput = String(formData.get("status") ?? "pending").trim();
  const status = statusInput === "approved" ? "approved" : "pending";

  if (!isUuid(requesterSchoolId) || !isUuid(receiverSchoolId)) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.connections.errors.schoolsRequired"),
    );
  }

  if (requesterSchoolId === receiverSchoolId) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.connections.errors.selfConnection"),
    );
  }

  const admin = createAdminClient();
  const { data: existingConnection } = await admin
    .from("school_connections")
    .select("id, status")
    .or(connectionPairFilter(requesterSchoolId, receiverSchoolId))
    .maybeSingle<ExistingConnection>();

  if (existingConnection) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.connections.errors.connectionExists"),
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("school_connections").insert({
    requester_school_id: requesterSchoolId,
    receiver_school_id: receiverSchoolId,
    requested_by_profile_id: platformAdmin.id,
    responded_by_profile_id:
      status === "approved" ? platformAdmin.id : null,
    responded_at: status === "approved" ? now : null,
    status,
    updated_at: now,
  });

  if (error) {
    redirectWithMessage(
      "error",
      error.code === "23505"
        ? i18n.t("superAdmin.connections.errors.connectionExists")
        : i18n.tf("superAdmin.connections.errors.createFailed", {
            error: error.message,
          }),
    );
  }

  revalidatePlatformConnectionPages();
  redirectWithMessage("success", i18n.t("superAdmin.connections.success.created"));
}

export async function updatePlatformConnectionStatus(formData: FormData) {
  const platformAdmin = await requirePlatformAdmin();
  const i18n = await getServerI18n();
  const connectionId = String(formData.get("connection_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const nextStatus =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : decision === "revoke"
          ? "archived"
          : null;
  const currentStatus =
    decision === "approve" || decision === "reject"
      ? "pending"
      : decision === "revoke"
        ? "approved"
        : null;

  if (!isUuid(connectionId) || !nextStatus || !currentStatus) {
    redirectWithMessage(
      "error",
      i18n.t("superAdmin.connections.errors.invalidAction"),
    );
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("school_connections")
    .update({
      responded_at: now,
      responded_by_profile_id: platformAdmin.id,
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", connectionId)
    .eq("status", currentStatus);

  if (error) {
    redirectWithMessage(
      "error",
      i18n.tf("superAdmin.connections.errors.updateFailed", {
        error: error.message,
      }),
    );
  }

  revalidatePlatformConnectionPages();
  redirectWithMessage("success", i18n.t("superAdmin.connections.success.updated"));
}

function revalidatePlatformConnectionPages() {
  revalidatePath("/super-admin");
  revalidatePath(PAGE_PATH);
}

function connectionPairFilter(schoolA: string, schoolB: string) {
  return [
    `and(requester_school_id.eq.${schoolA},receiver_school_id.eq.${schoolB})`,
    `and(requester_school_id.eq.${schoolB},receiver_school_id.eq.${schoolA})`,
  ].join(",");
}

function redirectWithMessage(type: "error" | "success", message: string): never {
  redirect(`${PAGE_PATH}?${type}=${encodeURIComponent(message)}`);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
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
