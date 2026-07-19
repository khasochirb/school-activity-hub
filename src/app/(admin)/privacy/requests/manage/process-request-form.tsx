"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  processDataRightsRequest,
  type DataRightsActionState,
} from "../actions";

const initialState: DataRightsActionState = { message: "", success: false };

export function ProcessRequestForm({
  labels,
  requestId,
  statuses,
}: {
  labels: {
    response: string;
    responseHelp: string;
    save: string;
    saving: string;
    status: string;
  };
  requestId: string;
  statuses: Array<{ label: string; value: string }>;
}) {
  const [state, formAction] = useActionState(
    processDataRightsRequest,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <ActionToast message={state.message} success={state.success} />
      <input name="request_id" type="hidden" value={requestId} />
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.status}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base font-normal outline-none transition"
          name="status"
          required
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.response}
        <textarea
          aria-describedby={`response-help-${requestId}`}
          className="min-h-24 rounded-md border px-3 py-2 text-base font-normal outline-none transition"
          maxLength={1000}
          name="response_summary"
        />
        <span
          className="text-xs font-normal leading-5 text-slate-600"
          id={`response-help-${requestId}`}
        >
          {labels.responseHelp}
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
      <ProcessButton save={labels.save} saving={labels.saving} />
    </form>
  );
}

function ProcessButton({ save, saving }: { save: string; saving: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      disabled={pending}
      type="submit"
    >
      {pending ? saving : save}
    </button>
  );
}
