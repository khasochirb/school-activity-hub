"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createClub, type CreateClubState } from "./actions";

const initialState: CreateClubState = {
  message: "",
  success: false,
};

export function CreateClubForm() {
  const [state, formAction] = useActionState(createClub, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:col-span-2">
        Name
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Category
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="category"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Status
        <select
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-900"
          name="status"
          defaultValue="active"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:col-span-2">
        Description
        <textarea
          className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-900"
          name="description"
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
      {pending ? "Creating..." : "Create club"}
    </button>
  );
}
