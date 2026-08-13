"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentClubActor } from "@/lib/auth/club-access";
import {
  type ClubProfileField,
  type ClubProfileValues,
  getClubProfileValues,
  isUuid,
  validateClubProfileValues,
} from "@/lib/clubs/club-profile";
import { logServerError } from "@/lib/errors/server-error";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export type UpdateClubProfileState = {
  fieldErrors: Partial<Record<ClubProfileField, string>>;
  message: string;
  success: boolean;
  values: ClubProfileValues;
};

export async function updateClubProfile(
  _previousState: UpdateClubProfileState,
  formData: FormData,
): Promise<UpdateClubProfileState> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const values = getClubProfileValues(formData);
  const clubId = String(formData.get("club_id") ?? "").trim();
  const emptyFailure = (message: string): UpdateClubProfileState => ({
    fieldErrors: {},
    message,
    success: false,
    values,
  });

  if (!isUuid(clubId)) {
    return emptyFailure(t("clubs.profile.errors.notFound"));
  }

  const issues = validateClubProfileValues(values);

  if (issues.length) {
    const fieldErrors: UpdateClubProfileState["fieldErrors"] = {};

    for (const issue of issues) {
      const fieldLabel = t(`clubs.profile.fields.${issue.field}`);

      fieldErrors[issue.field] =
        issue.kind === "tooLong"
          ? tf("clubs.profile.errors.tooLong", {
              count: issue.maximum ?? 0,
              field: fieldLabel,
            })
          : issue.kind === "unsafeText"
            ? tf("clubs.profile.errors.unsafeText", { field: fieldLabel })
            : t("clubs.profile.errors.invalidTheme");
    }

    return {
      fieldErrors,
      message: t("clubs.profile.errors.validation"),
      success: false,
      values,
    };
  }

  const actor = await getCurrentClubActor();

  if (!actor) {
    redirect("/login");
  }

  if (!actor.profile && !actor.isPlatformAdmin) {
    return emptyFailure(t("clubs.profile.errors.editDenied"));
  }

  const supabase = await createClient();
  const { data: canEdit, error: accessError } = await supabase.rpc(
    "current_user_can_edit_club_profile",
    { target_club_id: clubId },
  );

  if (accessError || canEdit !== true) {
    if (accessError) {
      logServerError("Club profile edit authorization failed", accessError, {
        clubId,
        isPlatformAdmin: actor.isPlatformAdmin,
        role: actor.profile?.role,
      });
    }

    return emptyFailure(t("clubs.profile.errors.editDenied"));
  }

  const { error } = await supabase.rpc("upsert_club_profile", {
    profile_about: values.about || null,
    profile_accessibility_notes: values.accessibilityNotes || null,
    profile_commitment_notes: values.commitmentNotes || null,
    profile_cost_notes: values.costNotes || null,
    profile_eligibility_notes: values.eligibilityNotes || null,
    profile_materials_notes: values.materialsNotes || null,
    profile_meeting_location: values.meetingLocation || null,
    profile_meeting_schedule: values.meetingSchedule || null,
    profile_tagline: values.tagline || null,
    profile_theme_key: values.themeKey,
    target_club_id: clubId,
  });

  if (error) {
    logServerError("Club profile update failed", error, {
      clubId,
      isPlatformAdmin: actor.isPlatformAdmin,
      role: actor.profile?.role,
    });

    return emptyFailure(t("clubs.profile.errors.saveFailed"));
  }

  revalidatePath("/clubs");
  revalidatePath(`/clubs/${clubId}`);
  redirect(`/clubs/${clubId}?updated=1`);
}

