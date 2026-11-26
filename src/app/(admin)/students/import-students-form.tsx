"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import { importStudentsFromCsv, type ImportStudentsState } from "./actions";

const initialState: ImportStudentsState = {
  message: "",
  success: false,
};

type ImportStudentsFormLabels = {
  fileLabel: string;
  importing: string;
  sampleCsv: string;
  sampleTitle: string;
  submit: string;
};

export function ImportStudentsForm({
  labels,
}: {
  labels: ImportStudentsFormLabels;
}) {
  const [state, formAction] = useActionState(
    importStudentsFromCsv,
    initialState,
  );

  return (
    <div className="compact-form flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {labels.sampleTitle}
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-3 text-sm text-slate-800">
          {labels.sampleCsv}
        </pre>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <ActionToast message={state.message} success={state.success} />
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {labels.fileLabel}
          <input
            accept=".csv,text/csv"
            className="min-h-11 cursor-pointer rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--primary-contrast)]"
            name="csv_file"
            required
            type="file"
          />
        </label>
        {state.message ? (
          <p
            className={
              state.success
                ? "notice-box notice-success whitespace-pre-line"
                : "notice-box notice-danger whitespace-pre-line"
            }
            role="status"
          >
            {state.message}
          </p>
        ) : null}
        <SubmitButton
          importingLabel={labels.importing}
          submitLabel={labels.submit}
        />
      </form>
    </div>
  );
}

function SubmitButton({
  importingLabel,
  submitLabel,
}: {
  importingLabel: string;
  submitLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? importingLabel : submitLabel}
    </button>
  );
}
