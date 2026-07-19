"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  submitSafetyReport,
  type SensitiveActionState,
} from "../actions";

const initialState: SensitiveActionState = { message: "", success: false };

type Option = { label: string; value: string };

type Labels = {
  category: string;
  description: string;
  descriptionHelp: string;
  immediateContact: string;
  immediateContactHelp: string;
  noRelatedActivity: string;
  relatedActivity: string;
  submit: string;
  submitting: string;
};

export function SafetyReportForm({
  categories,
  labels,
  relatedActivities,
}: {
  categories: Option[];
  labels: Labels;
  relatedActivities: Option[];
}) {
  const [state, formAction] = useActionState(submitSafetyReport, initialState);

  return (
    <form action={formAction} className="compact-form-xl grid gap-4">
      <ActionToast message={state.message} success={state.success} />
      <label className="compact-select flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.category}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base font-normal outline-none transition"
          defaultValue=""
          name="concern_category"
          required
        >
          <option disabled value="">
            {labels.category}
          </option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.relatedActivity}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base font-normal outline-none transition"
          defaultValue=""
          name="related_context"
        >
          <option value="">{labels.noRelatedActivity}</option>
          {relatedActivities.map((activity) => (
            <option key={activity.value} value={activity.value}>
              {activity.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.description}
        <textarea
          aria-describedby="safety-description-help"
          className="min-h-36 rounded-md border px-3 py-2 text-base font-normal outline-none transition"
          maxLength={2000}
          name="description"
          required
        />
        <span
          className="text-xs font-normal leading-5 text-slate-600"
          id="safety-description-help"
        >
          {labels.descriptionHelp}
        </span>
      </label>

      <label className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
        <input
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
          name="immediate_contact_requested"
          type="checkbox"
        />
        <span className="min-w-0">
          <span className="block font-semibold">{labels.immediateContact}</span>
          <span className="mt-1 block leading-5 text-slate-600">
            {labels.immediateContactHelp}
          </span>
        </span>
      </label>

      {state.message ? (
        <p
          className={state.success ? "notice-box notice-success" : "notice-box notice-danger"}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton submit={labels.submit} submitting={labels.submitting} />
    </form>
  );
}

function SubmitButton({ submit, submitting }: { submit: string; submitting: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      disabled={pending}
      type="submit"
    >
      {pending ? submitting : submit}
    </button>
  );
}
