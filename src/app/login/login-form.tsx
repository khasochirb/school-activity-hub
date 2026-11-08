"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";

export type LoginFormLabels = {
  email: string;
  failed: string;
  forgotPassword: string;
  hidePassword: string;
  joinWithCode: string;
  password: string;
  showPassword: string;
  signingIn: string;
  signIn: string;
};

export function LoginForm({
  labels,
  nextPath = null,
}: {
  labels: LoginFormLabels;
  nextPath?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(labels.failed);
      toast.notify({
        message: labels.failed,
        title: toast.labels.error,
        variant: "error",
      });
      return;
    }

    router.push(nextPath ?? "/dashboard");
    router.refresh();
  }

  return (
    <>
      <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {labels.email}
          <input
            className="h-11 rounded-md border px-3 text-base outline-none transition"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="login-password"
            >
              {labels.password}
            </label>
            <Link
              className="text-sm font-semibold text-[var(--primary-strong)] hover:underline"
              href="/reset-password"
            >
              {labels.forgotPassword}
            </Link>
          </div>
          <div className="relative">
            <input
              autoComplete="current-password"
              className="h-11 w-full rounded-md border px-3 pr-24 text-base outline-none transition"
              id="login-password"
              name="password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-controls="login-password"
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 px-3 text-sm font-semibold text-[var(--primary-strong)]"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? labels.hidePassword : labels.showPassword}
            </button>
          </div>
        </div>
        {error ? <p className="notice-box notice-danger">{error}</p> : null}
        <button
          className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? labels.signingIn : labels.signIn}
        </button>
      </form>
      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <Link className="btn btn-secondary h-11 w-full" href="/join">
          {labels.joinWithCode}
        </Link>
      </div>
    </>
  );
}
