"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { ActionToast } from "@/components/toast-provider";
import {
  CLUB_PROFILE_LIMITS,
  CLUB_PROFILE_THEMES,
  type ClubProfileField,
  type ClubProfileTheme,
  type ClubProfileValues,
} from "@/lib/clubs/club-profile";
import {
  updateClubProfile,
  type UpdateClubProfileState,
} from "./actions";

type ClubProfileFormLabels = {
  cancel: string;
  characterCount: string;
  fields: Record<ClubProfileField, string>;
  save: string;
  saving: string;
  themeDescription: string;
  themes: Record<ClubProfileTheme, string>;
};

export function ClubProfileForm({
  clubId,
  initialValues,
  labels,
}: {
  clubId: string;
  initialValues: ClubProfileValues;
  labels: ClubProfileFormLabels;
}) {
  const initialState: UpdateClubProfileState = {
    fieldErrors: {},
    message: "",
    success: false,
    values: initialValues,
  };
  const [state, formAction] = useActionState(updateClubProfile, initialState);
  const [values, setValues] = useState(initialValues);

  function updateValue(field: ClubProfileField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function visibleError(field: ClubProfileField) {
    return values[field] === state.values[field]
      ? state.fieldErrors[field]
      : undefined;
  }

  return (
    <form action={formAction} className="compact-form-xl grid gap-5">
      <ActionToast message={state.message} success={state.success} />
      <input name="club_id" type="hidden" value={clubId} />

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileTextField
          error={visibleError("tagline")}
          field="tagline"
          label={labels.fields.tagline}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.tagline}
          onChange={updateValue}
          value={values.tagline}
        />
        <ProfileTextField
          error={visibleError("meetingSchedule")}
          field="meetingSchedule"
          label={labels.fields.meetingSchedule}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.meetingSchedule}
          onChange={updateValue}
          value={values.meetingSchedule}
        />
        <ProfileTextField
          error={visibleError("meetingLocation")}
          field="meetingLocation"
          label={labels.fields.meetingLocation}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.meetingLocation}
          onChange={updateValue}
          value={values.meetingLocation}
        />
      </div>

      <ProfileTextField
        error={visibleError("about")}
        field="about"
        label={labels.fields.about}
        labels={labels}
        limit={CLUB_PROFILE_LIMITS.about}
        multiline
        onChange={updateValue}
        value={values.about}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileTextField
          error={visibleError("eligibilityNotes")}
          field="eligibilityNotes"
          label={labels.fields.eligibilityNotes}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.eligibilityNotes}
          multiline
          onChange={updateValue}
          value={values.eligibilityNotes}
        />
        <ProfileTextField
          error={visibleError("commitmentNotes")}
          field="commitmentNotes"
          label={labels.fields.commitmentNotes}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.commitmentNotes}
          multiline
          onChange={updateValue}
          value={values.commitmentNotes}
        />
        <ProfileTextField
          error={visibleError("accessibilityNotes")}
          field="accessibilityNotes"
          label={labels.fields.accessibilityNotes}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.accessibilityNotes}
          multiline
          onChange={updateValue}
          value={values.accessibilityNotes}
        />
        <ProfileTextField
          error={visibleError("costNotes")}
          field="costNotes"
          label={labels.fields.costNotes}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.costNotes}
          multiline
          onChange={updateValue}
          value={values.costNotes}
        />
        <ProfileTextField
          error={visibleError("materialsNotes")}
          field="materialsNotes"
          label={labels.fields.materialsNotes}
          labels={labels}
          limit={CLUB_PROFILE_LIMITS.materialsNotes}
          multiline
          onChange={updateValue}
          value={values.materialsNotes}
        />
      </div>

      <fieldset className="rounded-md border border-[var(--border)] p-3">
        <legend className="px-1 text-sm font-semibold text-slate-800">
          {labels.fields.themeKey}
        </legend>
        <p className="mb-3 text-sm text-slate-600">{labels.themeDescription}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CLUB_PROFILE_THEMES.map((theme) => (
            <label
              className="motion-choice flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] p-3 text-sm font-semibold text-slate-800 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-soft)]"
              key={theme}
            >
              <input
                checked={values.themeKey === theme}
                name="theme_key"
                onChange={() => updateValue("themeKey", theme)}
                type="radio"
                value={theme}
              />
              <span className="min-w-0 break-words">{labels.themes[theme]}</span>
            </label>
          ))}
        </div>
        {visibleError("themeKey") ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {visibleError("themeKey")}
          </p>
        ) : null}
      </fieldset>

      {state.message && !state.success ? (
        <p className="notice-box notice-danger" role="status">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Link
          className="btn btn-secondary min-h-11 gap-2"
          href={`/clubs/${clubId}`}
          prefetch={false}
        >
          {labels.cancel}
          <PendingLinkIndicator />
        </Link>
        <SaveButton labels={labels} />
      </div>
    </form>
  );
}

function ProfileTextField({
  error,
  field,
  label,
  labels,
  limit,
  multiline = false,
  onChange,
  value,
}: {
  error?: string;
  field: Exclude<ClubProfileField, "themeKey">;
  label: string;
  labels: ClubProfileFormLabels;
  limit: number;
  multiline?: boolean;
  onChange: (field: ClubProfileField, value: string) => void;
  value: string;
}) {
  const inputName = toSnakeCase(field);
  const errorId = `${inputName}-error`;
  const countId = `${inputName}-count`;
  const commonProps = {
    "aria-describedby": error ? `${countId} ${errorId}` : countId,
    "aria-invalid": Boolean(error),
    className: multiline
      ? "min-h-28 rounded-md border px-3 py-2 text-base outline-none"
      : "h-11 rounded-md border px-3 text-base outline-none",
    maxLength: limit,
    name: inputName,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(field, event.target.value),
    value,
  };

  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
      {label}
      {multiline ? <textarea {...commonProps} /> : <input {...commonProps} />}
      <span className="flex flex-wrap justify-between gap-2 text-xs font-normal text-slate-500">
        <span id={countId}>
          {labels.characterCount.replace("{count}", String(limit - value.length))}
        </span>
        {error ? (
          <span className="text-red-600" id={errorId} role="alert">
            {error}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function SaveButton({ labels }: { labels: ClubProfileFormLabels }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className="btn btn-primary min-h-11"
      disabled={pending}
      type="submit"
    >
      {pending ? labels.saving : labels.save}
    </button>
  );
}

function toSnakeCase(field: Exclude<ClubProfileField, "themeKey">) {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
