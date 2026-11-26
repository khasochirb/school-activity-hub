"use client";

import { useActionState } from "react";
import { resetStudentSignIn, type ResetSignInState } from "../../reset-actions";

const initialState: ResetSignInState = { code: null, message: "", success: false };

export function ResetSignInForm({
  labels,
  studentId,
}: {
  labels: { codeLabel: string; codeHint: string; confirm: string; working: string };
  studentId: string;
}) {
  const [state, formAction, pending] = useActionState(resetStudentSignIn, initialState);

  if (state.success && state.code) {
    return (
      <div className="notice-box notice-success">
        <p className="text-sm font-bold">{state.message}</p>
        <p className="mt-3 text-sm">{labels.codeLabel}</p>
        <p className="mt-1 break-all font-mono text-2xl font-bold tracking-wider">{state.code}</p>
        <p className="mt-2 text-sm">{labels.codeHint}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="student_id" type="hidden" value={studentId} />
      {state.message ? (
        <p className="notice-box notice-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="btn btn-primary min-h-11 w-full sm:w-fit" disabled={pending} type="submit">
        {pending ? labels.working : labels.confirm}
      </button>
    </form>
  );
}
