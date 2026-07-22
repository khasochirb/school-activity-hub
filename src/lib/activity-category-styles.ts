import type { ActivityCategory } from "@/lib/activity-categories";

export type ActivityCategoryTone =
  | "amber"
  | "blue"
  | "green"
  | "indigo"
  | "rose"
  | "slate"
  | "violet";

const CATEGORY_TONES: Record<ActivityCategory, ActivityCategoryTone> = {
  Academic: "indigo",
  Arts: "rose",
  Career: "amber",
  Culture: "violet",
  Leadership: "blue",
  "Mental Health": "violet",
  Other: "slate",
  Outdoor: "green",
  Social: "rose",
  Sports: "green",
  Volunteering: "blue",
};

export function getActivityCategoryTone(
  category: string | null | undefined,
): ActivityCategoryTone {
  return CATEGORY_TONES[category as ActivityCategory] ?? "slate";
}
