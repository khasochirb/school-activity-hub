"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  updateSafeguardingDesignation,
  type SensitiveActionState,
} from "../actions";

const initialState: SensitiveActionState = { message: "", success: false };

export function DesignationForm({
  labels,
  profileId,
  status,
}: {
  labels: { activate: string; activating: string; deactivate: string; deactivating: string };
  profileId: string;
  status: "active" | "inactive" | "unassigned";
}) {
  const [state, formAction] = useActionState(
    updateSafeguardingDesignation,
    initialState,
  );
  const desiredStatus = status === "active" ? "inactive" : "active";

  return (
    <form action={formAction} className="grid gap-2">
      <ActionToast message={state.message} success={state.success} />
      <input name="profile_id" type="hidden" value={profileId} />
      <input name="status" type="hidden" value={desiredStatus} />
      <DesignationSubmitButton
        labels={labels}
        desiredStatus={desiredStatus}
      />
      {state.message && !state.success ? (
        <p className="text-sm text-red-700" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function DesignationSubmitButton({
  desiredStatus,
  labels,
}: {
  desiredStatus: "active" | "inactive";
  labels: { activate: string; activating: string; deactivate: string; deactivating: string };
}) {
  const { pending } = useFormStatus();
  const active = desiredStatus === "active";

  return (
    <button
      className={`btn min-h-10 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${active ? "btn-primary" : "btn-danger"}`}
      disabled={pending}
      type="submit"
    >
      {pending
        ? active
          ? labels.activating
          : labels.deactivating
        : active
          ? labels.activate
          : labels.deactivate}
    </button>
  );
}
