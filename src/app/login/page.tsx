import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect((await hasAnySchool()) ? "/dashboard" : "/setup");
  }

  return (
    <main className="app-surface px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <Link
          className="mb-6 flex w-fit cursor-pointer items-center gap-3 text-sm font-bold text-slate-700 transition hover:text-teal-800"
          href="/"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-xs font-bold text-white">
            SAH
          </span>
          <span>School Activity Hub</span>
        </Link>
        <section className="section-card p-6 sm:p-8">
          <p className="page-eyebrow">Account access</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use your school activity account to manage or join verified school
            activities.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
