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

export function parseActivityCategory(
  value: FormDataEntryValue | string | null | undefined,
) {
  const category = String(value ?? "").trim();

  return ACTIVITY_CATEGORIES.includes(category as ActivityCategory)
    ? category
    : null;
}
