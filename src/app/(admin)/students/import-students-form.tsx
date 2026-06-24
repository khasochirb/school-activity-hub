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
        <p className="text-sm font-medium text-zinc-800">Sample CSV format</p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-50 p-3 text-sm text-zinc-800">
          {sampleCsv}
        </pre>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
          CSV file
          <input
            accept=".csv,text/csv"
            className="min-h-11 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            name="csv_file"
            required
            type="file"
          />
        </label>
        {state.message ? (
          <p
            className={
              state.success
                ? "whitespace-pre-line text-sm text-emerald-700"
                : "whitespace-pre-line text-sm text-red-600"
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
      className="h-11 w-full cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? "Importing..." : "Import CSV"}
    </button>
  );
}
