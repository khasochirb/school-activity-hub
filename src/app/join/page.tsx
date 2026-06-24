import Link from "next/link";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <Link
          className="mb-6 w-fit cursor-pointer text-sm font-semibold text-zinc-700 transition hover:text-zinc-950"
          href="/"
        >
          School Activity Hub
        </Link>
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Join with invite code
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Enter the one-time code from your school to create your student
            account.
          </p>
          <JoinForm />
        </section>
      </div>
    </main>
  );
}
