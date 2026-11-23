"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import { FounderPicker, type FounderPickerLabels } from "./founder-picker";
import { createClubProposal, type ProposalState } from "./proposal-actions";

const initialState: ProposalState = {
  message: "",
  success: false,
};

type CategoryOption = {
  label: string;
  value: string;
};

type CreateClubRequestFormLabels = {
  category: string;
  description: string;
  founders: string;
  foundersHint: string;
  noCategory: string;
  picker: FounderPickerLabels;
  reason: string;
  reasonHint: string;
  submit: string;
  submitting: string;
  title: string;
};

export function CreateClubRequestForm({
  categories,
  labels,
  maxFounders,
  minFounders,
}: {
  categories: CategoryOption[];
  labels: CreateClubRequestFormLabels;
  maxFounders: number;
  minFounders: number;
}) {
  const [state, formAction] = useActionState(createClubProposal, initialState);

  return (
    <form
      action={formAction}
      className="compact-form-xl grid gap-3 md:grid-cols-[minmax(16rem,2fr)_minmax(12rem,1fr)]"
    >
      <ActionToast message={state.message} success={state.success} />
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.title}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="title"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.category}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
          name="category"
        >
          <option value="">{labels.noCategory}</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
        {labels.description}
        <textarea
          className="min-h-28 rounded-md border px-3 py-2 text-base outline-none transition"
          name="description"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
        {labels.reason}
        <span className="text-sm font-normal text-slate-600">{labels.reasonHint}</span>
        <textarea
          className="min-h-28 rounded-md border px-3 py-2 text-base font-normal outline-none transition"
          maxLength={2000}
          name="reason"
          required
        />
      </label>
      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="text-sm font-semibold text-slate-800">{labels.founders}</legend>
        <p className="text-sm text-slate-600">{labels.foundersHint}</p>
        <FounderPicker key={state.success ? state.message : "picker"} labels={labels.picker} max={maxFounders} min={minFounders} />
      </fieldset>
      {state.message ? (
        <p
          className={
            state.success
              ? "notice-box notice-success md:col-span-2"
              : "notice-box notice-danger md:col-span-2"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <div className="md:col-span-2">
        <SubmitButton
          submitLabel={labels.submit}
          submittingLabel={labels.submitting}
        />
      </div>
    </form>
  );
}

function SubmitButton({
  submitLabel,
  submittingLabel,
}: {
  submitLabel: string;
  submittingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? submittingLabel : submitLabel}
    </button>
  );
}
