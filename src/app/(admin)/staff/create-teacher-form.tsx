"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTeacher, type CreateTeacherState } from "./actions";

const initialState: CreateTeacherState = {
  message: "",
  success: false,
};

export function CreateTeacherForm() {
  const [state, formAction] = useActionState(createTeacher, initialState);

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
        Email
        <input
          autoComplete="email"
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Temporary password
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          minLength={8}
          name="password"
          required
          type="password"
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
      {pending ? "Creating..." : "Create teacher"}
    </button>
  );
}
