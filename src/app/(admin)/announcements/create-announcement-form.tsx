"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAnnouncement,
  type CreateAnnouncementState,
} from "./actions";

const initialState: CreateAnnouncementState = {
  message: "",
  success: false,
};

export function CreateAnnouncementForm() {
  const [state, formAction] = useActionState(
    createAnnouncement,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Title
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="title"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Body
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-900"
          name="body"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:max-w-xs">
        Status
        <select
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-900"
          defaultValue="active"
          name="status"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      {state.message ? (
        <p
          className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-600"}
          role="status"
        >
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
      className="h-11 w-full cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-fit"
      disabled={pending}
      type="submit"
    >
      {pending ? "Posting..." : "Create announcement"}
    </button>
  );
}
