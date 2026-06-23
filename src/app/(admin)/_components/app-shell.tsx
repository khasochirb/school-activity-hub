import Link from "next/link";
import { logout } from "../actions";

type Role = "school_admin" | "teacher" | "student";

type Profile = {
  role: Role;
} | null;

const navItems: Array<{
  href: string;
  label: string;
  roles?: Role[];
}> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students", roles: ["school_admin", "teacher"] },
  {
    href: "/invite-codes",
    label: "Invite Codes",
    roles: ["school_admin", "teacher"],
  },
  { href: "/clubs", label: "Clubs" },
  { href: "/events", label: "Events" },
  { href: "/approvals", label: "Approvals", roles: ["school_admin", "teacher"] },
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
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link className="text-lg font-semibold" href="/dashboard">
              School Activity Hub
            </Link>
            <div className="flex flex-col gap-2 text-sm text-zinc-600 sm:items-end">
              <span>{email}</span>
              <span>{profile ? formatRole(profile.role) : "No profile yet"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {visibleNavItems.map((item) => (
                <Link
                  className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <form action={logout}>
              <button
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:w-auto"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
