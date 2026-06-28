"use client";

import {
  useActionState,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
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

type CreateEventFormLabels = {
  basicDetails: string;
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
  leaderNeedsClub: string;
  location: string;
  maxParticipants: string;
  noCategory: string;
  permissionNote: string;
  permissionNotePlaceholder: string;
  permissionRequired: string;
  riskHigh: string;
  riskLevel: string;
  riskLow: string;
  riskMedium: string;
  quickDuration: string;
  schoolWideEvent: string;
  safetyPermissions: string;
  startTime: string;
  startTimeRequired: string;
  submitForApproval: string;
  submitting: string;
  timeOrder: string;
  timePreviewEmpty: string;
  timezoneHelper: string;
  title: string;
};

const initialState: CreateEventState = {
  message: "",
  success: false,
};

export function CreateEventForm({
  canCreate,
  categories,
  clubs,
  isStaff,
  labels,
  locale,
}: {
  canCreate: boolean;
  categories: CategoryOption[];
  clubs: ClubOption[];
  isStaff: boolean;
  labels: CreateEventFormLabels;
  locale: Locale;
}) {
  const [state, formAction] = useActionState(createEvent, initialState);
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [clientError, setClientError] = useState("");
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
      className="compact-form-xl flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <ActionToast message={clientError} success={false} />
      <ActionToast message={state.message} success={state.success} />
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
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.location}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="location"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:max-w-48">
            {labels.maxParticipants}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              min={1}
              name="max_participants"
              type="number"
            />
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
