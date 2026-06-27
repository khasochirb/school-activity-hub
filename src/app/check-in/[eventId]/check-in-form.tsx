"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
  };
}) {
  const [state, formAction] = useActionState(checkInToEvent, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input name="event_id" type="hidden" value={eventId} />
      {state.message ? (
        <p
          className={
            state.success ? "text-sm text-emerald-700" : "text-sm text-red-600"
          }
          role="status"
        >
          {state.message}
        </p>
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
  };
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-11 cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      disabled={pending}
      type="submit"
    >
      {pending ? labels.checkingIn : labels.checkIn}
    </button>
  );
}
