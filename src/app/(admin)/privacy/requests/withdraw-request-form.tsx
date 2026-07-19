"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  withdrawDataRightsRequest,
  type DataRightsActionState,
} from "./actions";

const initialState: DataRightsActionState = { message: "", success: false };

export function WithdrawRequestForm({
  labels,
  requestId,
}: {
  labels: { withdraw: string; withdrawing: string };
  requestId: string;
}) {
  const [state, formAction] = useActionState(
    withdrawDataRightsRequest,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <ActionToast message={state.message} success={state.success} />
      <input name="request_id" type="hidden" value={requestId} />
      <WithdrawButton labels={labels} />
      {state.message && !state.success ? (
        <p className="text-sm text-red-700" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function WithdrawButton({ labels }: { labels: { withdraw: string; withdrawing: string } }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-secondary min-h-10 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? labels.withdrawing : labels.withdraw}
    </button>
  );
}
