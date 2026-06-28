"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createStudent, type CreateStudentState } from "./actions";

const initialState: CreateStudentState = {
  message: "",
  success: false,
};

type CreateStudentFormLabels = {
  adding: string;
  classGroup: string;
  fullName: string;
  grade: string;
  studentNumber: string;
  submit: string;
};

export function CreateStudentForm({
  labels,
}: {
  labels: CreateStudentFormLabels;
}) {
  const [state, formAction] = useActionState(createStudent, initialState);

  return (
    <form action={formAction} className="compact-form grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        {labels.fullName}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="full_name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.grade}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="grade"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.classGroup}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="class_group"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        {labels.studentNumber}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="student_number"
        />
      </label>
      {state.message ? (
        <p
          className={
            state.success
              ? "notice-box notice-success sm:col-span-2"
              : "notice-box notice-danger sm:col-span-2"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton
          addingLabel={labels.adding}
          submitLabel={labels.submit}
        />
      </div>
    </form>
  );
}

function SubmitButton({
  addingLabel,
  submitLabel,
}: {
  addingLabel: string;
  submitLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? addingLabel : submitLabel}
    </button>
  );
}
