"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createFirstSchool, type SetupState } from "./actions";

const initialState: SetupState = {
  message: "",
};

export function SetupForm() {
  const [state, formAction] = useActionState(createFirstSchool, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        School name
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        School slug
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="slug"
          placeholder="my-school"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Timezone
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="timezone"
          defaultValue="America/Vancouver"
          required
        />
      </label>
      {state.message ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-11 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "Creating..." : "Create school"}
    </button>
  );
}
