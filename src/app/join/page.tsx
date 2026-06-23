import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Join with invite code</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Enter the one-time code from your school to create your student
          account.
        </p>
        <JoinForm />
      </div>
    </main>
  );
}
