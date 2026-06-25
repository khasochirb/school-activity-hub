"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importStudentsFromCsv, type ImportStudentsState } from "./actions";

const initialState: ImportStudentsState = {
  message: "",
  success: false,
};

const sampleCsv = `full_name,grade,class_group,student_number
Avery Stone,7,7A,S-1001
Mina Patel,8,8B,S-1002`;

export function ImportStudentsForm() {
  const [state, formAction] = useActionState(
    importStudentsFromCsv,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Sample CSV format</p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-3 text-sm text-slate-800">
          {sampleCsv}
        </pre>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          CSV file
          <input
            accept=".csv,text/csv"
            className="min-h-11 cursor-pointer rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
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
        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? "Importing..." : "Import CSV"}
    </button>
  );
}
