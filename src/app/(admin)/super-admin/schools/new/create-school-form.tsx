"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  createPlatformSchool,
  type CreateSchoolState,
} from "./actions";

const initialState: CreateSchoolState = {
  message: "",
  success: false,
};

type CreateSchoolFormLabels = {
  adminEmail: string;
  adminFullName: string;
  createAdmin: string;
  createSchoolAndAdmin: string;
  createSchoolOnly: string;
  creating: string;
  firstSchoolAdmin: string;
  province: string;
  schoolIdentifier: string;
  schoolName: string;
  slugHelp: string;
  status: string;
  statusActive: string;
  statusArchived: string;
  temporaryPassword: string;
};

export function CreateSchoolForm({
  labels,
}: {
  labels: CreateSchoolFormLabels;
}) {
  const [state, formAction] = useActionState(
    createPlatformSchool,
    initialState,
  );
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  function handleNameChange(value: string) {
    if (!slugEdited) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(toSlug(value));
  }

  return (
    <form action={formAction} className="space-y-5">
      <ActionToast message={state.message} success={state.success} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
          {labels.schoolName}
          <input
            className="h-11 rounded-md border px-3 text-base outline-none transition"
            name="name"
            onChange={(event) => handleNameChange(event.currentTarget.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {labels.province}
          <input
            className="h-11 rounded-md border px-3 text-base outline-none transition"
            name="province"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {labels.status}
          <select
            className="h-11 cursor-pointer rounded-md border px-3 text-base outline-none transition"
            defaultValue="active"
            name="status"
          >
            <option value="active">{labels.statusActive}</option>
            <option value="archived">{labels.statusArchived}</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
          {labels.schoolIdentifier}
          <input
            className="h-11 rounded-md border px-3 font-mono text-base outline-none transition"
            name="slug"
            onChange={(event) => handleSlugChange(event.currentTarget.value)}
            required
            value={slug}
          />
          <span className="text-xs leading-5 text-slate-500">
            {labels.slugHelp}
          </span>
        </label>
      </section>

      <section className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-950">
            {labels.firstSchoolAdmin}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {labels.createAdmin}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.adminFullName}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="admin_full_name"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.adminEmail}
            <input
              autoComplete="email"
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="admin_email"
              type="email"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.temporaryPassword}
            <input
              autoComplete="new-password"
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              minLength={8}
              name="admin_password"
              type="password"
            />
          </label>
        </div>
      </section>

      {state.message ? (
        <p
          className={
            state.success ? "notice-box notice-success" : "notice-box notice-danger"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SubmitButton
          label={labels.createSchoolOnly}
          pendingLabel={labels.creating}
          value="school_only"
          variant="secondary"
        />
        <SubmitButton
          label={labels.createSchoolAndAdmin}
          pendingLabel={labels.creating}
          value="school_and_admin"
          variant="primary"
        />
      </div>
    </form>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  value,
  variant,
}: {
  label: string;
  pendingLabel: string;
  value: string;
  variant: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`btn ${
        variant === "primary" ? "btn-primary" : "btn-secondary"
      } h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
      disabled={pending}
      name="intent"
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
