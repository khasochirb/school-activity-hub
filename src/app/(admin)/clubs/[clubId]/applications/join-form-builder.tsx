"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  MAX_OPTIONS,
  MAX_QUESTIONS,
  QUESTION_KINDS,
  isChoiceKind,
  type JoinMode,
  type JoinQuestion,
  type QuestionKind,
} from "@/lib/clubs/join-form";
import { saveJoinForm, type JoinActionState } from "../../join-actions";

const initialState: JoinActionState = { message: "", success: false };

export type JoinFormBuilderLabels = {
  addOption: string;
  addQuestion: string;
  apply: string;
  applyHint: string;
  delete: string;
  empty: string;
  kinds: Record<QuestionKind, string>;
  mode: string;
  moveDown: string;
  moveUp: string;
  open: string;
  openHint: string;
  option: string;
  optionPlaceholder: string;
  prompt: string;
  promptPlaceholder: string;
  questions: string;
  questionsHint: string;
  removeOption: string;
  required: string;
  save: string;
  saving: string;
  type: string;
};

type Draft = JoinQuestion & { key: string };


// The club leader or supervising teacher builds the application form here:
// short answer, paragraph, one choice or several, each required or optional,
// in any order. Saved as a whole with the join mode.
export function JoinFormBuilder({
  clubId,
  initialMode,
  initialQuestions,
  labels,
}: {
  clubId: string;
  initialMode: JoinMode;
  initialQuestions: JoinQuestion[];
  labels: JoinFormBuilderLabels;
}) {
  const [state, formAction] = useActionState(saveJoinForm, initialState);
  const [mode, setMode] = useState<JoinMode>(initialMode);
  // Keys for saved questions come from their position, so the server and
  // the browser render the same ids; new questions count on from there.
  const [questions, setQuestions] = useState<Draft[]>(() =>
    initialQuestions.map((question, index) => ({ ...question, key: `q${index}` })),
  );
  const counter = useRef(initialQuestions.length);
  const newKey = () => `q${(counter.current += 1)}`;
  const baseId = useId();

  const update = (key: string, change: Partial<Draft>) =>
    setQuestions((current) => current.map((q) => (q.key === key ? { ...q, ...change } : q)));
  const move = (index: number, by: number) =>
    setQuestions((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  const add = (kind: QuestionKind) =>
    setQuestions((current) => [
      ...current,
      { key: newKey(), kind, options: isChoiceKind(kind) ? ["", ""] : [], prompt: "", required: true },
    ]);

  return (
    <form action={formAction} className="join-builder">
      <ActionToast message={state.message} success={state.success} />
      <input name="club_id" type="hidden" value={clubId} />
      <input
        name="questions"
        type="hidden"
        value={JSON.stringify(
          questions.map(({ kind, options, prompt, required }) => ({ kind, options, prompt, required })),
        )}
      />

      <fieldset className="join-mode">
        <legend>{labels.mode}</legend>
        {(["apply", "open"] as const).map((option) => (
          <label data-checked={mode === option ? "" : undefined} key={option}>
            <input
              checked={mode === option}
              name="join_mode"
              onChange={() => setMode(option)}
              type="radio"
              value={option}
            />
            <span>
              <b>{option === "apply" ? labels.apply : labels.open}</b>
              <small>{option === "apply" ? labels.applyHint : labels.openHint}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <section aria-disabled={mode === "open" || undefined} className="join-builder-questions">
        <header>
          <h3>{labels.questions}</h3>
          <p>{labels.questionsHint}</p>
        </header>

        {questions.length ? null : <p className="join-builder-empty">{labels.empty}</p>}

        <ol>
          {questions.map((question, index) => {
            const promptId = `${baseId}-${question.key}-prompt`;
            const typeId = `${baseId}-${question.key}-type`;

            return (
              <li className="join-builder-q" key={question.key}>
                <div className="join-builder-q-top">
                  <span className="join-q-num">{index + 1}</span>
                  <label className="sr-only" htmlFor={promptId}>
                    {labels.prompt}
                  </label>
                  <input
                    id={promptId}
                    maxLength={300}
                    onChange={(event) => update(question.key, { prompt: event.target.value })}
                    placeholder={labels.promptPlaceholder}
                    value={question.prompt}
                  />
                  <label className="sr-only" htmlFor={typeId}>
                    {labels.type}
                  </label>
                  <select
                    id={typeId}
                    onChange={(event) => {
                      const kind = event.target.value as QuestionKind;
                      update(question.key, {
                        kind,
                        options: isChoiceKind(kind)
                          ? question.options.length >= 2
                            ? question.options
                            : ["", ""]
                          : [],
                      });
                    }}
                    value={question.kind}
                  >
                    {QUESTION_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {labels.kinds[kind]}
                      </option>
                    ))}
                  </select>
                </div>

                {isChoiceKind(question.kind) ? (
                  <ul className="join-builder-options">
                    {question.options.map((option, optionIndex) => (
                      <li key={optionIndex}>
                        <span aria-hidden="true" data-kind={question.kind} />
                        <input
                          aria-label={`${labels.option} ${optionIndex + 1}`}
                          maxLength={120}
                          onChange={(event) =>
                            update(question.key, {
                              options: question.options.map((value, i) =>
                                i === optionIndex ? event.target.value : value,
                              ),
                            })
                          }
                          placeholder={`${labels.optionPlaceholder} ${optionIndex + 1}`}
                          value={option}
                        />
                        <button
                          aria-label={labels.removeOption}
                          className="join-icon-btn"
                          disabled={question.options.length <= 2}
                          onClick={() =>
                            update(question.key, {
                              options: question.options.filter((_, i) => i !== optionIndex),
                            })
                          }
                          type="button"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                    {question.options.length < MAX_OPTIONS ? (
                      <li>
                        <button
                          className="join-link-btn"
                          onClick={() => update(question.key, { options: [...question.options, ""] })}
                          type="button"
                        >
                          + {labels.addOption}
                        </button>
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <div aria-hidden="true" className="join-builder-preview" data-kind={question.kind} />
                )}

                <div className="join-builder-q-foot">
                  <label className="join-switch">
                    <input
                      checked={question.required}
                      onChange={(event) => update(question.key, { required: event.target.checked })}
                      type="checkbox"
                    />
                    <span>{labels.required}</span>
                  </label>
                  <span className="join-builder-tools">
                    <button
                      aria-label={labels.moveUp}
                      className="join-icon-btn"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={labels.moveDown}
                      className="join-icon-btn"
                      disabled={index === questions.length - 1}
                      onClick={() => move(index, 1)}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      className="join-link-btn"
                      data-tone="danger"
                      onClick={() => setQuestions((current) => current.filter((q) => q.key !== question.key))}
                      type="button"
                    >
                      {labels.delete}
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {questions.length < MAX_QUESTIONS ? (
          <div className="join-builder-add">
            <span>{labels.addQuestion}:</span>
            {QUESTION_KINDS.map((kind) => (
              <button className="cl-chip" key={kind} onClick={() => add(kind)} type="button">
                + {labels.kinds[kind]}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {state.message && !state.success ? (
        <p className="notice-box notice-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <SaveButton label={labels.save} pending={labels.saving} />
    </form>
  );
}

function SaveButton({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();

  return (
    <button className="btn btn-primary min-h-11 w-full sm:w-auto" disabled={status.pending} type="submit">
      {status.pending ? pending : label}
    </button>
  );
}
