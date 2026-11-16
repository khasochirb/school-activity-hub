import Link from "next/link";
import type { ReactNode } from "react";
import { BrandGlyph } from "@/components/brand-mark";

export type ConsoleShellLabels = {
  auditLog: string;
  backToApp: string;
  brandSub: string;
  connections: string;
  dashboard: string;
  platformAdmins: string;
  schoolSites: string;
  schools: string;
  sectionManage: string;
  sectionSystem: string;
};

const ICONS: Record<string, string[]> = {
  admins: ["M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z", "m9 12 2 2 4-4"],
  back: ["M15 18 9 12l6-6"],
  connections: ["M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5", "M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"],
  dashboard: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  log: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  schools: ["M3 21h18", "M5 21V8l7-5 7 5v13", "M9 21v-6h6v6"],
  sites: ["M3 12h18", "M12 3a14 14 0 0 1 0 18", "M12 3a14 14 0 0 0 0 18", "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z"],
};

function Icon({ name }: { name: string }) {
  return (
    <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      {ICONS[name].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

// The console frame: a sidebar with grouped navigation and the signed-in admin
// at the bottom, then the page. Always dark, whatever the app theme is.
export function ConsoleShell({
  children,
  email,
  labels,
  name,
}: {
  children: ReactNode;
  email: string | null;
  labels: ConsoleShellLabels;
  name: string;
}) {
  const manage = [
    { href: "/super-admin/sites", icon: "sites", label: labels.schoolSites, current: true },
    { href: "/super-admin/schools", icon: "schools", label: labels.schools },
    { href: "/super-admin/connections", icon: "connections", label: labels.connections },
  ];
  const system = [
    { href: "/super-admin", icon: "dashboard", label: labels.dashboard },
    { href: "/super-admin/audit-log", icon: "log", label: labels.auditLog },
    { href: "/super-admin/platform-admins", icon: "admins", label: labels.platformAdmins },
  ];

  return (
    <div className="console">
      <aside className="console-side">
        <div className="console-brand">
          <span aria-hidden="true" className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <BrandGlyph />
          </span>
          <span className="min-w-0">
            <b>{labels.schoolSites}</b>
            <small>{labels.brandSub}</small>
          </span>
        </div>
        <nav aria-label={labels.brandSub} className="console-nav">
          <p>{labels.sectionManage}</p>
          {manage.map((item) => (
            <Link aria-current={item.current ? "page" : undefined} href={item.href} key={item.href} prefetch={false}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
          <p>{labels.sectionSystem}</p>
          {system.map((item) => (
            <Link href={item.href} key={item.href} prefetch={false}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="console-user">
          <Link className="console-back" href="/dashboard" prefetch={false}>
            <Icon name="back" />
            {labels.backToApp}
          </Link>
          <span className="console-avatar" aria-hidden="true">
            {Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="min-w-0">
            <b>{name}</b>
            <small>{email}</small>
          </span>
        </div>
      </aside>
      <div className="console-main">{children}</div>
    </div>
  );
}
