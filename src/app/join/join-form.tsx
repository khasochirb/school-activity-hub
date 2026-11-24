"use client";

import { submitKeepingInput } from "@/components/submit-keeping-input";
import { useActionState } from "react";
import { ActionToast } from "@/components/toast-provider";
import { redeemInviteCode, type JoinState } from "./actions";

const initialState: JoinState = {
  message: "",
  success: false,
};

export type JoinFormLabels = {
  confirmPassword: string;
  createAccount: string;
  creatingAccount: string;
  email: string;
  emailHint: string;
  inviteCode: string;
  inviteCodePlaceholder: string;
  password: string;
};

export function JoinForm({ labels }: { labels: JoinFormLabels }) {
  const [state, formAction, pending] = useActionState(redeemInviteCode, initialState);

  return (
    <form onSubmit={submitKeepingInput(formAction)} className="mt-5 flex flex-col gap-3">
      <ActionToast message={state.message} success={state.success} />
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
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.email}
        <input
          className="h-12 rounded-md border px-3 text-base outline-none transition"
          name="email"
          type="email"
          autoComplete="email"
          aria-describedby="join-email-hint"
          required
        />
        <span className="text-sm font-normal leading-6 text-slate-600" id="join-email-hint">
          {labels.emailHint}
        </span>
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
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.confirmPassword}
        <input
          className="h-12 rounded-md border px-3 text-base outline-none transition"
          name="confirm_password"
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
        pending={pending}
        createAccountLabel={labels.createAccount}
        creatingAccountLabel={labels.creatingAccount}
      />
    </form>
  );
}

function SubmitButton({
  pending,
  createAccountLabel,
  creatingAccountLabel,
}: {
  pending: boolean;
  createAccountLabel: string;
  creatingAccountLabel: string;
}) {

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
