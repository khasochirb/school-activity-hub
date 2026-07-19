import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCurrentPlatformAdminIdentity } from "@/lib/auth/platform-admin";
import { getCurrentSafeguardingAccess } from "@/lib/auth/sensitive-workflows";
import { timeServer } from "@/lib/server-timing";
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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [
    schoolExists,
    profileResult,
    platformAdminProfile,
    safeguardingAccess,
  ] = await Promise.all([
    timeServer("admin-layout.school-setup", () => hasAnySchool()),
    timeServer("admin-layout.profile", () =>
      supabase
        .from("profiles")
        .select("role, school_id, schools(name)")
        .eq("id", user.id)
        .maybeSingle<AppShellProfile>(),
    ),
    getCurrentPlatformAdminIdentity(),
    getCurrentSafeguardingAccess(),
  ]);

  if (!schoolExists) {
    redirect("/setup");
  }

  const { data: profile } = profileResult;

  return (
    <AppShell
      email={user.email ?? null}
      isPlatformAdmin={Boolean(platformAdminProfile)}
      isSafeguardingStaff={safeguardingAccess.isDesignated}
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
