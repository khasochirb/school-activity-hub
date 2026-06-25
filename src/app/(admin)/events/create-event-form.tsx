"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ACTIVITY_CATEGORIES } from "@/lib/activity-categories";
import { createEvent, type CreateEventState } from "./actions";

type ClubOption = {
  id: string;
  name: string;
};

const initialState: CreateEventState = {
  message: "",
  success: false,
};

export function CreateEventForm({
  canCreate,
  clubs,
  isStaff,
}: {
  canCreate: boolean;
  clubs: ClubOption[];
  isStaff: boolean;
}) {
  const [state, formAction] = useActionState(createEvent, initialState);

  if (!canCreate) {
    return (
      <p className="text-sm text-zinc-600">
        Club leaders can submit events after they are assigned as leader for a
        club.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:col-span-2">
        Title
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="title"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Category
        <select
          className="h-11 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-900"
          name="category"
        >
          <option value="">No category</option>
          {ACTIVITY_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Location
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="location"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Starts at
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="starts_at"
          type="datetime-local"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Ends at
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="ends_at"
          type="datetime-local"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Max participants
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          min={1}
          name="max_participants"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Club
        <select
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-900"
          name="club_id"
          required={!isStaff}
        >
          {isStaff ? <option value="">School-wide event</option> : null}
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        Risk level
        <select
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-900"
          defaultValue="low"
          name="risk_level"
        >
          <option value="low">Low risk</option>
          <option value="medium">Medium risk</option>
          <option value="high">High risk</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
        <input
          className="h-4 w-4 cursor-pointer"
          name="permission_required"
          type="checkbox"
          value="true"
        />
        Permission required
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:col-span-2">
        Description
        <textarea
          className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-900"
          name="description"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 sm:col-span-2">
        Permission note
        <textarea
          className="min-h-20 rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-900"
          name="permission_note"
          placeholder="Optional note for staff, students, or families"
        />
      </label>
      {state.message ? (
        <p
          className={
            state.success
              ? "text-sm text-emerald-700 sm:col-span-2"
              : "text-sm text-red-600 sm:col-span-2"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton isStaff={isStaff} />
      </div>
    </form>
  );
}

function SubmitButton({ isStaff }: { isStaff: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-11 w-full cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending
        ? "Saving..."
        : isStaff
          ? "Create approved event"
          : "Submit for approval"}
    </button>
  );
}
