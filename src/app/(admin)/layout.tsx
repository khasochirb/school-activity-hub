import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCurrentPlatformAdminProfile } from "@/lib/auth/platform-admin";
import { getCurrentSafeguardingAccess } from "@/lib/auth/sensitive-workflows";
import { timeServer } from "@/lib/server-timing";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { ConsoleFrame } from "../(console)/console-frame";
import { AppShell } from "./_components/app-shell";

type AppShellProfile = {
  role: "school_admin" | "student" | "teacher";
  full_name: string | null;
  school_id: string;
  schools: { name: string; timezone: string | null } | null;
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
        .select("role, school_id, full_name, schools(name, timezone)")
        .eq("id", user.id)
        // A deactivated account gets no role menu: every link would dead-end.
        .eq("status", "active")
        .maybeSingle<AppShellProfile>(),
    ),
    getCurrentPlatformAdminProfile(),
    getCurrentSafeguardingAccess(),
  ]);
  // Unread in-app notifications for the bell. Any error (for example before the
  // notifications migration has run) just shows no badge.
  const { count: unreadNotifications } = await timeServer("admin-layout.unread-notifications", () =>
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", user.id)
      .is("read_at", null),
  );

  if (!schoolExists) {
    redirect("/setup");
  }

  // Platform admins keep one frame on every page they open: the school app's
  // pages sit inside the console instead of switching to the top bar.
  if (platformAdminProfile) {
    return (
      <ConsoleFrame email={user.email ?? null} name={platformAdminProfile.full_name}>
        <div className="console-app app-surface dark">
          <main>{children}</main>
        </div>
      </ConsoleFrame>
    );
  }

  const { data: profile } = profileResult;

  return (
    <AppShell
      email={user.email ?? null}
      isPlatformAdmin={Boolean(platformAdminProfile)}
      isSafeguardingStaff={safeguardingAccess.isDesignated}
      unreadNotifications={unreadNotifications ?? 0}
      profile={
        profile
          ? {
              fullName: profile.full_name,
              role: profile.role,
              schoolName: profile.schools?.name ?? null,
              timeZone: profile.schools?.timezone ?? null,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
