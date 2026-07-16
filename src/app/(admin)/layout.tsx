import { redirect } from "next/navigation";
import { getCurrentPlatformAdminProfile } from "@/lib/auth/platform-admin";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./_components/app-shell";

type AppShellProfile = {
  role: "school_admin" | "student" | "teacher";
  school_id: string;
  schools: { name: string } | null;
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id, schools(name)")
    .eq("id", user.id)
    .maybeSingle<AppShellProfile>();
  const platformAdminProfile = await getCurrentPlatformAdminProfile();

  return (
    <AppShell
      email={user.email ?? null}
      isPlatformAdmin={Boolean(platformAdminProfile)}
      profile={
        profile
          ? { role: profile.role, schoolName: profile.schools?.name ?? null }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
