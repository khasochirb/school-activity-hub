export const EVENT_ELIGIBILITY_MAX_LENGTH = 500;
export const EVENT_ACCESSIBILITY_MAX_LENGTH = 2000;

export type EventExperienceLevel =
  | "beginner_friendly"
  | "prior_experience_recommended";

export type EventDecisionInfo = {
  accessibilityNotes: string | null;
  eligibilityNotes: string | null;
  experienceLevel: EventExperienceLevel | null;
  responsibleStaffId: string | null;
};

export type EventDecisionInfoError =
  | "accessibility_too_long"
  | "eligibility_too_long"
  | "invalid_experience_level";

export function parseEventDecisionInfo(formData: FormData):
  | { data: EventDecisionInfo; error: null }
  | { data: null; error: EventDecisionInfoError } {
  const accessibilityNotes = normalizeOptionalText(
    formData.get("accessibility_notes"),
  );
  const eligibilityNotes = normalizeOptionalText(formData.get("eligibility_notes"));
  const responsibleStaffId = normalizeOptionalText(
    formData.get("responsible_staff_id"),
  );
  const experienceInput = normalizeOptionalText(formData.get("experience_level"));

  if (
    eligibilityNotes &&
    eligibilityNotes.length > EVENT_ELIGIBILITY_MAX_LENGTH
  ) {
    return { data: null, error: "eligibility_too_long" };
  }

  if (
    accessibilityNotes &&
    accessibilityNotes.length > EVENT_ACCESSIBILITY_MAX_LENGTH
  ) {
    return { data: null, error: "accessibility_too_long" };
  }

  if (
    experienceInput &&
    experienceInput !== "beginner_friendly" &&
    experienceInput !== "prior_experience_recommended"
  ) {
    return { data: null, error: "invalid_experience_level" };
  }

  return {
    data: {
      accessibilityNotes,
      eligibilityNotes,
      experienceLevel: experienceInput as EventExperienceLevel | null,
      responsibleStaffId,
    },
    error: null,
  };
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
