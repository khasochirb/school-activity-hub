import Link from "next/link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { logout } from "../actions";
import { AppNav, type NavItem, type NavSection } from "./app-nav";

type Role = "school_admin" | "teacher" | "student";

type Profile = {
  role: Role;
} | null;

type RoleAwareNavItem = NavItem & {
  roles?: Role[];
};

const navSections: Array<{
  items: RoleAwareNavItem[];
  label: string;
}> = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/events", label: "Events" },
      { href: "/clubs", label: "Clubs" },
      { href: "/announcements", label: "Announcements" },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        href: "/students",
        label: "Students",
        roles: ["school_admin", "teacher"],
      },
      {
        href: "/invite-codes",
        label: "Invite Codes",
        roles: ["school_admin", "teacher"],
      },
      { href: "/staff", label: "Staff", roles: ["school_admin"] },
      {
        href: "/school-connections",
        label: "School Connections",
        roles: ["school_admin"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/approvals",
        label: "Approvals",
        roles: ["school_admin", "teacher"],
      },
      { href: "/reports", label: "Reports", roles: ["school_admin", "teacher"] },
      { href: "/settings", label: "Settings", roles: ["school_admin"] },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/profile", label: "Profile" }],
  },
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
  const visibleNavSections = navSections
    .map((section) => ({
      label: section.label,
      items: section.items.filter((item) => isVisibleForRole(item, profile)),
    }))
    .filter((section) => section.items.length) satisfies NavSection[];
  const formattedRole = profile ? formatRole(profile.role) : "No profile yet";

  return (
    <div className="app-surface min-h-screen lg:flex">
      <aside className="hidden w-72 shrink-0 border-r border-slate-200/80 bg-white/95 shadow-sm lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-5 py-6">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
          <AppNav sections={visibleNavSections} />
        </div>
        <AccountPanel email={email} roleLabel={formattedRole} />
      </aside>

      <div className="min-w-0 flex-1 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Brand compact />
            <details className="group relative">
              <summary className="btn btn-secondary list-none px-3 [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <div className="absolute right-0 z-30 mt-3 max-h-[calc(100vh-5.5rem)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                <AppNav sections={visibleNavSections} />
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <MobileAccount email={email} roleLabel={formattedRole} />
                </div>
              </div>
            </details>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        aria-label="School Activity Hub dashboard"
        className={
          compact
            ? "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-teal-700 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800"
            : "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-teal-700 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
        }
        href="/dashboard"
      >
        SAH
      </Link>
      <div className="min-w-0">
        <Link
          className="block w-fit cursor-pointer truncate text-base font-bold tracking-tight text-slate-950 transition hover:text-teal-800"
          href="/dashboard"
        >
          School Activity Hub
        </Link>
        <p
          className={
            compact
              ? "mt-0.5 max-w-44 truncate text-xs leading-4 text-slate-500"
              : "mt-1 text-sm leading-5 text-slate-500"
          }
        >
          Clubs, events, invites, and attendance
        </p>
      </div>
    </div>
  );
}

function AccountPanel({
  email,
  roleLabel,
}: {
  email: string | null;
  roleLabel: string;
}) {
  return (
    <div className="border-t border-slate-200 p-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 shadow-inner">
        <p className="break-all">{email}</p>
        <p className="mt-1 font-semibold text-slate-900">{roleLabel}</p>
      </div>
      <form action={logout} className="mt-3">
        <PendingSubmitButton
          className="btn btn-secondary w-full"
          pendingLabel="Logging out..."
        >
          Log out
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function MobileAccount({
  email,
  roleLabel,
}: {
  email: string | null;
  roleLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
        <p className="break-all">{email}</p>
        <p className="mt-1 font-semibold text-slate-900">{roleLabel}</p>
      </div>
      <form action={logout}>
        <PendingSubmitButton
          className="btn btn-secondary w-full"
          pendingLabel="Logging out..."
        >
          Log out
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function isVisibleForRole(item: RoleAwareNavItem, profile: Profile) {
  return !item.roles || (profile?.role && item.roles.includes(profile.role));
}

function formatRole(role: Role) {
  return role
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
