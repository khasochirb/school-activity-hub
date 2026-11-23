"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ParentJoinState } from "@/lib/family/parent-codes";
import { addChildWithCode } from "./actions";

const initialState: ParentJoinState = { message: "", success: false };

export function AddChildForm({
  labels,
}: {
  labels: { code: string; placeholder: string; submit: string; submitting: string };
}) {
  const [state, formAction] = useActionState(addChildWithCode, initialState);

  return (
    <form action={formAction} className="family-add">
      <label>
        <span>{labels.code}</span>
        <input
          autoCapitalize="characters"
          autoComplete="one-time-code"
          className="font-mono uppercase"
          name="invite_code"
          placeholder={labels.placeholder}
          required
          spellCheck={false}
        />
      </label>
      <Submit label={labels.submit} pending={labels.submitting} />
      {state.message ? (
        <p className={state.success ? "notice-box notice-success" : "notice-box notice-danger"} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function Submit({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();

  return (
    <button className="btn btn-secondary min-h-11" disabled={status.pending} type="submit">
      {status.pending ? pending : label}
    </button>
  );
}
