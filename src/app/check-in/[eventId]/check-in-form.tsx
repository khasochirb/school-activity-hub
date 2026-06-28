"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import { checkInToEvent, type CheckInState } from "./actions";

const initialState: CheckInState = {
  message: "",
  success: false,
};

export function CheckInForm({
  eventId,
  labels,
}: {
  eventId: string;
  labels: {
    checkIn: string;
    checkingIn: string;
    failedTitle: string;
    helpText: string;
  };
}) {
  const [state, formAction] = useActionState(checkInToEvent, initialState);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-3">
      <ActionToast message={state.message} success={state.success} />
      <input name="event_id" type="hidden" value={eventId} />
      {state.message ? (
        <div
          className={
            state.success
              ? "notice-box notice-success"
              : "notice-box notice-danger"
          }
          role="status"
        >
          {state.success ? null : (
            <p className="text-lg font-bold">{labels.failedTitle}</p>
          )}
          <p className={state.success ? "text-lg font-bold" : "mt-1 leading-6"}>
            {state.message}
          </p>
          <p className="mt-2 text-sm leading-6">{labels.helpText}</p>
        </div>
      ) : null}
      {state.success ? null : <SubmitButton labels={labels} />}
    </form>
  );
}

function SubmitButton({
  labels,
}: {
  labels: {
    checkIn: string;
    checkingIn: string;
    failedTitle: string;
    helpText: string;
  };
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? labels.checkingIn : labels.checkIn}
    </button>
  );
}
