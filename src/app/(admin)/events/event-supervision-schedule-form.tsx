"use client";

import { useActionState } from "react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ActionToast } from "@/components/toast-provider";
import {
  EVENT_SCHEDULE_NOTICE_MAX_LENGTH,
  EVENT_SUPERVISION_MAX_LENGTH,
} from "@/lib/events/event-supervision-schedule";
import {
  updateEventSupervisionSchedule,
  type CreateEventState,
} from "./actions";

const initialState: CreateEventState = { message: "", success: false };

export type EventSupervisionScheduleFormLabels = {
  save: string;
  saving: string;
  scheduleChangeNotice: string;
  scheduleNoticeGuidance: string;
  scheduleNoticePlaceholder: string;
  supervisionGuidance: string;
  supervisionInformation: string;
  supervisionPlaceholder: string;
};

export function EventSupervisionScheduleForm({
  event,
  labels,
}: {
  event: {
    id: string;
    schedule_change_notice: string | null;
    supervision_information: string | null;
  };
  labels: EventSupervisionScheduleFormLabels;
}) {
  const [state, formAction] = useActionState(
    updateEventSupervisionSchedule,
    initialState,
  );

  return (
    <form action={formAction} className="compact-form mt-4 flex flex-col gap-3">
      <ActionToast message={state.message} success={state.success} />
      <input name="event_id" type="hidden" value={event.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
          <span className="break-words">{labels.supervisionInformation}</span>
          <textarea
            aria-describedby="detail-supervision-guidance"
            className="min-h-24 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
            defaultValue={event.supervision_information ?? ""}
            maxLength={EVENT_SUPERVISION_MAX_LENGTH}
            name="supervision_information"
            placeholder={labels.supervisionPlaceholder}
          />
          <FieldError message={state.fieldErrors?.supervision_information} />
          <span
            className="break-words text-xs font-normal leading-5 text-slate-600"
            id="detail-supervision-guidance"
          >
            {labels.supervisionGuidance}
          </span>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
          <span className="break-words">{labels.scheduleChangeNotice}</span>
          <textarea
            aria-describedby="detail-schedule-notice-guidance"
            className="min-h-24 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
            defaultValue={event.schedule_change_notice ?? ""}
            maxLength={EVENT_SCHEDULE_NOTICE_MAX_LENGTH}
            name="schedule_change_notice"
            placeholder={labels.scheduleNoticePlaceholder}
          />
          <FieldError message={state.fieldErrors?.schedule_change_notice} />
          <span
            className="break-words text-xs font-normal leading-5 text-slate-600"
            id="detail-schedule-notice-guidance"
          >
            {labels.scheduleNoticeGuidance}
          </span>
        </label>
      </div>
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
