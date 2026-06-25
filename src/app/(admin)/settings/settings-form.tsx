"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateSchoolSettings,
  type UpdateSchoolSettingsState,
} from "./actions";

const initialState: UpdateSchoolSettingsState = {
  message: "",
  success: false,
};

export function SchoolSettingsForm({
  name,
  province,
}: {
  name: string;
  province: string | null;
}) {
  const [state, formAction] = useActionState(
    updateSchoolSettings,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        School name
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          defaultValue={name}
          name="name"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        Province
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          defaultValue={province ?? ""}
          name="province"
          placeholder="British Columbia"
        />
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
      {pending ? "Saving..." : "Save school settings"}
    </button>
  );
}
