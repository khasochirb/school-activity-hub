export const ACTIVITY_CATEGORIES = [
  "Mental Health",
  "Sports",
  "Arts",
  "Volunteering",
  "Academic",
  "Career",
  "Outdoor",
  "Culture",
  "Leadership",
  "Social",
  "Other",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_TRANSLATION_KEYS: Record<
  ActivityCategory,
  string
> = {
  "Mental Health": "categories.mentalHealth",
  Sports: "categories.sports",
  Arts: "categories.arts",
  Volunteering: "categories.volunteering",
  Academic: "categories.academic",
  Career: "categories.career",
  Outdoor: "categories.outdoor",
  Culture: "categories.culture",
  Leadership: "categories.leadership",
  Social: "categories.social",
  Other: "categories.other",
};

export function parseActivityCategory(
  value: FormDataEntryValue | string | null | undefined,
) {
  const category = String(value ?? "").trim();

  return ACTIVITY_CATEGORIES.includes(category as ActivityCategory)
    ? category
    : null;
}

export function getActivityCategoryTranslationKey(category: string) {
  return (
    ACTIVITY_CATEGORY_TRANSLATION_KEYS[category as ActivityCategory] ?? null
  );
}
