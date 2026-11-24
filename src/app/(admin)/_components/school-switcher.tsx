"use client";

import { useActionState, useRef } from "react";
import { switchSchool, type SwitchSchoolState } from "../switch-school-actions";

const initialState: SwitchSchoolState = { message: "" };

// For platform admins: which school the whole app is showing. Picking another
// school switches everything to that school; nothing from two schools mixes.
export function SchoolSwitcher({
  currentSchoolId,
  label,
  schools,
}: {
  currentSchoolId: string;
  label: string;
  schools: Array<{ id: string; isDemo: boolean; name: string }>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(switchSchool, initialState);

  return (
    <form action={formAction} className="school-switcher" ref={formRef}>
      <label>
        <span className="sr-only">{label}</span>
        <select
          aria-label={label}
          defaultValue={currentSchoolId}
          name="school_id"
          onChange={() => formRef.current?.requestSubmit()}
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
              {school.isDemo ? " (demo)" : ""}
            </option>
          ))}
        </select>
      </label>
      {state.message ? <p role="alert">{state.message}</p> : null}
    </form>
  );
}

// "Switch to this school" on a school's console page.
export function SwitchToSchoolButton({
  disabled,
  label,
  schoolId,
}: {
  disabled: boolean;
  label: string;
  schoolId: string;
}) {
  const [state, formAction] = useActionState(switchSchool, initialState);

  return (
    <form action={formAction}>
      <input name="school_id" type="hidden" value={schoolId} />
      <button className="btn btn-primary" disabled={disabled} type="submit">
        {label}
      </button>
      {state.message ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
