import Link from "next/link";
import { JoinForm } from "./join-form";

export default function JoinPage() {
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
          <p className="page-eyebrow">Verified student registration</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Join with invite code
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter the one-time invite code from your school to activate your
            student account.
          </p>
          <JoinForm />
        </section>
      </div>
    </main>
  );
}
