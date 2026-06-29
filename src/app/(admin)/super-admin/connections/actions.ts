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

const PAGE_PATH = "/super-admin/connections";

type ConnectionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked"
  | "archived";

type ExistingConnection = {
  id: string;
  receiver_school_id: string;
  requester_school_id: string;
  status: ConnectionStatus;
};

type CreatedConnection = {
  id: string;
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
  const { data: createdConnection, error } = await admin
    .from("school_connections")
    .insert({
      requester_school_id: requesterSchoolId,
      receiver_school_id: receiverSchoolId,
      requested_by_profile_id: platformAdmin.id,
      responded_by_profile_id:
        status === "approved" ? platformAdmin.id : null,
      responded_at: status === "approved" ? now : null,
      status,
      updated_at: now,
    })
    .select("id")
    .single<CreatedConnection>();

  if (error || !createdConnection) {
    redirectWithMessage(
      "error",
      error?.code === "23505"
        ? i18n.t("superAdmin.connections.errors.connectionExists")
        : i18n.tf("superAdmin.connections.errors.createFailed", {
            error: error?.message ?? i18n.t("common.error"),
          }),
    );
  }

  await createPlatformAuditLog({
    action: "platform.connection.created",
    actor: platformAdmin,
    metadata: {
      connection_status: status,
      receiver_school_id: receiverSchoolId,
      requester_school_id: requesterSchoolId,
    },
    targetId: createdConnection.id,
    targetSchoolId: receiverSchoolId,
    targetType: "school_connection",
  });

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
  const { data: previousConnection } = await admin
    .from("school_connections")
    .select("id, requester_school_id, receiver_school_id, status")
    .eq("id", connectionId)
    .maybeSingle<ExistingConnection>();
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

  await createPlatformAuditLog({
    action: platformConnectionAction(decision),
    actor: platformAdmin,
    metadata: {
      connection_status: nextStatus,
      previous_status: previousConnection?.status ?? currentStatus,
      receiver_school_id: previousConnection?.receiver_school_id ?? null,
      requester_school_id: previousConnection?.requester_school_id ?? null,
    },
    targetId: connectionId,
    targetSchoolId: previousConnection?.receiver_school_id ?? null,
    targetType: "school_connection",
  });

  revalidatePlatformConnectionPages();
  redirectWithMessage("success", i18n.t("superAdmin.connections.success.updated"));
}

function revalidatePlatformConnectionPages() {
  revalidatePath("/super-admin");
  revalidatePath(PAGE_PATH);
  revalidatePath("/super-admin/audit-log");
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

function platformConnectionAction(decision: string) {
  if (decision === "approve") {
    return "platform.connection.approved";
  }

  if (decision === "reject") {
    return "platform.connection.rejected";
  }

  return "platform.connection.revoked";
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}
