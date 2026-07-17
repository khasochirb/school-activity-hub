"use server";

import { revalidatePath } from "next/cache";
import {
  requireActiveSchoolProfile,
  requireSafeguardingStaff,
  requireSchoolAdminForSensitiveWorkflow,
} from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export type SensitiveActionState = {
  message: string;
  success: boolean;
};

const concernCategories = new Set([
  "personal_safety",
  "bullying_or_harassment",
  "activity_or_event",
  "online_or_platform",
  "other",
]);

const reportStatuses = new Set([
  "acknowledged",
  "in_review",
  "external_referral",
  "closed",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitSafetyReport(
  _state: SensitiveActionState,
  formData: FormData,
): Promise<SensitiveActionState> {
  const t = await getServerTranslator();
  const profile = await requireActiveSchoolProfile();
  const category = String(formData.get("concern_category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const relatedContext = String(formData.get("related_context") ?? "").trim();
  const immediateContactRequested = formData.get("immediate_contact_requested") === "on";

  if (!concernCategories.has(category)) {
    return fail(t("safety.errors.categoryRequired"));
  }

  if (!description) {
    return fail(t("safety.errors.descriptionRequired"));
  }

  if (description.length > 2000) {
    return fail(t("safety.errors.descriptionTooLong"));
  }

  const related = parseRelatedContext(relatedContext);

  if (relatedContext && !related) {
    return fail(t("safety.errors.invalidRelatedActivity"));
  }

  const supabase = await createClient();

  if (related) {
    const table = related.type === "event" ? "events" : "clubs";
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("id", related.id)
      .eq("school_id", profile.school_id)
      .maybeSingle<{ id: string }>();

    if (error) {
      logServerError("Safety report related activity lookup failed", error, {
        relatedType: related.type,
      });
      return fail(t("safety.errors.submitFailed"));
    }

    if (!data) {
      return fail(t("safety.errors.invalidRelatedActivity"));
    }
  }

  const reportId = crypto.randomUUID();
  const { error } = await supabase.from("safety_reports").insert({
    id: reportId,
    school_id: profile.school_id,
    reporter_profile_id: profile.id,
    related_event_id: related?.type === "event" ? related.id : null,
    related_club_id: related?.type === "club" ? related.id : null,
    concern_category: category,
    description,
    immediate_contact_requested: immediateContactRequested,
    status: "submitted",
  });

  if (error) {
    logServerError("Safety report submission failed", error);
    return fail(t("safety.errors.submitFailed"));
  }

  revalidatePath("/safety");
  revalidatePath("/safety/my-reports");
  revalidatePath("/safety/reports");

  return success(t("safety.success.submitted"));
}

export async function updateSafetyReportStatus(
  _state: SensitiveActionState,
  formData: FormData,
): Promise<SensitiveActionState> {
  const t = await getServerTranslator();
  const profile = await requireSafeguardingStaff();
  const reportId = String(formData.get("report_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!uuidPattern.test(reportId) || !reportStatuses.has(status)) {
    return fail(t("safety.errors.invalidWorkflowUpdate"));
  }

  const supabase = await createClient();
  const { data: report, error: reportError } = await supabase
    .from("safety_reports")
    .select("id, status")
    .eq("id", reportId)
    .eq("school_id", profile.school_id)
    .maybeSingle<{ id: string; status: string }>();

  if (reportError) {
    logServerError("Safety report workflow lookup failed", reportError);
    return fail(t("safety.errors.updateFailed"));
  }

  if (!report || !isAllowedReportTransition(report.status, status)) {
    return fail(t("safety.errors.invalidWorkflowUpdate"));
  }

  const { error } = await supabase
    .from("safety_reports")
    .update({ status })
    .eq("id", report.id)
    .eq("school_id", profile.school_id)
    .eq("status", report.status);

  if (error) {
    logServerError("Safety report workflow update failed", error);
    return fail(t("safety.errors.updateFailed"));
  }

  revalidatePath("/safety/reports");
  revalidatePath("/safety/my-reports");

  return success(t("safety.success.updated"));
}

export async function updateSafeguardingDesignation(
  _state: SensitiveActionState,
  formData: FormData,
): Promise<SensitiveActionState> {
  const t = await getServerTranslator();
  const adminProfile = await requireSchoolAdminForSensitiveWorkflow();
  const targetProfileId = String(formData.get("profile_id") ?? "").trim();
  const desiredStatus = String(formData.get("status") ?? "").trim();

  if (
    !uuidPattern.test(targetProfileId) ||
    (desiredStatus !== "active" && desiredStatus !== "inactive")
  ) {
    return fail(t("safety.designations.errors.invalidSelection"));
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("safeguarding_staff_designations")
    .select("id, status")
    .eq("school_id", adminProfile.school_id)
    .eq("profile_id", targetProfileId)
    .maybeSingle<{ id: string; status: "active" | "inactive" }>();

  if (existingError) {
    logServerError("Safeguarding designation lookup failed", existingError);
    return fail(t("safety.designations.errors.updateFailed"));
  }

  if (desiredStatus === "active") {
    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", targetProfileId)
      .eq("school_id", adminProfile.school_id)
      .eq("status", "active")
      .in("role", ["school_admin", "teacher"])
      .maybeSingle<{ id: string }>();

    if (profileError) {
      logServerError("Safeguarding designation profile lookup failed", profileError);
      return fail(t("safety.designations.errors.updateFailed"));
    }

    if (!targetProfile) {
      return fail(t("safety.designations.errors.ineligibleProfile"));
    }
  }

  if (existing?.status === desiredStatus) {
    return fail(t("safety.designations.errors.noChange"));
  }

  if (!existing && desiredStatus === "inactive") {
    return fail(t("safety.designations.errors.noChange"));
  }

  const result = existing
    ? await supabase
        .from("safeguarding_staff_designations")
        .update({ status: desiredStatus })
        .eq("id", existing.id)
        .eq("school_id", adminProfile.school_id)
        .eq("status", existing.status)
    : await supabase.from("safeguarding_staff_designations").insert({
        school_id: adminProfile.school_id,
        profile_id: targetProfileId,
        assigned_by_profile_id: adminProfile.id,
        status: "active",
        status_changed_by_profile_id: adminProfile.id,
      });

  if (result.error) {
    logServerError("Safeguarding designation update failed", result.error);
    return fail(t("safety.designations.errors.updateFailed"));
  }

  revalidatePath("/safety");
  revalidatePath("/safety/designations");
  revalidatePath("/safety/reports");

  return success(
    t(
      desiredStatus === "active"
        ? "safety.designations.success.activated"
        : "safety.designations.success.deactivated",
    ),
  );
}

function parseRelatedContext(value: string) {
  if (!value) {
    return null;
  }

  const [type, id, ...rest] = value.split(":");

  if (
    rest.length ||
    (type !== "event" && type !== "club") ||
    !uuidPattern.test(id ?? "")
  ) {
    return null;
  }

  return { id, type } as { id: string; type: "club" | "event" };
}

function isAllowedReportTransition(current: string, next: string) {
  if (current === "submitted") {
    return next === "acknowledged";
  }

  if (current === "acknowledged") {
    return ["in_review", "external_referral", "closed"].includes(next);
  }

  if (current === "in_review") {
    return ["external_referral", "closed"].includes(next);
  }

  return current === "external_referral" && next === "closed";
}

async function getServerTranslator() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (key: string) => translate(dictionary, key);
}

function fail(message: string): SensitiveActionState {
  return { message, success: false };
}

function success(message: string): SensitiveActionState {
  return { message, success: true };
}
