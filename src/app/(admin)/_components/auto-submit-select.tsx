"use client";

import type { ReactNode } from "react";

// A <select> inside a GET filter form that applies itself as soon as it
// changes, so filters need no separate "Apply" button.
export function AutoSubmitSelect({
  children,
  defaultValue,
  label,
  name,
}: {
  children: ReactNode;
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="cl-select">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        defaultValue={defaultValue}
        name={name}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {children}
      </select>
    </label>
  );
}
