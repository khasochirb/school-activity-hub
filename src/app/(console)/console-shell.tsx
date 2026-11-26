import type { ReactNode } from "react";
import { logout } from "@/app/(admin)/actions";
import { BrandGlyph } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/lib/i18n/locales";
import type { ThemePreference } from "@/lib/theme";
import { ConsoleNavLink } from "./console-nav-link";

export type ConsoleShellLabels = {
  activities: string;
  appName: string;
  approvals: string;
  auditLog: string;
  brandSub: string;
  clubs: string;
  home: string;
  inviteCodes: string;
  sectionSchool: string;
  students: string;
  connections: string;
  language: string;
  loggingOut: string;
  logout: string;
  overview: string;
  platformAdmins: string;
  reports: string;
  schoolSites: string;
  schools: string;
  sectionManage: string;
  sectionSystem: string;
  theme: string;
  themeDark: string;
  themeLight: string;
  themeSwitch: string;
  themeSystem: string;
};

const ICONS: Record<string, string[]> = {
  admins: ["M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z", "m9 12 2 2 4-4"],
  approvals: ["M3 12h5l2 3h4l2-3h5", "M5 5h14l2 7v7H3v-7z"],
  connections: ["M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5", "M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"],
  dashboard: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  events: ["M4 6h16v15H4z", "M4 10h16", "M8 3v4", "M16 3v4"],
  log: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  reports: ["M5 20V10", "M12 20V4", "M19 20v-7"],
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
// at the bottom, then the page. Follows the app theme, switched at the bottom.
export function ConsoleShell({
  children,
  email,
  labels,
  locale,
  name,
  schoolSwitcher,
  theme,
}: {
  theme: ThemePreference;
  children: ReactNode;
  /** Picks the one school the school pages below show. */
  schoolSwitcher?: ReactNode;
  email: string | null;
  labels: ConsoleShellLabels;
  locale: Locale;
  name: string;
}) {
  // Across all schools: the platform's own pages.
  const manage = [
    { href: "/super-admin", icon: "dashboard", label: labels.overview },
    { href: "/super-admin/schools", icon: "schools", label: labels.schools },
    { href: "/super-admin/sites", icon: "sites", label: labels.schoolSites },
    { href: "/super-admin/connections", icon: "connections", label: labels.connections },
  ];
  // One school at a time, the one picked above them. Never mixed.
  const school = [
    { href: "/dashboard", icon: "dashboard", label: labels.home },
    { href: "/approvals", icon: "approvals", label: labels.approvals },
    { href: "/events", icon: "events", label: labels.activities },
    { href: "/clubs", icon: "connections", label: labels.clubs },
    { href: "/students", icon: "admins", label: labels.students },
    { href: "/invite-codes", icon: "log", label: labels.inviteCodes },
    { href: "/reports", icon: "reports", label: labels.reports },
  ];
  const system = [
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
            <b>{labels.appName}</b>
            <small>{labels.brandSub}</small>
          </span>
        </div>
        <nav aria-label={labels.brandSub} className="console-nav">
          <p>{labels.sectionManage}</p>
          {manage.map((item) => (
            <ConsoleNavLink href={item.href} key={item.href}>
              <Icon name={item.icon} />
              {item.label}
            </ConsoleNavLink>
          ))}
          <p>{labels.sectionSchool}</p>
          {schoolSwitcher}
          {school.map((item) => (
            <ConsoleNavLink href={item.href} key={item.href}>
              <Icon name={item.icon} />
              {item.label}
            </ConsoleNavLink>
          ))}
          <p>{labels.sectionSystem}</p>
          {system.map((item) => (
            <ConsoleNavLink href={item.href} key={item.href}>
              <Icon name={item.icon} />
              {item.label}
            </ConsoleNavLink>
          ))}
        </nav>
        <div className="console-user">
          <span className="console-avatar" aria-hidden="true">
            {Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="min-w-0">
            <b>{name}</b>
            <small>{email}</small>
          </span>
          <div className="console-theme">
            <span>{labels.theme}</span>
            <ThemeToggle
              compact
              currentTheme={theme}
              label={labels.theme}
              labels={{ dark: labels.themeDark, light: labels.themeLight, system: labels.themeSystem }}
              showLabel={false}
              switchLabel={labels.themeSwitch}
            />
          </div>
          <div className="console-account">
            <LanguageSwitcher className="w-24" compact currentLocale={locale} label={labels.language} />
            <form action={logout}>
              <PendingSubmitButton className="console-logout" pendingLabel={labels.loggingOut} toastMessage={labels.loggingOut}>
                {labels.logout}
              </PendingSubmitButton>
            </form>
          </div>
        </div>
      </aside>
      <div className="console-main">{children}</div>
    </div>
  );
}
