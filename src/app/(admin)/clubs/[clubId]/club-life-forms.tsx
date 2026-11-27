"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitKeepingInput } from "@/components/submit-keeping-input";
import type { AttendanceStatus, ClubMeeting, ClubMember } from "@/lib/clubs/club-life";
import { postToClub, saveClubMeeting, type ClubLifeState } from "../club-life-actions";

const initialState: ClubLifeState = { message: "", success: false };

// The leader's box for posting an update to the members.
export function ClubPostForm({
  clubId,
  labels,
}: {
  clubId: string;
  labels: { placeholder: string; post: string; posting: string };
}) {
  const [state, formAction, pending] = useActionState(postToClub, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form className="club-post-form" onSubmit={submitKeepingInput(formAction)} ref={formRef}>
      <input name="club_id" type="hidden" value={clubId} />
      <textarea maxLength={2000} name="body" placeholder={labels.placeholder} required rows={3} />
      <div className="club-post-form-foot">
        {state.message ? (
          <span className={state.success ? "club-form-ok" : "club-form-error"} role="status">
            {state.message}
          </span>
        ) : (
          <span />
        )}
        <button className="btn btn-primary min-h-10" disabled={pending} type="submit">
          {pending ? labels.posting : labels.post}
        </button>
      </div>
    </form>
  );
}

const STATUSES: AttendanceStatus[] = ["present", "absent", "excused"];

// Taking attendance at one meeting. Picking a date that already has a meeting
// loads what was marked then, so it can be corrected.
export function ClubAttendanceForm({
  clubId,
  labels,
  meetings,
  members,
  today,
}: {
  clubId: string;
  labels: {
    allPresent: string;
    date: string;
    note: string;
    notePlaceholder: string;
    save: string;
    saving: string;
    statuses: Record<AttendanceStatus, string>;
  };
  meetings: ClubMeeting[];
  members: ClubMember[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(saveClubMeeting, initialState);
  const [date, setDate] = useState(today);
  const existing = meetings.find((meeting) => meeting.date === date) ?? null;
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() => existing?.statuses ?? {});

  // A different date: start from what was saved for it, or everyone present.
  function pickDate(next: string) {
    setDate(next);
    setStatuses(meetings.find((meeting) => meeting.date === next)?.statuses ?? {});
  }

  const statusOf = (rosterId: string) => statuses[rosterId] ?? "present";

  return (
    <form className="club-attendance-form" onSubmit={submitKeepingInput(formAction)}>
      <input name="club_id" type="hidden" value={clubId} />
      <div className="club-attendance-head">
        <label>
          <span>{labels.date}</span>
          <input max={today} name="meeting_date" onChange={(event) => pickDate(event.target.value)} required type="date" value={date} />
        </label>
        <label className="grow">
          <span>{labels.note}</span>
          <input defaultValue={existing?.note ?? ""} key={date} maxLength={300} name="note" placeholder={labels.notePlaceholder} />
        </label>
      </div>
      <button className="join-link-btn" onClick={() => setStatuses({})} type="button">
        {labels.allPresent}
      </button>
      <ul className="club-attendance-list">
        {members.map((member) => (
          <li key={member.rosterId}>
            <span className="min-w-0">
              <b>{member.name}</b>
              <small>{member.homeroom ?? ""}</small>
            </span>
            <span className="club-attendance-choice" role="radiogroup" aria-label={member.name}>
              {STATUSES.map((status) => (
                <label data-status={status} key={status}>
                  <input
                    checked={statusOf(member.rosterId) === status}
                    name={`status_${member.rosterId}`}
                    onChange={() => setStatuses((current) => ({ ...current, [member.rosterId]: status }))}
                    type="radio"
                    value={status}
                  />
                  <span>{labels.statuses[status]}</span>
                </label>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="club-post-form-foot">
        {state.message ? (
          <span className={state.success ? "club-form-ok" : "club-form-error"} role="status">
            {state.message}
          </span>
        ) : (
          <span />
        )}
        <button className="btn btn-primary min-h-11" disabled={pending} type="submit">
          {pending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}
