"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { redeemInviteCode, type JoinState } from "./actions";

const initialState: JoinState = {
  message: "",
  success: false,
};

export function JoinForm() {
  const [state, formAction] = useActionState(redeemInviteCode, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Invite code
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 font-mono text-base uppercase outline-none transition focus:border-zinc-900"
          name="invite_code"
          placeholder="ABCD-EFGH-IJ"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Email
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Password
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
      className="h-11 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "Creating account..." : "Create student account"}
    </button>
  );
}
