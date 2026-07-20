export const EVENT_MEANINGFUL_DESCRIPTION_MIN_LENGTH = 20;

export type EventCompletenessItemId =
  | "accessibility"
  | "category"
  | "commitment"
  | "cost"
  | "description"
  | "eligibility"
  | "experience"
  | "location"
  | "materials"
  | "responsible_adult"
  | "schedule";

export type EventListingCompletenessInput = {
  accessibilityNotes: string | null | undefined;
  category: string | null | undefined;
  costAmount: number | string | null | undefined;
  costCurrency: string | null | undefined;
  costNotes: string | null | undefined;
  costType: "free" | "paid" | "variable" | null | undefined;
  description: string | null | undefined;
  eligibilityNotes: string | null | undefined;
  endsAt: string | null | undefined;
  experienceLevel: string | null | undefined;
  expectedCommitment: string | null | undefined;
  location: string | null | undefined;
  requiredMaterials: string | null | undefined;
  responsibleAdultRequired: boolean;
  responsibleStaffId: string | null | undefined;
  startsAt: string | null | undefined;
};

export type EventListingCompleteness = {
  applicableCount: number;
  completedCount: number;
  completedItems: EventCompletenessItemId[];
  missingItems: EventCompletenessItemId[];
  percentage: number;
  status: "needs_details" | "ready";
};

export const EVENT_COMPLETENESS_STEP_BY_ITEM: Record<
  EventCompletenessItemId,
  0 | 1 | 2
> = {
  accessibility: 1,
  category: 0,
  commitment: 1,
  cost: 1,
  description: 0,
  eligibility: 1,
  experience: 1,
  location: 0,
  materials: 1,
  responsible_adult: 2,
  schedule: 0,
};

export function getEventListingCompleteness(
  event: EventListingCompletenessInput,
): EventListingCompleteness {
  const items: Array<{ complete: boolean; id: EventCompletenessItemId }> = [
    {
      complete:
        normalizedLength(event.description) >=
        EVENT_MEANINGFUL_DESCRIPTION_MIN_LENGTH,
      id: "description",
    },
    { complete: hasText(event.category), id: "category" },
    {
      complete: hasValidSchedule(event.startsAt, event.endsAt),
      id: "schedule",
    },
    { complete: hasText(event.location), id: "location" },
    { complete: hasText(event.eligibilityNotes), id: "eligibility" },
    { complete: hasText(event.experienceLevel), id: "experience" },
    { complete: hasText(event.accessibilityNotes), id: "accessibility" },
    { complete: hasCompleteCost(event), id: "cost" },
    { complete: hasText(event.requiredMaterials), id: "materials" },
    { complete: hasText(event.expectedCommitment), id: "commitment" },
  ];

  if (event.responsibleAdultRequired) {
    items.splice(4, 0, {
      complete: hasText(event.responsibleStaffId),
      id: "responsible_adult",
    });
  }

  const completedItems = items
    .filter((item) => item.complete)
    .map((item) => item.id);
  const missingItems = items
    .filter((item) => !item.complete)
    .map((item) => item.id);
  const applicableCount = items.length;
  const completedCount = completedItems.length;
  const percentage = applicableCount
    ? Math.round((completedCount / applicableCount) * 100)
    : 0;

  return {
    applicableCount,
    completedCount,
    completedItems,
    missingItems,
    percentage,
    status: percentage >= 80 ? "ready" : "needs_details",
  };
}

export function getEventCompletenessItemLabels(
  t: (key: string) => string,
): Record<EventCompletenessItemId, string> {
  return {
    accessibility: t("events.decisionInfo.accessibilityInformation"),
    category: t("events.form.category"),
    commitment: t("events.practicalDetails.expectedCommitment"),
    cost: t("events.practicalDetails.cost"),
    description: t("events.form.description"),
    eligibility: t("events.decisionInfo.eligibility"),
    experience: t("events.decisionInfo.experienceLevel"),
    location: t("events.form.location"),
    materials: t("events.practicalDetails.requiredMaterials"),
    responsible_adult: t("events.decisionInfo.responsibleAdult"),
    schedule: t("events.formGroups.dateTime"),
  };
}

function hasCompleteCost(event: EventListingCompletenessInput) {
  if (event.costType === "free") return true;
  if (event.costType === "paid") {
    return Number(event.costAmount) > 0 && hasText(event.costCurrency);
  }
  if (event.costType === "variable") return hasText(event.costNotes);
  return false;
}

function hasValidSchedule(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) return false;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}

function hasText(value: string | null | undefined) {
  return normalizedLength(value) > 0;
}

function normalizedLength(value: string | null | undefined) {
  return value?.trim().length ?? 0;
}
