"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generateInviteCode, type GenerateInviteState } from "./actions";

type ActiveStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
};

const initialState: GenerateInviteState = {
  code: null,
  message: "",
  success: false,
};

type GenerateInviteFormLabels = {
  chooseStudent: string;
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

  return (
    <form action={formAction} className="compact-form-sm flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.studentLabel}
        <select
          className="h-11 rounded-md border bg-white px-3 text-base outline-none transition"
          disabled={!hasStudents}
          name="student_roster_id"
          required
        >
          <option value="">{labels.chooseStudent}</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.first_name} {student.last_name}
              {student.grade_level
                ? `, ${formatLabel(labels.gradeOption, {
                    grade: student.grade_level,
                  })}`
                : ""}
            </option>
          ))}
        </select>
      </label>
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
        disabled={!hasStudents}
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
