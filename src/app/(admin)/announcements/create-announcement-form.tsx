"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  createAnnouncement,
  type CreateAnnouncementState,
} from "./actions";

const initialState: CreateAnnouncementState = {
  fieldErrors: {},
  message: "",
  success: false,
  values: { body: "", status: "active", title: "" },
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
  const [title, setTitle] = useState(initialState.values.title);
  const [body, setBody] = useState(initialState.values.body);
  const [status, setStatus] = useState(initialState.values.status);
  const titleError =
    title.trim() === state.values.title ? state.fieldErrors.title : undefined;
  const bodyError =
    body.trim() === state.values.body ? state.fieldErrors.body : undefined;
  const statusError =
    status.trim() === state.values.status ? state.fieldErrors.status : undefined;

  return (
    <form action={formAction} className="compact-form-lg grid gap-3">
      <ActionToast message={state.message} success={state.success} />
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.title}
        <input
          aria-describedby={titleError ? "announcement-title-error" : undefined}
          aria-invalid={Boolean(titleError)}
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          required
          value={title}
        />
        {titleError ? (
          <span
            className="text-sm font-normal text-red-600"
            id="announcement-title-error"
          >
            {titleError}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.body}
        <textarea
          aria-describedby={bodyError ? "announcement-body-error" : undefined}
          aria-invalid={Boolean(bodyError)}
          className="min-h-32 rounded-md border px-3 py-2 text-base outline-none transition"
          name="body"
          onChange={(event) => setBody(event.target.value)}
          required
          value={body}
        />
        {bodyError ? (
          <span
            className="text-sm font-normal text-red-600"
            id="announcement-body-error"
          >
            {bodyError}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:max-w-xs">
        {labels.status}
        <select
          aria-describedby={statusError ? "announcement-status-error" : undefined}
          aria-invalid={Boolean(statusError)}
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
          name="status"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="active">{labels.active}</option>
          <option value="archived">{labels.archived}</option>
        </select>
        {statusError ? (
          <span
            className="text-sm font-normal text-red-600"
            id="announcement-status-error"
          >
            {statusError}
          </span>
        ) : null}
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
