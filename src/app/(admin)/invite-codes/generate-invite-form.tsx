"use client";

import { useActionState, useState } from "react";
import { matchesStudent } from "@/lib/students/name-search";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import { generateInviteCode, type GenerateInviteState } from "./actions";

type ActiveStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom?: string | null;
  student_number?: string | null;
};

const initialState: GenerateInviteState = {
  code: null,
  message: "",
  success: false,
};

type GenerateInviteFormLabels = {
  change: string;
  chooseStudent: string;
  noMatches: string;
  searchPlaceholder: string;
  generate: string;
  generating: string;
  gradeOption: string;
  noStudents: string;
  plainCodeLabel: string;
  studentLabel: string;
};

export function GenerateInviteForm({
  labels,
  students,
}: {
  labels: GenerateInviteFormLabels;
  students: ActiveStudent[];
}) {
  const [state, formAction] = useActionState(generateInviteCode, initialState);
  const hasStudents = students.length > 0;
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<ActiveStudent | null>(null);
  // Type part of a name (Cyrillic or Latin) or a class; the first 8 matches.
  const matches = query.trim().length >= 2 ? students.filter((student) => matchesStudent(query, student)).slice(0, 8) : [];
  const describe = (student: ActiveStudent) =>
    [
      student.homeroom ??
        (student.grade_level ? formatLabel(labels.gradeOption, { grade: student.grade_level }) : null),
      student.student_number,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <form action={formAction} className="compact-form-sm flex flex-col gap-3">
      <ActionToast message={state.message} success={state.success} />
      <input name="student_roster_id" type="hidden" value={chosen?.id ?? ""} />
      <div className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        <span id="invite-student-label">{labels.studentLabel}</span>
        {chosen ? (
          <div className="student-pick-chosen">
            <span className="min-w-0">
              <b>
                {chosen.first_name} {chosen.last_name}
              </b>
              <small>{describe(chosen)}</small>
            </span>
            <button
              className="btn btn-quiet min-h-9 px-3"
              onClick={() => {
                setChosen(null);
                setQuery("");
              }}
              type="button"
            >
              {labels.change}
            </button>
          </div>
        ) : (
          <>
            <input
              aria-labelledby="invite-student-label"
              autoComplete="off"
              className="h-11 rounded-md border bg-white px-3 text-base font-normal outline-none transition"
              disabled={!hasStudents}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              type="search"
              value={query}
            />
            {matches.length ? (
              <ul className="student-pick-results" role="listbox">
                {matches.map((student) => (
                  <li key={student.id}>
                    <button aria-selected={false} onClick={() => setChosen(student)} role="option" type="button">
                      <b>
                        {student.first_name} {student.last_name}
                      </b>
                      <small>{describe(student)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 ? (
              <p className="text-sm font-normal text-slate-600">{labels.noMatches}</p>
            ) : null}
          </>
        )}
      </div>
      {!hasStudents ? (
        <p className="notice-box">
          {labels.noStudents}
        </p>
      ) : null}
      {state.message ? (
        <p
          className={
            state.success
              ? "notice-box notice-success"
              : "notice-box notice-danger"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      {state.code ? (
        <div className="notice-box notice-success">
          <p className="text-sm font-bold text-emerald-900">
            {labels.plainCodeLabel}
          </p>
          <p className="mt-2 break-all font-mono text-lg font-semibold text-emerald-950">
            {state.code}
          </p>
        </div>
      ) : null}
      <SubmitButton
        disabled={!hasStudents || !chosen}
        generateLabel={labels.generate}
        generatingLabel={labels.generating}
      />
    </form>
  );
}

function SubmitButton({
  disabled,
  generateLabel,
  generatingLabel,
}: {
  disabled: boolean;
  generateLabel: string;
  generatingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? generatingLabel : generateLabel}
    </button>
  );
}

function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = values[name];

    return value === undefined ? match : String(value);
  });
}
