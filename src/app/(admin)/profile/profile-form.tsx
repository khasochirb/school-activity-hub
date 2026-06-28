"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type UpdateProfileState } from "./actions";

const initialState: UpdateProfileState = {
  message: "",
  success: false,
};

type ProfileFormLabels = {
  fullName: string;
  save: string;
  saving: string;
};

export function ProfileForm({
  fullName,
  labels,
}: {
  fullName: string;
  labels: ProfileFormLabels;
}) {
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="compact-form-sm flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.fullName}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          defaultValue={fullName}
          name="full_name"
          required
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
      <SubmitButton labels={labels} />
    </form>
  );
}

function SubmitButton({ labels }: { labels: ProfileFormLabels }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      disabled={pending}
      type="submit"
    >
      {pending ? labels.saving : labels.save}
    </button>
  );
}
