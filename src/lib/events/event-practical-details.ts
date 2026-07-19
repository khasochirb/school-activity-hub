import type { Locale } from "@/lib/i18n/locales";

export const EVENT_COST_NOTES_MAX_LENGTH = 500;
export const EVENT_REQUIRED_MATERIALS_MAX_LENGTH = 1000;
export const EVENT_EXPECTED_COMMITMENT_MAX_LENGTH = 500;
export const EVENT_COST_CURRENCY = "MNT" as const;

export type EventCostType = "free" | "paid" | "variable";

export type EventPracticalDetails = {
  costAmount: string | null;
  costCurrency: typeof EVENT_COST_CURRENCY | null;
  costNotes: string | null;
  costType: EventCostType | null;
  expectedCommitment: string | null;
  requiredMaterials: string | null;
};

export type EventPracticalDetailsError =
  | "commitment_too_long"
  | "cost_notes_too_long"
  | "invalid_cost_amount"
  | "invalid_cost_currency"
  | "invalid_cost_type"
  | "materials_too_long"
  | "paid_cost_required"
  | "unexpected_cost_details"
  | "variable_cost_notes_required";

export type EventCostDisplayInput = {
  costAmount: number | string | null;
  costCurrency: string | null;
  costType: EventCostType | null;
};

export function parseEventPracticalDetails(formData: FormData):
  | { data: EventPracticalDetails; error: null }
  | { data: null; error: EventPracticalDetailsError } {
  const costTypeInput = normalizeOptionalText(formData.get("cost_type"));
  const costAmount = normalizeOptionalText(formData.get("cost_amount"));
  const costCurrencyInput = normalizeOptionalText(
    formData.get("cost_currency"),
  )?.toUpperCase();
  const costNotes = normalizeOptionalText(formData.get("cost_notes"));
  const requiredMaterials = normalizeOptionalText(
    formData.get("required_materials"),
  );
  const expectedCommitment = normalizeOptionalText(
    formData.get("expected_commitment"),
  );

  if (
    costTypeInput &&
    costTypeInput !== "free" &&
    costTypeInput !== "paid" &&
    costTypeInput !== "variable"
  ) {
    return { data: null, error: "invalid_cost_type" };
  }

  if (costNotes && costNotes.length > EVENT_COST_NOTES_MAX_LENGTH) {
    return { data: null, error: "cost_notes_too_long" };
  }

  if (
    requiredMaterials &&
    requiredMaterials.length > EVENT_REQUIRED_MATERIALS_MAX_LENGTH
  ) {
    return { data: null, error: "materials_too_long" };
  }

  if (
    expectedCommitment &&
    expectedCommitment.length > EVENT_EXPECTED_COMMITMENT_MAX_LENGTH
  ) {
    return { data: null, error: "commitment_too_long" };
  }

  const costType = costTypeInput as EventCostType | null;

  if (!costType) {
    if (costAmount || costCurrencyInput || costNotes) {
      return { data: null, error: "unexpected_cost_details" };
    }

    return practicalDetailsResult({
      costAmount: null,
      costCurrency: null,
      costNotes: null,
      costType: null,
      expectedCommitment,
      requiredMaterials,
    });
  }

  if (costType === "free") {
    if (costAmount || costCurrencyInput) {
      return { data: null, error: "unexpected_cost_details" };
    }

    return practicalDetailsResult({
      costAmount: null,
      costCurrency: null,
      costNotes,
      costType,
      expectedCommitment,
      requiredMaterials,
    });
  }

  if (costType === "variable") {
    if (costAmount || costCurrencyInput) {
      return { data: null, error: "unexpected_cost_details" };
    }

    if (!costNotes) {
      return { data: null, error: "variable_cost_notes_required" };
    }

    return practicalDetailsResult({
      costAmount: null,
      costCurrency: null,
      costNotes,
      costType,
      expectedCommitment,
      requiredMaterials,
    });
  }

  if (!costAmount) {
    return { data: null, error: "paid_cost_required" };
  }

  if (!isValidPositiveAmount(costAmount)) {
    return { data: null, error: "invalid_cost_amount" };
  }

  if (costCurrencyInput !== EVENT_COST_CURRENCY) {
    return { data: null, error: "invalid_cost_currency" };
  }

  return practicalDetailsResult({
    costAmount,
    costCurrency: EVENT_COST_CURRENCY,
    costNotes,
    costType,
    expectedCommitment,
    requiredMaterials,
  });
}

export function formatEventCost(
  cost: EventCostDisplayInput,
  locale: Locale,
  labels: { free: string; notSpecified: string; variable: string },
) {
  if (!cost.costType) {
    return labels.notSpecified;
  }

  if (cost.costType === "free") {
    return labels.free;
  }

  if (cost.costType === "variable") {
    return labels.variable;
  }

  const amount = Number(cost.costAmount);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    cost.costCurrency !== EVENT_COST_CURRENCY
  ) {
    return labels.notSpecified;
  }

  const preferredLocale = locale === "mn" ? "mn-MN" : "en-CA";
  const supportedLocale =
    Intl.NumberFormat.supportedLocalesOf([preferredLocale])[0] ?? "en-CA";
  const formattedAmount = new Intl.NumberFormat(supportedLocale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

  return `${EVENT_COST_CURRENCY} ${formattedAmount}`;
}

function practicalDetailsResult(data: EventPracticalDetails) {
  return { data, error: null } as const;
}

function isValidPositiveAmount(value: string) {
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) {
    return false;
  }

  const [whole, fraction = ""] = value.split(".");
  const minorUnits =
    Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minorUnits) && minorUnits > 0;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
