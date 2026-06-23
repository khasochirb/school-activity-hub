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
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:col-span-2">
        Full name
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="full_name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Grade
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="grade"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Class group / homeroom
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="class_group"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:col-span-2">
        Student number
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="student_number"
        />
      </label>
      {state.message ? (
        <p
          className={
            state.success
              ? "text-sm text-emerald-700 sm:col-span-2"
              : "text-sm text-red-600 sm:col-span-2"
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
      className="h-11 w-full rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? "Adding..." : "Add student"}
    </button>
  );
}
