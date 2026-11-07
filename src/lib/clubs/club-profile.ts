export const CLUB_PROFILE_THEMES = ["warm", "sky", "forest", "plum"] as const;

export type ClubProfileTheme = (typeof CLUB_PROFILE_THEMES)[number];

export const CLUB_PROFILE_LIMITS = {
  accessibilityNotes: 1000,
  about: 2000,
  commitmentNotes: 1000,
  costNotes: 1000,
  eligibilityNotes: 1000,
  materialsNotes: 1000,
  meetingLocation: 300,
  meetingSchedule: 300,
  tagline: 160,
} as const;

export type ClubProfileValues = {
  accessibilityNotes: string;
  about: string;
  beginnersWelcome: boolean;
  commitmentNotes: string;
  costNotes: string;
  eligibilityNotes: string;
  firstVisitFree: boolean;
  materialsNotes: string;
  meetingLocation: string;
  meetingSchedule: string;
  tagline: string;
  themeKey: ClubProfileTheme;
};

export type ClubProfileField = keyof ClubProfileValues;

export type ClubProfileFlagField = "beginnersWelcome" | "firstVisitFree";

export type ClubProfileTextField = Exclude<
  ClubProfileField,
  ClubProfileFlagField | "themeKey"
>;

export type ClubProfileValidationIssue = {
  field: ClubProfileField;
  kind: "invalidTheme" | "tooLong" | "unsafeText";
  maximum?: number;
};

export const EMPTY_CLUB_PROFILE_VALUES: ClubProfileValues = {
  accessibilityNotes: "",
  about: "",
  beginnersWelcome: false,
  commitmentNotes: "",
  costNotes: "",
  eligibilityNotes: "",
  firstVisitFree: false,
  materialsNotes: "",
  meetingLocation: "",
  meetingSchedule: "",
  tagline: "",
  themeKey: "warm",
};

const fieldLimits: Partial<Record<ClubProfileTextField, number>> = {
  accessibilityNotes: CLUB_PROFILE_LIMITS.accessibilityNotes,
  about: CLUB_PROFILE_LIMITS.about,
  commitmentNotes: CLUB_PROFILE_LIMITS.commitmentNotes,
  costNotes: CLUB_PROFILE_LIMITS.costNotes,
  eligibilityNotes: CLUB_PROFILE_LIMITS.eligibilityNotes,
  materialsNotes: CLUB_PROFILE_LIMITS.materialsNotes,
  meetingLocation: CLUB_PROFILE_LIMITS.meetingLocation,
  meetingSchedule: CLUB_PROFILE_LIMITS.meetingSchedule,
  tagline: CLUB_PROFILE_LIMITS.tagline,
};

export function getClubProfileValues(formData: FormData): ClubProfileValues {
  const themeValue = readValue(formData, "theme_key");

  return {
    accessibilityNotes: readValue(formData, "accessibility_notes"),
    about: readValue(formData, "about"),
    beginnersWelcome: formData.get("beginners_welcome") === "on",
    commitmentNotes: readValue(formData, "commitment_notes"),
    costNotes: readValue(formData, "cost_notes"),
    eligibilityNotes: readValue(formData, "eligibility_notes"),
    firstVisitFree: formData.get("first_visit_free") === "on",
    materialsNotes: readValue(formData, "materials_notes"),
    meetingLocation: readValue(formData, "meeting_location"),
    meetingSchedule: readValue(formData, "meeting_schedule"),
    tagline: readValue(formData, "tagline"),
    themeKey: themeValue as ClubProfileTheme,
  };
}

export function validateClubProfileValues(values: ClubProfileValues) {
  const issues: ClubProfileValidationIssue[] = [];

  for (const [field, maximum] of Object.entries(fieldLimits) as Array<
    [ClubProfileTextField, number]
  >) {
    const value = values[field];

    if (value.length > maximum) {
      issues.push({ field, kind: "tooLong", maximum });
    } else if (containsUnsafeControlCharacters(value)) {
      issues.push({ field, kind: "unsafeText" });
    }
  }

  if (!CLUB_PROFILE_THEMES.includes(values.themeKey)) {
    issues.push({ field: "themeKey", kind: "invalidTheme" });
  }

  return issues;
}

// Shape check only. Postgres accepts any 8-4-4-4-12 hex value as a uuid, and the
// seeded clubs and events use ids without RFC version bits, so a stricter check
// turns every one of their pages into a 404.
export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function containsUnsafeControlCharacters(value: string) {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

