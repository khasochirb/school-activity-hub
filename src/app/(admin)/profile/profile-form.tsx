"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type UpdateProfileState } from "./actions";

const initialState: UpdateProfileState = {
  message: "",
  success: false,
};

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Full name
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          defaultValue={fullName}
          name="full_name"
          required
        />
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
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}
