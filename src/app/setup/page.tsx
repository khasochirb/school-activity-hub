import { redirect } from "next/navigation";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (await hasAnySchool()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">First-time setup</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Create the first school. Your current account will become the school
          admin for this workspace.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
