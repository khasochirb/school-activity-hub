import Link from "next/link";
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
  { href: "/students", label: "Students", roles: ["school_admin", "teacher"] },
  {
    href: "/invite-codes",
    label: "Invite Codes",
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
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <Link
              className="w-fit cursor-pointer text-lg font-semibold tracking-tight text-zinc-950"
              href="/dashboard"
            >
              School Activity Hub
            </Link>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 sm:text-right">
              <p className="break-all">{email}</p>
              <p className="mt-1 font-medium text-zinc-900">
                {profile ? formatRole(profile.role) : "No profile yet"}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <AppNav items={visibleNavItems} />
            <form action={logout} className="lg:shrink-0">
              <button
                className="h-10 w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 lg:w-auto"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
