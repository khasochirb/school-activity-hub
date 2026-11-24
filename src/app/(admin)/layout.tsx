import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCurrentPlatformAdminProfile } from "@/lib/auth/platform-admin";
import { getCurrentSafeguardingAccess } from "@/lib/auth/sensitive-workflows";
import { timeServer } from "@/lib/server-timing";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { ConsoleFrame } from "../(console)/console-frame";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { SchoolSwitcher } from "./_components/school-switcher";
import { AppShell } from "./_components/app-shell";

type AppShellProfile = {
  role: "parent" | "school_admin" | "student" | "teacher";
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
      // Only the school this account is in now (platform admins switch).
      .eq("school_id", profileResult.data?.school_id ?? "00000000-0000-0000-0000-000000000000")
      .is("read_at", null),
  );

  if (!schoolExists) {
    redirect("/setup");
  }

  // Platform admins keep one frame on every page they open: the school app's
  // pages sit inside the console instead of switching to the top bar.
  if (platformAdminProfile) {
    const { data: schools } = await createAdminClient()
      .from("schools")
      .select("id, name, is_demo")
      .eq("status", "active")
      .order("is_demo")
      .order("name")
      .returns<Array<{ id: string; is_demo: boolean; name: string }>>();
    const dictionary = getDictionary(await getCurrentLocale());

    return (
      <ConsoleFrame
        email={user.email ?? null}
        name={platformAdminProfile.full_name}
        schoolSwitcher={
          <SchoolSwitcher
            currentSchoolId={platformAdminProfile.school_id}
            label={translate(dictionary, "superAdmin.sites.console.switchSchool")}
            schools={(schools ?? []).map((school) => ({
              id: school.id,
              isDemo: school.is_demo,
              name: school.name,
            }))}
          />
        }
      >
        <div className="console-app app-surface dark">
          <main>{children}</main>
        </div>
      </ConsoleFrame>
    );
  }

  const { data: profile } = profileResult;

  // Parents have their own pages; the school app is for staff and students.
  if (profile?.role === "parent") {
    redirect("/family");
  }

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
