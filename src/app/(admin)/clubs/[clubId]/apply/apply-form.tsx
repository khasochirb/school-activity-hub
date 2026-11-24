"use client";

import { submitKeepingInput } from "@/components/submit-keeping-input";
import { useActionState } from "react";
import type { JoinQuestion } from "@/lib/clubs/join-form";
import { submitJoinRequest, type JoinActionState } from "../../join-actions";

const initialState: JoinActionState = { message: "", success: false };

export type ApplyFormLabels = {
  intro: string;
  noQuestions: string;
  optional: string;
  send: string;
  sending: string;
};

// The club's application form as the student fills it in.
export function ApplyForm({
  clubId,
  labels,
  questions,
}: {
  clubId: string;
  labels: ApplyFormLabels;
  questions: Array<JoinQuestion & { id: string }>;
}) {
  const [state, formAction, pending] = useActionState(submitJoinRequest, initialState);

  return (
    <form onSubmit={submitKeepingInput(formAction)} className="join-apply">
      <input name="club_id" type="hidden" value={clubId} />
      <p className="join-apply-intro">{questions.length ? labels.intro : labels.noQuestions}</p>
      {questions.map((question, index) => {
        const name = `q_${question.id}`;
        const invalid = state.questionId === question.id;

        return (
          <fieldset aria-invalid={invalid || undefined} className="join-q" key={question.id}>
            <legend>
              <span className="join-q-num">{index + 1}</span>
              {question.prompt}
              {question.required ? (
                <span aria-hidden="true" className="join-q-req">*</span>
              ) : (
                <span className="join-q-opt">{labels.optional}</span>
              )}
            </legend>
            {question.kind === "short" ? (
              <input maxLength={300} name={name} required={question.required} />
            ) : question.kind === "long" ? (
              <textarea maxLength={2000} name={name} required={question.required} rows={4} />
            ) : (
              <div className="join-q-options">
                {question.options.map((option) => (
                  <label key={option}>
                    <input
                      name={name}
                      required={question.kind === "choice" && question.required}
                      type={question.kind === "choice" ? "radio" : "checkbox"}
                      value={option}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
            {invalid ? <p className="join-q-error">{state.message}</p> : null}
          </fieldset>
        );
      })}
      {state.message && !state.questionId && !state.success ? (
        <p className="notice-box notice-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <Submit busy={pending} label={labels.send} pending={labels.sending} />
    </form>
  );
}

function Submit({ busy, label, pending }: { busy: boolean; label: string; pending: string }) {
  const status = { pending: busy };

  return (
    <button className="btn btn-primary min-h-11 w-full sm:w-auto" disabled={status.pending} type="submit">
      {status.pending ? pending : label}
    </button>
  );
}
