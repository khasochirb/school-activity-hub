"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LEAVE_REASONS, type LeaveReason } from "@/lib/clubs/leave-form";
import { submitLeaveRequest, type LeaveActionState } from "../../leave-actions";

const initialState: LeaveActionState = { message: "", success: false };

export type LeaveFormLabels = {
  feedback: string;
  feedbackHint: string;
  optional: string;
  reason: string;
  reasonDetail: string;
  reasonDetailHint: string;
  reasons: Record<LeaveReason, string>;
  send: string;
  sending: string;
};

// Why the student is leaving, and anything they want the club to know.
export function LeaveForm({ clubId, labels }: { clubId: string; labels: LeaveFormLabels }) {
  const [state, formAction] = useActionState(submitLeaveRequest, initialState);

  return (
    <form action={formAction} className="join-apply">
      <input name="club_id" type="hidden" value={clubId} />
      <fieldset className="join-q">
        <legend>
          <span className="join-q-num">1</span>
          {labels.reason}
          <span aria-hidden="true" className="join-q-req">*</span>
        </legend>
        <div className="join-q-options">
          {LEAVE_REASONS.map((reason) => (
            <label key={reason}>
              <input name="reason_kind" required type="radio" value={reason} />
              <span>{labels.reasons[reason]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="join-q">
        <legend>
          <span className="join-q-num">2</span>
          {labels.reasonDetail}
          <span aria-hidden="true" className="join-q-req">*</span>
        </legend>
        <p className="join-q-hint">{labels.reasonDetailHint}</p>
        <textarea maxLength={1000} name="reason" required rows={3} />
      </fieldset>
      <fieldset className="join-q">
        <legend>
          <span className="join-q-num">3</span>
          {labels.feedback}
          <span className="join-q-opt">{labels.optional}</span>
        </legend>
        <p className="join-q-hint">{labels.feedbackHint}</p>
        <textarea maxLength={2000} name="feedback" rows={4} />
      </fieldset>
      {state.message && !state.success ? (
        <p className="notice-box notice-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <Submit label={labels.send} pending={labels.sending} />
    </form>
  );
}

function Submit({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();

  return (
    <button className="btn btn-secondary min-h-11 w-full sm:w-auto" disabled={status.pending} type="submit">
      {status.pending ? pending : label}
    </button>
  );
}
