"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createStudent, type CreateStudentState } from "./actions";

const initialState: CreateStudentState = {
  message: "",
  success: false,
};

export function CreateStudentForm() {
  const [state, formAction] = useActionState(createStudent, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        Full name
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="full_name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Grade
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="grade"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Class group / homeroom
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="class_group"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        Student number
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
        <SubmitButton />
      </div>
    </form>
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
      {pending ? "Adding..." : "Add student"}
    </button>
  );
}
