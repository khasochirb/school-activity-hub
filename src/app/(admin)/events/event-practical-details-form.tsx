"use client";

import { useState } from "react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  EVENT_COST_CURRENCY,
  EVENT_COST_NOTES_MAX_LENGTH,
  EVENT_EXPECTED_COMMITMENT_MAX_LENGTH,
  EVENT_REQUIRED_MATERIALS_MAX_LENGTH,
  type EventCostType,
} from "@/lib/events/event-practical-details";
import { updateEventPracticalDetails } from "./actions";

export type EventPracticalDetailsFormLabels = {
  amount: string;
  cost: string;
  costNotes: string;
  costNotesPlaceholder: string;
  currency: string;
  expectedCommitment: string;
  expectedCommitmentPlaceholder: string;
  free: string;
  notSpecified: string;
  paid: string;
  requiredMaterials: string;
  requiredMaterialsPlaceholder: string;
  save: string;
  saving: string;
  variable: string;
};

export function EventPracticalDetailsForm({
  event,
  labels,
}: {
  event: {
    cost_amount: number | string | null;
    cost_currency: string | null;
    cost_notes: string | null;
    cost_type: EventCostType | null;
    expected_commitment: string | null;
    id: string;
    required_materials: string | null;
  };
  labels: EventPracticalDetailsFormLabels;
}) {
  const [costType, setCostType] = useState<EventCostType | "">(
    event.cost_type ?? "",
  );

  return (
    <form
      action={updateEventPracticalDetails}
      className="compact-form flex flex-col gap-3"
    >
      <input name="event_id" type="hidden" value={event.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700 sm:max-w-sm">
          <span className="break-words">{labels.cost}</span>
          <select
            className="h-10 max-w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none transition focus:border-zinc-900"
            name="cost_type"
            onChange={(event) =>
              setCostType(event.target.value as EventCostType | "")
            }
            value={costType}
          >
            <option value="">{labels.notSpecified}</option>
            <option value="free">{labels.free}</option>
            <option value="paid">{labels.paid}</option>
            <option value="variable">{labels.variable}</option>
          </select>
        </label>
        {costType === "paid" ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(9rem,1fr)_7rem]">
            <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
              <span className="break-words">{labels.amount}</span>
              <input
                className="h-10 rounded-md border border-zinc-300 px-2 text-sm outline-none transition focus:border-zinc-900"
                defaultValue={event.cost_amount ?? ""}
                inputMode="decimal"
                min="0.01"
                name="cost_amount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
              <span className="break-words">{labels.currency}</span>
              <select
                className="h-10 cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none transition focus:border-zinc-900"
                defaultValue={event.cost_currency ?? EVENT_COST_CURRENCY}
                name="cost_currency"
              >
                <option value={EVENT_COST_CURRENCY}>
                  {EVENT_COST_CURRENCY}
                </option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
      {costType ? (
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
          <span className="break-words">{labels.costNotes}</span>
          <textarea
            className="min-h-20 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
            defaultValue={event.cost_notes ?? ""}
            maxLength={EVENT_COST_NOTES_MAX_LENGTH}
            name="cost_notes"
            placeholder={labels.costNotesPlaceholder}
            required={costType === "variable"}
          />
        </label>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
          <span className="break-words">{labels.requiredMaterials}</span>
          <textarea
            className="min-h-24 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
            defaultValue={event.required_materials ?? ""}
            maxLength={EVENT_REQUIRED_MATERIALS_MAX_LENGTH}
            name="required_materials"
            placeholder={labels.requiredMaterialsPlaceholder}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
          <span className="break-words">{labels.expectedCommitment}</span>
          <textarea
            className="min-h-24 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
            defaultValue={event.expected_commitment ?? ""}
            maxLength={EVENT_EXPECTED_COMMITMENT_MAX_LENGTH}
            name="expected_commitment"
            placeholder={labels.expectedCommitmentPlaceholder}
          />
        </label>
      </div>
      <PendingSubmitButton
        className="btn btn-secondary min-h-10 px-3"
        pendingLabel={labels.saving}
        toastMessage={labels.saving}
      >
        {labels.save}
      </PendingSubmitButton>
    </form>
  );
}
