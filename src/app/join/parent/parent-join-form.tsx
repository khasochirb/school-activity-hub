"use client";

import { submitKeepingInput } from "@/components/submit-keeping-input";
import { useActionState } from "react";
import type { ParentJoinState } from "@/lib/family/parent-codes";
import { redeemParentInviteCode } from "./actions";

const initialState: ParentJoinState = { message: "", success: false };

export type ParentJoinLabels = {
  confirmPassword: string;
  createAccount: string;
  creatingAccount: string;
  email: string;
  emailHint: string;
  fullName: string;
  inviteCode: string;
  inviteCodePlaceholder: string;
  password: string;
};

export function ParentJoinForm({ labels }: { labels: ParentJoinLabels }) {
  const [state, formAction, pending] = useActionState(redeemParentInviteCode, initialState);
  const field = "h-12 rounded-md border px-3 text-base font-normal outline-none transition";

  return (
    <form onSubmit={submitKeepingInput(formAction)} className="mt-5 flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.inviteCode}
        <input
          autoCapitalize="characters"
          autoComplete="one-time-code"
          className={`${field} font-mono uppercase`}
          name="invite_code"
          placeholder={labels.inviteCodePlaceholder}
          required
          spellCheck={false}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.fullName}
        <input autoComplete="name" className={field} maxLength={120} name="full_name" required />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.email}
        <input
          aria-describedby="parent-email-hint"
          autoComplete="email"
          className={field}
          name="email"
          required
          type="email"
        />
        <span className="text-sm font-normal leading-6 text-slate-600" id="parent-email-hint">
          {labels.emailHint}
        </span>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.password}
        <input autoComplete="new-password" className={field} minLength={8} name="password" required type="password" />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.confirmPassword}
        <input
          autoComplete="new-password"
          className={field}
          minLength={8}
          name="confirm_password"
          required
          type="password"
        />
      </label>
      {state.message ? (
        <p className={state.success ? "notice-box notice-success" : "notice-box notice-danger"} role="status">
          {state.message}
        </p>
      ) : null}
      <Submit busy={pending} label={labels.createAccount} pending={labels.creatingAccount} />
    </form>
  );
}

function Submit({ busy, label, pending }: { busy: boolean; label: string; pending: string }) {
  const status = { pending: busy };

  return (
    <button
      className="btn btn-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
      disabled={status.pending}
      type="submit"
    >
      {status.pending ? pending : label}
    </button>
  );
}
