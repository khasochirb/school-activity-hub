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
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Title
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="title"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Body
        <textarea
          className="min-h-32 rounded-md border px-3 py-2 text-base outline-none transition"
          name="body"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:max-w-xs">
        Status
        <select
          className="h-11 rounded-md border bg-white px-3 text-base outline-none transition"
          defaultValue="active"
          name="status"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      {state.message ? (
        <p
          className={
            state.success
              ? "notice-box notice-success"
              : "notice-box notice-danger"
          }
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
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      disabled={pending}
      type="submit"
    >
      {pending ? "Posting..." : "Create announcement"}
    </button>
  );
}
