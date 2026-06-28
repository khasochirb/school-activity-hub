"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import { createClub, type CreateClubState } from "./actions";

const initialState: CreateClubState = {
  message: "",
  success: false,
};

type CategoryOption = {
  label: string;
  value: string;
};

type CreateClubFormLabels = {
  active: string;
  archived: string;
  category: string;
  create: string;
  creating: string;
  description: string;
  name: string;
  noCategory: string;
  status: string;
};

export function CreateClubForm({
  categories,
  labels,
}: {
  categories: CategoryOption[];
  labels: CreateClubFormLabels;
}) {
  const [state, formAction] = useActionState(createClub, initialState);

  return (
    <form
      action={formAction}
      className="compact-form-xl grid gap-3 md:grid-cols-[minmax(16rem,2fr)_minmax(11rem,1fr)_minmax(11rem,1fr)]"
    >
      <ActionToast message={state.message} success={state.success} />
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.name}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="name"
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
        {labels.status}
        <select
          className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
          name="status"
          defaultValue="active"
        >
          <option value="active">{labels.active}</option>
          <option value="archived">{labels.archived}</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-3">
        {labels.description}
        <textarea
          className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
          name="description"
        />
      </label>
      {state.message ? (
        <p
          className={
            state.success
              ? "notice-box notice-success md:col-span-3"
              : "notice-box notice-danger md:col-span-3"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <div className="md:col-span-3">
        <SubmitButton
          createLabel={labels.create}
          creatingLabel={labels.creating}
        />
      </div>
    </form>
  );
}

function SubmitButton({
  createLabel,
  creatingLabel,
}: {
  createLabel: string;
  creatingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? creatingLabel : createLabel}
    </button>
  );
}
