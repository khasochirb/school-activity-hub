"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTeacher, type CreateTeacherState } from "./actions";

const initialState: CreateTeacherState = {
  message: "",
  success: false,
};

type CreateTeacherFormLabels = {
  create: string;
  creating: string;
  email: string;
  fullName: string;
  temporaryPassword: string;
};

export function CreateTeacherForm({
  labels,
}: {
  labels: CreateTeacherFormLabels;
}) {
  const [state, formAction] = useActionState(createTeacher, initialState);

  return (
    <form action={formAction} className="compact-form-lg grid gap-3 md:grid-cols-3">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.fullName}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="full_name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.email}
        <input
          autoComplete="email"
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.temporaryPassword}
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
              ? "notice-box notice-success md:col-span-3"
              : "notice-box notice-danger md:col-span-3"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <div className="md:col-span-3">
        <SubmitButton labels={labels} />
      </div>
    </form>
  );
}

function SubmitButton({ labels }: { labels: CreateTeacherFormLabels }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? labels.creating : labels.create}
    </button>
  );
}
