"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  bulkGenerateInviteCodes,
  type BulkGenerateInviteState,
} from "./actions";

type ActiveStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom: string | null;
  student_number: string | null;
  profile_id: string | null;
};

const initialState: BulkGenerateInviteState = {
  codes: [],
  csv: "",
  message: "",
  success: false,
  text: "",
};

export function BulkGenerateInviteForm({
  students,
}: {
  students: ActiveStudent[];
}) {
  const [state, formAction] = useActionState(
    bulkGenerateInviteCodes,
    initialState,
  );
  const [mode, setMode] = useState("all_unlinked");
  const eligibleStudents = students.filter((student) => !student.profile_id);
  const gradeOptions = useMemo(
    () => uniqueOptions(eligibleStudents.map((student) => student.grade_level)),
    [eligibleStudents],
  );
  const classGroupOptions = useMemo(
    () => uniqueOptions(eligibleStudents.map((student) => student.homeroom)),
    [eligibleStudents],
  );
  const hasEligibleStudents = eligibleStudents.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-slate-800">
            Generation scope
          </legend>
          <RadioOption
            checked={mode === "all_unlinked"}
            description="Every active roster student who has not registered yet."
            label="All unlinked active students"
            name="bulk_mode"
            onChange={() => setMode("all_unlinked")}
            value="all_unlinked"
          />
          <RadioOption
            checked={mode === "filtered"}
            description="Limit by grade, class group, or both."
            label="By grade or class group"
            name="bulk_mode"
            onChange={() => setMode("filtered")}
            value="filtered"
          />
          <RadioOption
            checked={mode === "selected"}
            description="Choose individual unlinked active students."
            label="Selected students"
            name="bulk_mode"
            onChange={() => setMode("selected")}
            value="selected"
          />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            Grade
            <select
              className="h-11 rounded-md border bg-white px-3 text-base outline-none transition disabled:bg-slate-100"
              disabled={mode !== "filtered" || !gradeOptions.length}
              name="grade"
            >
              <option value="">Any grade</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            Class group
            <select
              className="h-11 rounded-md border bg-white px-3 text-base outline-none transition disabled:bg-slate-100"
              disabled={mode !== "filtered" || !classGroupOptions.length}
              name="class_group"
            >
              <option value="">Any class group</option>
              {classGroupOptions.map((classGroup) => (
                <option key={classGroup} value={classGroup}>
                  {classGroup}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-md border border-slate-200">
          <div className="border-b border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Select students
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Only active students without linked profiles are listed.
            </p>
          </div>
          {hasEligibleStudents ? (
            <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
              {eligibleStudents.map((student) => (
                <label
                  className="flex cursor-pointer items-start gap-3 p-4 text-sm"
                  key={student.id}
                >
                  <input
                    className="mt-1 cursor-pointer"
                    disabled={mode !== "selected"}
                    name="student_roster_ids"
                    type="checkbox"
                    value={student.id}
                  />
                  <span>
                    <span className="font-semibold text-slate-950">
                      {studentName(student)}
                    </span>
                    <span className="mt-1 block text-slate-600">
                      Grade {student.grade_level || "-"}
                      {student.homeroom ? `, ${student.homeroom}` : ""}
                      {student.student_number
                        ? `, ${student.student_number}`
                        : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-slate-600">
              No active unlinked students are available for bulk invite codes.
            </p>
          )}
        </div>

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

        <SubmitButton disabled={!hasEligibleStudents} />
      </form>

      {state.codes.length ? (
        <GeneratedCodesPanel csv={state.csv} text={state.text} />
      ) : null}
    </div>
  );
}

function RadioOption({
  checked,
  description,
  label,
  name,
  onChange,
  value,
}: {
  checked: boolean;
  description: string;
  label: string;
  name: string;
  onChange: () => void;
  value: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 transition hover:border-teal-200 hover:bg-teal-50">
      <input
        checked={checked}
        className="mt-1 cursor-pointer"
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm text-slate-600">{description}</span>
      </span>
    </label>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Generating..." : "Bulk generate invite codes"}
    </button>
  );
}

function GeneratedCodesPanel({ csv, text }: { csv: string; text: string }) {
  return (
    <div className="notice-box notice-success">
      <p className="text-sm font-bold text-emerald-900">
        Generated invite codes
      </p>
      <textarea
        className="mt-3 min-h-40 w-full rounded-md border border-emerald-200 bg-white p-3 font-mono text-sm text-emerald-950"
        readOnly
        value={text}
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          className="btn btn-primary"
          onClick={() => void navigator.clipboard.writeText(text)}
          type="button"
        >
          Copy text list
        </button>
        <button
          className="btn btn-secondary border-emerald-300 text-emerald-900 hover:bg-emerald-100"
          onClick={() => downloadCsv(csv)}
          type="button"
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "invite-codes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function uniqueOptions(values: Array<string | null>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((first, second) => first.localeCompare(second));
}

function studentName(student: ActiveStudent) {
  return `${student.first_name} ${student.last_name}`;
}
