"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  EVENT_ACCESSIBILITY_MAX_LENGTH,
  EVENT_ELIGIBILITY_MAX_LENGTH,
} from "@/lib/events/event-decision-info";
import {
  EVENT_COST_CURRENCY,
  EVENT_COST_NOTES_MAX_LENGTH,
  EVENT_EXPECTED_COMMITMENT_MAX_LENGTH,
  EVENT_REQUIRED_MATERIALS_MAX_LENGTH,
  type EventCostType,
} from "@/lib/events/event-practical-details";
import {
  EVENT_SCHEDULE_NOTICE_MAX_LENGTH,
  EVENT_SUPERVISION_MAX_LENGTH,
} from "@/lib/events/event-supervision-schedule";
import { formatSchedulePreview } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import { createEvent, type CreateEventState } from "./actions";

type ClubOption = {
  id: string;
  name: string;
};

type CategoryOption = {
  label: string;
  value: string;
};

type StaffOption = {
  id: string;
  label: string;
};

type CreateEventFormLabels = {
  accessibilityGuidance: string;
  accessibilityInformation: string;
  accessibilityPlaceholder: string;
  basicDetails: string;
  beginnerFriendly: string;
  commitment: string;
  commitmentPlaceholder: string;
  cost: string;
  costAmount: string;
  costCurrency: string;
  costFree: string;
  costNotes: string;
  costNotesPlaceholder: string;
  costNotSpecified: string;
  costPaid: string;
  costVariable: string;
  category: string;
  club: string;
  createApproved: string;
  creating: string;
  dateTime: string;
  dateRequired: string;
  description: string;
  duration30: string;
  duration60: string;
  duration90: string;
  duration120: string;
  endTime: string;
  endTimeRequired: string;
  eventDate: string;
  eventTimePreview: string;
  eligibility: string;
  eligibilityPlaceholder: string;
  experienceLevel: string;
  leaderNeedsClub: string;
  location: string;
  maxParticipants: string;
  materials: string;
  materialsPlaceholder: string;
  noCategory: string;
  notSpecified: string;
  permissionNote: string;
  permissionNotePlaceholder: string;
  permissionRequired: string;
  practicalDetails: string;
  practicalGuidance: string;
  platformMode: string;
  selectedSchool: string;
  riskHigh: string;
  riskLevel: string;
  riskLow: string;
  riskMedium: string;
  quickDuration: string;
  priorExperienceRecommended: string;
  responsibleAdult: string;
  responsibleAdultHelp: string;
  responsibleAdultReviewHelp: string;
  schoolWideEvent: string;
  safetyPermissions: string;
  scheduleChangeNotice: string;
  scheduleNoticeGuidance: string;
  scheduleNoticePlaceholder: string;
  startTime: string;
  startTimeRequired: string;
  submitForApproval: string;
  submitting: string;
  timeOrder: string;
  timePreviewEmpty: string;
  timezoneHelper: string;
  title: string;
  supervisionGuidance: string;
  supervisionInformation: string;
  supervisionPlaceholder: string;
  supervisionSchedule: string;
  whoCanAttend: string;
};

const initialState: CreateEventState = {
  message: "",
  success: false,
};

export function CreateEventForm({
  canCreate,
  categories,
  clubs,
  defaultResponsibleStaffId,
  isStaff,
  labels,
  locale,
  platformSchool,
  staffOptions,
}: {
  canCreate: boolean;
  categories: CategoryOption[];
  clubs: ClubOption[];
  defaultResponsibleStaffId: string | null;
  isStaff: boolean;
  labels: CreateEventFormLabels;
  locale: Locale;
  platformSchool?: { id: string; name: string } | null;
  staffOptions: StaffOption[];
}) {
  const [state, formAction] = useActionState(createEvent, initialState);
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [costType, setCostType] = useState<EventCostType | "">("");
  const [clientError, setClientError] = useState("");
  const submissionIdRef = useRef<HTMLInputElement>(null);
  const startsAtValue = eventDate && startTime ? `${eventDate}T${startTime}` : "";
  const endsAtValue = eventDate && endTime ? `${eventDate}T${endTime}` : "";
  const schedulePreview = useMemo(() => {
    if (!eventDate || !startTime || !endTime) {
      return "";
    }

    const startsAt = parseLocalDateTime(eventDate, startTime);
    const endsAt = parseLocalDateTime(eventDate, endTime);

    if (!startsAt || !endsAt || endsAt <= startsAt) {
      return "";
    }

    return formatSchedulePreview(startsAt, endsAt, locale);
  }, [endTime, eventDate, locale, startTime]);

  useEffect(() => {
    const input = submissionIdRef.current;
    if (input && (!input.value || state.eventId)) {
      input.value = crypto.randomUUID();
    }
  }, [state.eventId]);

  if (!canCreate) {
    return (
      <p className="notice-box">
        {labels.leaderNeedsClub}
      </p>
    );
  }

  function clearClientError() {
    if (clientError) {
      setClientError("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const error = getScheduleError(eventDate, startTime, endTime, labels);

    if (error) {
      event.preventDefault();
      setClientError(error);
    }
  }

  function applyDuration(minutes: number) {
    const startsAt = parseLocalDateTime(eventDate, startTime);

    if (!eventDate) {
      setClientError(labels.dateRequired);
      return;
    }

    if (!startTime || !startsAt) {
      setClientError(labels.startTimeRequired);
      return;
    }

    const nextEnd = new Date(startsAt.getTime() + minutes * 60 * 1000);
    const nextEndTime = formatTimeInputValue(nextEnd);
    const nextEndSameDate = parseLocalDateTime(eventDate, nextEndTime);

    setEndTime(nextEndTime);
    setClientError(
      !nextEndSameDate || nextEndSameDate <= startsAt ? labels.timeOrder : "",
    );
  }

  return (
    <form
      action={formAction}
      className="compact-form-xl flex flex-col gap-3"
      onSubmit={handleSubmit}
    >
      <input ref={submissionIdRef} name="submission_id" type="hidden" />
      <ActionToast message={clientError} success={false} />
      <ActionToast message={state.message} success={state.success} />
      {platformSchool ? (
        <div className="notice-box min-w-0">
          <p className="font-bold">{labels.platformMode}</p>
          <p className="mt-1 break-words text-sm">
            {labels.selectedSchool}: {platformSchool.name}
          </p>
          <input name="school_id" type="hidden" value={platformSchool.id} />
          <FieldError message={state.fieldErrors?.school_id} />
        </div>
      ) : null}
      <fieldset className="form-group">
        <legend className="form-group-title">{labels.basicDetails}</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(16rem,2fr)_minmax(11rem,1fr)_minmax(13rem,1.4fr)]">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.title}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="title"
              required
            />
            <FieldError message={state.fieldErrors?.title} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.category}
            <select
              className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              name="category"
            >
              <option value="">{labels.noCategory}</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.category} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.location}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="location"
              required
            />
            <FieldError message={state.fieldErrors?.location} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:max-w-48">
            {labels.maxParticipants}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              min={1}
              name="max_participants"
              type="number"
            />
            <FieldError message={state.fieldErrors?.max_participants} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
            {labels.club}
            <select
              className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              name="club_id"
              required={!isStaff}
            >
              {isStaff ? <option value="">{labels.schoolWideEvent}</option> : null}
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.club_id} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-3">
            {labels.description}
            <textarea
              className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
              name="description"
            />
          </label>
        </div>
      </fieldset>
      <fieldset
        className="form-group"
        aria-describedby="event-time-helper event-time-preview"
      >
        <legend className="form-group-title">{labels.dateTime}</legend>
        <input name="starts_at" readOnly type="hidden" value={startsAtValue} />
        <input name="ends_at" readOnly type="hidden" value={endsAtValue} />
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(13rem,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)]">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.eventDate}
            <input
              aria-required="true"
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="event_date"
              onChange={(event) => {
                setEventDate(event.target.value);
                clearClientError();
              }}
              type="date"
              value={eventDate}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.startTime}
            <input
              aria-required="true"
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="start_time"
              onChange={(event) => {
                setStartTime(event.target.value);
                clearClientError();
              }}
              type="time"
              value={startTime}
            />
            <FieldError message={state.fieldErrors?.starts_at} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.endTime}
            <input
              aria-required="true"
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="end_time"
              onChange={(event) => {
                setEndTime(event.target.value);
                clearClientError();
              }}
              type="time"
              value={endTime}
            />
            <FieldError message={state.fieldErrors?.ends_at} />
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-800">
            {labels.quickDuration}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              [30, labels.duration30],
              [60, labels.duration60],
              [90, labels.duration90],
              [120, labels.duration120],
            ].map(([minutes, label]) => (
              <button
                className="btn btn-secondary h-9 cursor-pointer px-3 text-sm"
                key={minutes}
                onClick={() => applyDuration(Number(minutes))}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="mt-3 rounded-md border border-slate-200 bg-white p-3"
          id="event-time-preview"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {labels.eventTimePreview}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {schedulePreview || labels.timePreviewEmpty}
          </p>
          <p className="mt-2 text-xs text-slate-600" id="event-time-helper">
            {labels.timezoneHelper}
          </p>
        </div>
      </fieldset>
      <fieldset className="form-group">
        <legend className="form-group-title">{labels.practicalDetails}</legend>
        <p className="mt-2 max-w-2xl break-words text-xs leading-5 text-slate-600">
          {labels.practicalGuidance}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 md:max-w-sm">
            <span className="break-words">{labels.cost}</span>
            <select
              className="h-11 max-w-full cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              name="cost_type"
              onChange={(event) =>
                setCostType(event.target.value as EventCostType | "")
              }
              value={costType}
            >
              <option value="">{labels.costNotSpecified}</option>
              <option value="free">{labels.costFree}</option>
              <option value="paid">{labels.costPaid}</option>
              <option value="variable">{labels.costVariable}</option>
            </select>
            <FieldError message={state.fieldErrors?.cost_type} />
          </label>
          {costType === "paid" ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(10rem,1fr)_8rem] md:col-span-1">
              <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
                <span className="break-words">{labels.costAmount}</span>
                <input
                  className="h-11 rounded-md border px-3 text-base outline-none transition"
                  inputMode="decimal"
                  min="0.01"
                  name="cost_amount"
                  required
                  step="0.01"
                  type="number"
                />
                <FieldError message={state.fieldErrors?.cost_amount} />
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
                <span className="break-words">{labels.costCurrency}</span>
                <select
                  className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
                  defaultValue={EVENT_COST_CURRENCY}
                  name="cost_currency"
                >
                  <option value={EVENT_COST_CURRENCY}>
                    {EVENT_COST_CURRENCY}
                  </option>
                </select>
                <FieldError message={state.fieldErrors?.cost_currency} />
              </label>
            </div>
          ) : null}
          {costType ? (
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
              <span className="break-words">{labels.costNotes}</span>
              <textarea
                className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
                maxLength={EVENT_COST_NOTES_MAX_LENGTH}
                name="cost_notes"
                placeholder={labels.costNotesPlaceholder}
                required={costType === "variable"}
              />
              <FieldError message={state.fieldErrors?.cost_notes} />
            </label>
          ) : null}
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            <span className="break-words">{labels.materials}</span>
            <textarea
              className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
              maxLength={EVENT_REQUIRED_MATERIALS_MAX_LENGTH}
              name="required_materials"
              placeholder={labels.materialsPlaceholder}
            />
            <FieldError message={state.fieldErrors?.required_materials} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            <span className="break-words">{labels.commitment}</span>
            <textarea
              className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
              maxLength={EVENT_EXPECTED_COMMITMENT_MAX_LENGTH}
              name="expected_commitment"
              placeholder={labels.commitmentPlaceholder}
            />
            <FieldError message={state.fieldErrors?.expected_commitment} />
          </label>
        </div>
      </fieldset>
      {isStaff ? (
        <fieldset className="form-group">
          <legend className="form-group-title">{labels.supervisionSchedule}</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
              <span className="break-words">{labels.supervisionInformation}</span>
              <textarea
                aria-describedby="event-supervision-guidance"
                className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
                maxLength={EVENT_SUPERVISION_MAX_LENGTH}
                name="supervision_information"
                placeholder={labels.supervisionPlaceholder}
              />
              <FieldError message={state.fieldErrors?.supervision_information} />
              <span
                className="break-words text-xs font-normal leading-5 text-slate-600"
                id="event-supervision-guidance"
              >
                {labels.supervisionGuidance}
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
              <span className="break-words">{labels.scheduleChangeNotice}</span>
              <textarea
                aria-describedby="event-schedule-notice-guidance"
                className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
                maxLength={EVENT_SCHEDULE_NOTICE_MAX_LENGTH}
                name="schedule_change_notice"
                placeholder={labels.scheduleNoticePlaceholder}
              />
              <FieldError message={state.fieldErrors?.schedule_change_notice} />
              <span
                className="break-words text-xs font-normal leading-5 text-slate-600"
                id="event-schedule-notice-guidance"
              >
                {labels.scheduleNoticeGuidance}
              </span>
            </label>
          </div>
        </fieldset>
      ) : null}
      <fieldset className="form-group">
        <legend className="form-group-title">{labels.whoCanAttend}</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {isStaff ? (
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
              <span className="break-words">{labels.responsibleAdult}</span>
              <select
                className="h-11 max-w-full cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
                defaultValue={defaultResponsibleStaffId ?? ""}
                name="responsible_staff_id"
              >
                <option value="">{labels.notSpecified}</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.label}
                  </option>
                ))}
              </select>
              <FieldError message={state.fieldErrors?.responsible_staff_id} />
              <span className="break-words text-xs font-normal leading-5 text-slate-600">
                {labels.responsibleAdultHelp}
              </span>
            </label>
          ) : (
            <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card-soft)] p-3">
              <p className="break-words text-sm font-semibold text-slate-800">
                {labels.responsibleAdult}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-slate-600">
                {labels.responsibleAdultReviewHelp}
              </p>
            </div>
          )}
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            <span className="break-words">{labels.experienceLevel}</span>
            <select
              className="h-11 max-w-full cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              defaultValue=""
              name="experience_level"
            >
              <option value="">{labels.notSpecified}</option>
              <option value="beginner_friendly">{labels.beginnerFriendly}</option>
              <option value="prior_experience_recommended">
                {labels.priorExperienceRecommended}
              </option>
            </select>
            <FieldError message={state.fieldErrors?.experience_level} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
            <span className="break-words">{labels.eligibility}</span>
            <textarea
              className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
              maxLength={EVENT_ELIGIBILITY_MAX_LENGTH}
              name="eligibility_notes"
              placeholder={labels.eligibilityPlaceholder}
            />
            <FieldError message={state.fieldErrors?.eligibility_notes} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
            <span className="break-words">{labels.accessibilityInformation}</span>
            <textarea
              aria-describedby="event-accessibility-guidance"
              className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
              maxLength={EVENT_ACCESSIBILITY_MAX_LENGTH}
              name="accessibility_notes"
              placeholder={labels.accessibilityPlaceholder}
            />
            <FieldError message={state.fieldErrors?.accessibility_notes} />
            <span
              className="break-words text-xs font-normal leading-5 text-slate-600"
              id="event-accessibility-guidance"
            >
              {labels.accessibilityGuidance}
            </span>
          </label>
        </div>
      </fieldset>
      <fieldset className="form-group">
        <legend className="form-group-title">{labels.safetyPermissions}</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(12rem,0.8fr)_minmax(14rem,1fr)]">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.riskLevel}
            <select
              className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              defaultValue="low"
              name="risk_level"
            >
              <option value="low">{labels.riskLow}</option>
              <option value="medium">{labels.riskMedium}</option>
              <option value="high">{labels.riskHigh}</option>
            </select>
            <FieldError message={state.fieldErrors?.risk_level} />
          </label>
          <label className="flex items-center gap-2 self-end text-sm font-semibold text-slate-800">
            <input
              className="h-4 w-4 cursor-pointer"
              name="permission_required"
              type="checkbox"
              value="true"
            />
            {labels.permissionRequired}
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
            {labels.permissionNote}
            <textarea
              className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
              name="permission_note"
              placeholder={labels.permissionNotePlaceholder}
            />
          </label>
        </div>
      </fieldset>
      {clientError ? (
        <p className="notice-box notice-danger" role="alert">
          {clientError}
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
      <div>
        <SubmitButton isStaff={isStaff} labels={labels} />
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="break-words text-xs font-medium text-red-600" role="alert">
      {message}
    </span>
  ) : null;
}

function SubmitButton({
  isStaff,
  labels,
}: {
  isStaff: boolean;
  labels: CreateEventFormLabels;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending
        ? isStaff
          ? labels.creating
          : labels.submitting
        : isStaff
          ? labels.createApproved
          : labels.submitForApproval}
    </button>
  );
}

function getScheduleError(
  eventDate: string,
  startTime: string,
  endTime: string,
  labels: CreateEventFormLabels,
) {
  if (!eventDate) {
    return labels.dateRequired;
  }

  if (!startTime) {
    return labels.startTimeRequired;
  }

  if (!endTime) {
    return labels.endTimeRequired;
  }

  const startsAt = parseLocalDateTime(eventDate, startTime);
  const endsAt = parseLocalDateTime(eventDate, endTime);

  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return labels.timeOrder;
  }

  return "";
}

function parseLocalDateTime(dateValue: string, timeValue: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ||
    !/^\d{2}:\d{2}$/.test(timeValue)
  ) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

function formatTimeInputValue(date: Date) {
  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}
