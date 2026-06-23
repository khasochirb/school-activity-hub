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

export function GenerateInviteForm({
  students,
}: {
  students: ActiveStudent[];
}) {
  const [state, formAction] = useActionState(generateInviteCode, initialState);
  const hasStudents = students.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Active student
        <select
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-900"
          disabled={!hasStudents}
          name="student_roster_id"
          required
        >
          <option value="">Choose a student</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.first_name} {student.last_name}
              {student.grade_level ? `, grade ${student.grade_level}` : ""}
            </option>
          ))}
        </select>
      </label>
      {!hasStudents ? (
        <p className="text-sm text-zinc-600">
          Add an active student before creating invite codes.
        </p>
      ) : null}
      {state.message ? (
        <p
          className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-600"}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      {state.code ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">Plain invite code</p>
          <p className="mt-2 break-all font-mono text-lg font-semibold text-emerald-950">
            {state.code}
          </p>
        </div>
      ) : null}
      <SubmitButton disabled={!hasStudents} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-11 w-full rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Generating..." : "Generate invite code"}
    </button>
  );
}
