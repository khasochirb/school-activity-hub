"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
  category: string;
  club: string;
  createApproved: string;
  creating: string;
  description: string;
  endsAt: string;
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
  schoolWideEvent: string;
  startsAt: string;
  submitForApproval: string;
  submitting: string;
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
}: {
  canCreate: boolean;
  categories: CategoryOption[];
  clubs: ClubOption[];
  isStaff: boolean;
  labels: CreateEventFormLabels;
}) {
  const [state, formAction] = useActionState(createEvent, initialState);

  if (!canCreate) {
    return (
      <p className="notice-box">
        {labels.leaderNeedsClub}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
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
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.startsAt}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="starts_at"
          type="datetime-local"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.endsAt}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="ends_at"
          type="datetime-local"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.maxParticipants}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          min={1}
          name="max_participants"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
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
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <input
          className="h-4 w-4 cursor-pointer"
          name="permission_required"
          type="checkbox"
          value="true"
        />
        {labels.permissionRequired}
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        {labels.description}
        <textarea
          className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
          name="description"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
        {labels.permissionNote}
        <textarea
          className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
          name="permission_note"
          placeholder={labels.permissionNotePlaceholder}
        />
      </label>
      {state.message ? (
        <p
          className={
            state.success
              ? "notice-box notice-success sm:col-span-2"
              : "notice-box notice-danger sm:col-span-2"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <div className="sm:col-span-2">
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
