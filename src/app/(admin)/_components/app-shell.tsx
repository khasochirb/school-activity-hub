import Link from "next/link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { logout } from "../actions";
import { AppNav, type NavItem } from "./app-nav";

type Role = "school_admin" | "teacher" | "student";

type Profile = {
  role: Role;
} | null;

const navItems: Array<NavItem & {
  roles?: Role[];
}> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/announcements", label: "Announcements" },
  { href: "/staff", label: "Staff", roles: ["school_admin"] },
  { href: "/settings", label: "Settings", roles: ["school_admin"] },
  {
    href: "/school-connections",
    label: "School connections",
    roles: ["school_admin"],
  },
  { href: "/students", label: "Students", roles: ["school_admin", "teacher"] },
  {
    href: "/invite-codes",
    label: "Invite codes",
    roles: ["school_admin", "teacher"],
  },
  { href: "/clubs", label: "Clubs" },
  { href: "/events", label: "Events" },
  { href: "/approvals", label: "Approvals", roles: ["school_admin", "teacher"] },
  { href: "/reports", label: "Reports", roles: ["school_admin", "teacher"] },
];

export function AppShell({
  children,
  email,
  profile,
}: {
  children: React.ReactNode;
  email: string | null;
  profile: Profile;
}) {
  const visibleNavItems = navItems.filter((item) => {
    return !item.roles || (profile?.role && item.roles.includes(profile.role));
  });

  return (
    <div className="app-surface">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Link
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-teal-700 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
                href="/dashboard"
                aria-label="School Activity Hub dashboard"
              >
                SAH
              </Link>
              <div>
                <Link
                  className="w-fit cursor-pointer text-lg font-bold tracking-tight text-slate-950 transition hover:text-teal-800"
                  href="/dashboard"
                >
                  School Activity Hub
                </Link>
                <p className="text-sm text-slate-500">
                  Clubs, events, invites, and attendance
                </p>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 md:text-right">
              <p className="break-all">{email}</p>
              <p className="mt-1 font-semibold text-slate-900">
                {profile ? formatRole(profile.role) : "No profile yet"}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <AppNav items={visibleNavItems} />
            <form action={logout} className="xl:shrink-0">
              <PendingSubmitButton
                className="btn btn-secondary w-full xl:w-auto"
                pendingLabel="Logging out..."
              >
                Log out
              </PendingSubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function formatRole(role: Role) {
  return role
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
