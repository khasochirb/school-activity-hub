"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  updateSafetyReportStatus,
  type SensitiveActionState,
} from "../actions";

const initialState: SensitiveActionState = { message: "", success: false };

export function SafetyReportWorkflowForm({
  labels,
  options,
  reportId,
}: {
  labels: { save: string; saving: string; status: string };
  options: Array<{ label: string; value: string }>;
  reportId: string;
}) {
  const [state, formAction] = useActionState(
    updateSafetyReportStatus,
    initialState,
  );

  if (!options.length) {
    return null;
  }

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <ActionToast message={state.message} success={state.success} />
      <input name="report_id" type="hidden" value={reportId} />
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.status}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base font-normal outline-none transition"
          name="status"
          required
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <WorkflowSubmitButton save={labels.save} saving={labels.saving} />
      {state.message ? (
        <p
          className={`${state.success ? "notice-box notice-success" : "notice-box notice-danger"} sm:col-span-2`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function WorkflowSubmitButton({ save, saving }: { save: string; saving: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? saving : save}
    </button>
  );
}
