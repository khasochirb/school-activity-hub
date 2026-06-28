"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAnnouncement,
  type CreateAnnouncementState,
} from "./actions";

const initialState: CreateAnnouncementState = {
  message: "",
  success: false,
};

type CreateAnnouncementFormLabels = {
  active: string;
  archived: string;
  body: string;
  create: string;
  posting: string;
  status: string;
  title: string;
};

export function CreateAnnouncementForm({
  labels,
}: {
  labels: CreateAnnouncementFormLabels;
}) {
  const [state, formAction] = useActionState(
    createAnnouncement,
    initialState,
  );

  return (
    <form action={formAction} className="compact-form-lg grid gap-3">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.title}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="title"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.body}
        <textarea
          className="min-h-32 rounded-md border px-3 py-2 text-base outline-none transition"
          name="body"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:max-w-xs">
        {labels.status}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
          defaultValue="active"
          name="status"
        >
          <option value="active">{labels.active}</option>
          <option value="archived">{labels.archived}</option>
        </select>
      </label>
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
      <SubmitButton createLabel={labels.create} postingLabel={labels.posting} />
    </form>
  );
}

function SubmitButton({
  createLabel,
  postingLabel,
}: {
  createLabel: string;
  postingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      disabled={pending}
      type="submit"
    >
      {pending ? postingLabel : createLabel}
    </button>
  );
}
