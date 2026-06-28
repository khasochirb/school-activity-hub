"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";

type UpdatePasswordFormLabels = {
  checkingLink: string;
  confirmPassword: string;
  goToDashboard: string;
  newPassword: string;
  openResetLink: string;
  passwordMinLength: string;
  passwordMismatch: string;
  submit: string;
  success: string;
  updating: string;
};

export function UpdatePasswordForm({
  labels,
}: {
  labels: UpdatePasswordFormLabels;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionMessage(null);
        setIsCheckingSession(false);
      }
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) {
        return;
      }

      if (sessionError) {
        setSessionMessage(sessionError.message);
      } else if (!data.session) {
        setSessionMessage(labels.openResetLink);
      }

      setIsCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [labels.openResetLink, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (password.length < 8) {
      setError(labels.passwordMinLength);
      toast.notify({
        message: labels.passwordMinLength,
        title: toast.labels.error,
        variant: "error",
      });
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(labels.passwordMismatch);
      toast.notify({
        message: labels.passwordMismatch,
        title: toast.labels.error,
        variant: "error",
      });
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      toast.notify({
        message: updateError.message,
        title: toast.labels.error,
        variant: "error",
      });
      return;
    }

    setMessage(labels.success);
    toast.notify({
      message: labels.success,
      title: toast.labels.success,
      variant: "success",
    });
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
      {sessionMessage ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800" role="status">
          {sessionMessage}
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        {labels.newPassword}
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
        {labels.confirmPassword}
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-900"
          minLength={8}
          name="confirm_password"
          required
          type="password"
        />
      </label>
      {message ? (
        <div className="rounded-md bg-emerald-50 p-3" role="status">
          <p className="text-sm text-emerald-700">{message}</p>
          <Link
            className="btn btn-primary mt-3 inline-flex h-10"
            href="/dashboard"
          >
            {labels.goToDashboard}
          </Link>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isCheckingSession || isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? labels.updating
          : isCheckingSession
            ? labels.checkingLink
            : labels.submit}
      </button>
    </form>
  );
}
