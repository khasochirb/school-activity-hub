"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { redeemInviteCode, type JoinState } from "./actions";

const initialState: JoinState = {
  message: "",
  success: false,
};

export type JoinFormLabels = {
  createAccount: string;
  creatingAccount: string;
  email: string;
  inviteCode: string;
  inviteCodeHelper: string;
  inviteCodePlaceholder: string;
  password: string;
};

export function JoinForm({ labels }: { labels: JoinFormLabels }) {
  const [state, formAction] = useActionState(redeemInviteCode, initialState);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.inviteCode}
        <input
          autoCapitalize="characters"
          autoComplete="one-time-code"
          className="h-12 rounded-md border px-3 font-mono text-base uppercase outline-none transition"
          name="invite_code"
          placeholder={labels.inviteCodePlaceholder}
          required
          spellCheck={false}
        />
        <span className="text-sm font-normal leading-6 text-slate-600">
          {labels.inviteCodeHelper}
        </span>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.email}
        <input
          className="h-12 rounded-md border px-3 text-base outline-none transition"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.password}
        <input
          className="h-12 rounded-md border px-3 text-base outline-none transition"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
      <SubmitButton
        createAccountLabel={labels.createAccount}
        creatingAccountLabel={labels.creatingAccount}
      />
    </form>
  );
}

function SubmitButton({
  createAccountLabel,
  creatingAccountLabel,
}: {
  createAccountLabel: string;
  creatingAccountLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? creatingAccountLabel : createAccountLabel}
    </button>
  );
}
