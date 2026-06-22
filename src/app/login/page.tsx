import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Login</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Use your school activity account email and password.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
