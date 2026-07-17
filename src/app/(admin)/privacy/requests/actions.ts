"use server";

import { revalidatePath } from "next/cache";
import {
  requireActiveSchoolProfile,
  requireSchoolAdminForSensitiveWorkflow,
} from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export type DataRightsActionState = {
  message: string;
  success: boolean;
};

const requestTypes = new Set([
  "access",
  "correction",
  "export",
  "deletion_or_deactivation",
  "research_withdrawal",
]);

const processStatuses = new Set([
  "acknowledged",
  "under_review",
  "action_required",
  "completed",
  "denied_with_reason",
]);

const terminalStatuses = new Set([
  "completed",
  "denied_with_reason",
  "withdrawn",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createDataRightsRequest(
  _state: DataRightsActionState,
  formData: FormData,
): Promise<DataRightsActionState> {
  const t = await getServerTranslator();
  const profile = await requireActiveSchoolProfile();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();

  if (!requestTypes.has(requestType)) {
    return fail(t("privacy.requests.errors.typeRequired"));
  }

  if (details.length > 2000) {
    return fail(t("privacy.requests.errors.detailsTooLong"));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("data_rights_requests").insert({
    school_id: profile.school_id,
    requester_profile_id: profile.id,
    request_type: requestType,
    details: details || null,
    status: "submitted",
    status_changed_by_profile_id: profile.id,
  });

  if (error) {
    logServerError("Data-rights request submission failed", error);
    return fail(t("privacy.requests.errors.submitFailed"));
  }

  revalidateRequestPaths();
  return success(t("privacy.requests.success.submitted"));
}

export async function withdrawDataRightsRequest(
  _state: DataRightsActionState,
  formData: FormData,
): Promise<DataRightsActionState> {
  const t = await getServerTranslator();
  const profile = await requireActiveSchoolProfile();
  const requestId = String(formData.get("request_id") ?? "").trim();

  if (!uuidPattern.test(requestId)) {
    return fail(t("privacy.requests.errors.invalidRequest"));
  }

  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase
    .from("data_rights_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("school_id", profile.school_id)
    .eq("requester_profile_id", profile.id)
    .maybeSingle<{ id: string; status: string }>();

  if (requestError) {
    logServerError("Data-rights withdrawal lookup failed", requestError);
    return fail(t("privacy.requests.errors.updateFailed"));
  }

  if (!request || terminalStatuses.has(request.status)) {
    return fail(t("privacy.requests.errors.invalidRequest"));
  }

  const { error } = await supabase
    .from("data_rights_requests")
    .update({ status: "withdrawn" })
    .eq("id", request.id)
    .eq("school_id", profile.school_id)
    .eq("requester_profile_id", profile.id)
    .eq("status", request.status);

  if (error) {
    logServerError("Data-rights request withdrawal failed", error);
    return fail(t("privacy.requests.errors.updateFailed"));
  }

  revalidateRequestPaths();
  return success(t("privacy.requests.success.withdrawn"));
}

export async function processDataRightsRequest(
  _state: DataRightsActionState,
  formData: FormData,
): Promise<DataRightsActionState> {
  const t = await getServerTranslator();
  const profile = await requireSchoolAdminForSensitiveWorkflow();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const responseSummary = String(formData.get("response_summary") ?? "").trim();

  if (!uuidPattern.test(requestId) || !processStatuses.has(status)) {
    return fail(t("privacy.requests.errors.invalidUpdate"));
  }

  if (responseSummary.length > 1000) {
    return fail(t("privacy.requests.errors.responseTooLong"));
  }

  if (status === "denied_with_reason" && !responseSummary) {
    return fail(t("privacy.requests.errors.denialReasonRequired"));
  }

  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase
    .from("data_rights_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("school_id", profile.school_id)
    .maybeSingle<{ id: string; status: string }>();

  if (requestError) {
    logServerError("Data-rights processing lookup failed", requestError);
    return fail(t("privacy.requests.errors.updateFailed"));
  }

  if (!request || terminalStatuses.has(request.status) || request.status === status) {
    return fail(t("privacy.requests.errors.invalidUpdate"));
  }

  const { error } = await supabase
    .from("data_rights_requests")
    .update({
      handled_by_profile_id: profile.id,
      response_summary: responseSummary || null,
      status,
    })
    .eq("id", request.id)
    .eq("school_id", profile.school_id)
    .eq("status", request.status);

  if (error) {
    logServerError("Data-rights request processing failed", error);
    return fail(t("privacy.requests.errors.updateFailed"));
  }

  revalidateRequestPaths();
  return success(t("privacy.requests.success.updated"));
}

function revalidateRequestPaths() {
  revalidatePath("/privacy/requests");
  revalidatePath("/privacy/requests/manage");
}

async function getServerTranslator() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (key: string) => translate(dictionary, key);
}

function fail(message: string): DataRightsActionState {
  return { message, success: false };
}

function success(message: string): DataRightsActionState {
  return { message, success: true };
}
