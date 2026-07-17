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
  password: string;
  signingIn: string;
  signIn: string;
};

export function LoginForm({ labels }: { labels: LoginFormLabels }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    router.push("/dashboard");
    router.refresh();
  }

  return (
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
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.password}
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <Link
        className="w-fit cursor-pointer text-sm font-semibold text-teal-800 transition hover:text-teal-950"
        href="/reset-password"
      >
        {labels.forgotPassword}
      </Link>
      {error ? <p className="notice-box notice-danger">{error}</p> : null}
      <button
        className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? labels.signingIn : labels.signIn}
      </button>
    </form>
  );
}
