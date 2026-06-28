"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type ResetPasswordFormLabels = {
  email: string;
  emailRequired: string;
  sending: string;
  submit: string;
  success: string;
};

export function ResetPasswordForm({
  labels,
}: {
  labels: ResetPasswordFormLabels;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      setError(labels.emailRequired);
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: getUpdatePasswordRedirectUrl(),
      },
    );

    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(labels.success);
    event.currentTarget.reset();
  }

  return (
    <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        {labels.email}
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          name="email"
          required
          type="email"
        />
      </label>
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? labels.sending : labels.submit}
      </button>
    </form>
  );
}

function getUpdatePasswordRedirectUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const baseUrl = configuredSiteUrl
    ? configuredSiteUrl.replace(/\/+$/, "")
    : window.location.origin;

  return `${baseUrl}/update-password`;
}
