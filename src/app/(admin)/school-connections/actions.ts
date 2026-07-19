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

const PAGE_PATH = "/school-connections";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type ExistingConnection = {
  id: string;
  status: string;
};

type PendingConnection = {
  id: string;
  receiver_school_id: string;
  status: string;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function requestSchoolConnection(formData: FormData) {
  const i18n = await getServerI18n();
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const receiverSchoolId = String(
    formData.get("receiver_school_id") ?? "",
  ).trim();

  if (!isUuid(receiverSchoolId) || receiverSchoolId === profile.school_id) {
    redirectWithMessage("error", i18n.t("schoolConnections.errors.invalidSchool"));
  }

  const supabase = await createClient();
  const { data: receiverSchool } = await supabase
    .from("schools")
    .select("id")
    .eq("id", receiverSchoolId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!receiverSchool) {
    redirectWithMessage(
      "error",
      i18n.t("schoolConnections.errors.activeSchoolNotFound"),
    );
  }

  const { data: existingConnection } = await supabase
    .from("school_connections")
    .select("id, status")
    .or(connectionPairFilter(profile.school_id, receiverSchoolId))
    .maybeSingle<ExistingConnection>();

  if (existingConnection) {
    redirectWithMessage(
      "error",
      i18n.t("schoolConnections.errors.connectionExists"),
    );
  }

  const { error } = await supabase.from("school_connections").insert({
    requester_school_id: profile.school_id,
    receiver_school_id: receiverSchoolId,
    requested_by_profile_id: profile.id,
    status: "pending",
  });

  if (error) {
    redirectWithMessage(
      "error",
      error.code === "23505"
        ? i18n.t("schoolConnections.errors.connectionExists")
        : i18n.tf("schoolConnections.errors.requestFailed", {
            error: i18n.t("common.somethingWentWrong"),
          }),
    );
  }

  revalidatePath(PAGE_PATH);
  redirectWithMessage("success", i18n.t("schoolConnections.success.requestSent"));
}

export async function respondToSchoolConnection(formData: FormData) {
  const i18n = await getServerI18n();
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const connectionId = String(formData.get("connection_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const nextStatus =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : null;

  if (!isUuid(connectionId) || !nextStatus) {
    redirectWithMessage(
      "error",
      i18n.t("schoolConnections.errors.invalidResponse"),
    );
  }

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("school_connections")
    .select("id, receiver_school_id, status")
    .eq("id", connectionId)
    .maybeSingle<PendingConnection>();

  if (
    !connection ||
    connection.receiver_school_id !== profile.school_id ||
    connection.status !== "pending"
  ) {
    redirectWithMessage(
      "error",
      i18n.t("schoolConnections.errors.pendingRequestNotFound"),
    );
  }

  const { error } = await supabase
    .from("school_connections")
    .update({
      status: nextStatus,
      responded_by_profile_id: profile.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .eq("receiver_school_id", profile.school_id)
    .eq("status", "pending");

  if (error) {
    redirectWithMessage(
      "error",
      i18n.tf("schoolConnections.errors.updateFailed", {
        error: i18n.t("common.somethingWentWrong"),
      }),
    );
  }

  revalidatePath(PAGE_PATH);
  redirectWithMessage(
    "success",
    nextStatus === "approved"
      ? i18n.t("schoolConnections.success.approved")
      : i18n.t("schoolConnections.success.rejected"),
  );
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
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
