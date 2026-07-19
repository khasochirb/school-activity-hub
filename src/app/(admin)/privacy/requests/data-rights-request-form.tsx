"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  createDataRightsRequest,
  type DataRightsActionState,
} from "./actions";

const initialState: DataRightsActionState = { message: "", success: false };

export function DataRightsRequestForm({
  labels,
  requestTypes,
}: {
  labels: {
    details: string;
    detailsHelp: string;
    requestType: string;
    submit: string;
    submitting: string;
  };
  requestTypes: Array<{ label: string; value: string }>;
}) {
  const [state, formAction] = useActionState(
    createDataRightsRequest,
    initialState,
  );

  return (
    <form action={formAction} className="compact-form-xl grid gap-4">
      <ActionToast message={state.message} success={state.success} />
      <label className="compact-select flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.requestType}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base font-normal outline-none transition"
          defaultValue=""
          name="request_type"
          required
        >
          <option disabled value="">
            {labels.requestType}
          </option>
          {requestTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.details}
        <textarea
          aria-describedby="data-rights-details-help"
          className="min-h-28 rounded-md border px-3 py-2 text-base font-normal outline-none transition"
          maxLength={2000}
          name="details"
        />
        <span
          className="text-xs font-normal leading-5 text-slate-600"
          id="data-rights-details-help"
        >
          {labels.detailsHelp}
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
