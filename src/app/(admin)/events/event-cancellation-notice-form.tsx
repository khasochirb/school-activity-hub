"use client";

import { useActionState } from "react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ActionToast } from "@/components/toast-provider";
import { EVENT_CANCELLATION_NOTICE_MAX_LENGTH } from "@/lib/events/event-cancellation-notice";
import {
  updateEventCancellationNotice,
  type CreateEventState,
} from "./actions";

const initialState: CreateEventState = { message: "", success: false };

export type EventCancellationNoticeFormLabels = {
  guidance: string;
  label: string;
  placeholder: string;
  save: string;
  saving: string;
};

export function EventCancellationNoticeForm({
  event,
  labels,
}: {
  event: {
    cancellation_notice: string | null;
    id: string;
  };
  labels: EventCancellationNoticeFormLabels;
}) {
  const [state, formAction] = useActionState(
    updateEventCancellationNotice,
    initialState,
  );

  return (
    <form action={formAction} className="compact-form mt-4 flex flex-col gap-3">
      <ActionToast message={state.message} success={state.success} />
      <input name="event_id" type="hidden" value={event.id} />
      <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
        <span className="break-words">{labels.label}</span>
        <textarea
          aria-describedby="detail-cancellation-notice-guidance"
          className="min-h-24 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={event.cancellation_notice ?? ""}
          maxLength={EVENT_CANCELLATION_NOTICE_MAX_LENGTH}
          name="cancellation_notice"
          placeholder={labels.placeholder}
        />
        <FieldError message={state.fieldErrors?.cancellation_notice} />
        <span
          className="break-words text-xs font-normal leading-5 text-slate-600"
          id="detail-cancellation-notice-guidance"
        >
          {labels.guidance}
        </span>
      </label>
      <PendingSubmitButton
        className="btn btn-secondary min-h-10 px-3"
        pendingLabel={labels.saving}
        toastMessage={labels.saving}
      >
        {labels.save}
      </PendingSubmitButton>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="break-words text-xs font-medium text-red-700" role="alert">
      {message}
    </span>
  ) : null;
}
