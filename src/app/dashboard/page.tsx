import { redirect } from "next/navigation";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!(await hasAnySchool())) {
    redirect("/setup");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <h1 className="text-3xl font-semibold text-zinc-950">
        School Activity Hub Dashboard
      </h1>
    </main>
  );
}
