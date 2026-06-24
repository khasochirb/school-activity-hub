import Link from "next/link";
import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <Link
          className="mb-6 w-fit cursor-pointer text-sm font-semibold text-zinc-700 transition hover:text-zinc-950"
          href="/login"
        >
          Back to sign in
        </Link>
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Update password
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Choose a new password after opening the reset link from your email.
          </p>
          <UpdatePasswordForm />
        </section>
      </div>
    </main>
  );
}
