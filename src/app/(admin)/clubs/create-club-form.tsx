"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ACTIVITY_CATEGORIES } from "@/lib/activity-categories";
import { createClub, type CreateClubState } from "./actions";

const initialState: CreateClubState = {
  message: "",
  success: false,
};

export function CreateClubForm() {
  const [state, formAction] = useActionState(createClub, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        Name
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Category
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
          name="category"
        >
          <option value="">No category</option>
          {ACTIVITY_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Status
        <select
          className="h-11 rounded-md border bg-white px-3 text-base outline-none transition"
          name="status"
          defaultValue="active"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        Description
        <textarea
          className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
          name="description"
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
      {pending ? "Creating club..." : "Create club"}
    </button>
  );
}
