import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locales";
import type { ThemePreference } from "@/lib/theme";
import { logout } from "../actions";
import { AppNav, type NavItem, type NavSection } from "./app-nav";

type Role = "school_admin" | "teacher" | "student";

type Profile = {
  role: Role;
} | null;

type RoleAwareNavItem = {
  href: string;
  labelKey: string;
  platformAdminOnly?: boolean;
  roles?: Role[];
};

const navSections: Array<{
  items: RoleAwareNavItem[];
  labelKey: string;
}> = [
  {
    labelKey: "nav.main",
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard" },
      { href: "/events", labelKey: "nav.events" },
      { href: "/clubs", labelKey: "nav.clubs" },
      { href: "/announcements", labelKey: "nav.announcements" },
    ],
  },
  {
    labelKey: "nav.manage",
    items: [
      {
        href: "/students",
        labelKey: "nav.students",
        roles: ["school_admin", "teacher"],
      },
      {
        href: "/invite-codes",
        labelKey: "nav.inviteCodes",
        roles: ["school_admin", "teacher"],
      },
      { href: "/staff", labelKey: "nav.staff", roles: ["school_admin"] },
      {
        href: "/school-connections",
        labelKey: "nav.schoolConnections",
        roles: ["school_admin"],
      },
    ],
  },
  {
    labelKey: "nav.operations",
    items: [
      {
        href: "/approvals",
        labelKey: "nav.approvals",
        roles: ["school_admin", "teacher"],
      },
      {
        href: "/reports",
        labelKey: "nav.reports",
        roles: ["school_admin", "teacher"],
      },
      { href: "/settings", labelKey: "nav.settings", roles: ["school_admin"] },
    ],
  },
  {
    labelKey: "nav.platform",
    items: [
      {
        href: "/super-admin",
        labelKey: "nav.superAdmin",
        platformAdminOnly: true,
      },
      {
        href: "/super-admin/schools",
        labelKey: "nav.schools",
        platformAdminOnly: true,
      },
      {
        href: "/super-admin/connections",
        labelKey: "nav.platformConnections",
        platformAdminOnly: true,
      },
      {
        href: "/super-admin/platform-admins",
        labelKey: "nav.platformAdmins",
        platformAdminOnly: true,
      },
      {
        href: "/super-admin/audit-log",
        labelKey: "nav.auditLog",
        platformAdminOnly: true,
      },
    ],
  },
  {
    labelKey: "nav.account",
    items: [{ href: "/profile", labelKey: "nav.profile" }],
  },
];

export async function AppShell({
  children,
  email,
  isPlatformAdmin,
  profile,
}: {
  children: React.ReactNode;
  email: string | null;
  isPlatformAdmin: boolean;
  profile: Profile;
}) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const visibleNavSections = navSections
    .map((section) => ({
      label: t(section.labelKey),
      items: section.items
        .filter((item) => isVisibleForRole(item, profile, isPlatformAdmin))
        .map<NavItem>((item) => ({
          href: item.href,
          label: t(item.labelKey),
        })),
    }))
    .filter((section) => section.items.length) satisfies NavSection[];
  const formattedRole = profile ? formatRole(profile.role, t) : t("roles.noProfile");
  const languageLabels = {
    en: t("language.en"),
    mn: t("language.mn"),
  };
  const themeLabels = {
    dark: t("theme.dark"),
    light: t("theme.light"),
    system: t("theme.system"),
  };

  return (
    <div className="app-surface min-h-screen lg:flex">
      <aside className="hidden w-[19rem] min-w-0 shrink-0 overflow-hidden border-r border-slate-200/80 bg-white/95 shadow-sm lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        <div className="min-w-0 border-b border-slate-200 px-5 py-6">
          <Brand
            dashboardLabel={t("nav.dashboard")}
            name={t("app.name")}
            shortName={t("app.shortName")}
            subtitle={t("app.subtitle")}
          />
        </div>
        <div className="min-w-0 min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <AppNav sections={visibleNavSections} />
        </div>
        <AccountPanel
          email={email}
          languageLabels={languageLabels}
          languageLabel={t("language.label")}
          locale={locale}
          logoutLabel={t("nav.logout")}
          logoutPendingLabel={t("nav.loggingOut")}
          roleLabel={formattedRole}
          switchThemeLabel={t("theme.switch")}
          theme={theme}
          themeLabel={t("theme.label")}
          themeLabels={themeLabels}
        />
      </aside>

      <div className="min-w-0 flex-1 lg:pl-[19rem]">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Brand
              compact
              dashboardLabel={t("nav.dashboard")}
              name={t("app.name")}
              shortName={t("app.shortName")}
              subtitle={t("app.subtitle")}
            />
            <details className="group relative shrink-0">
              <summary className="btn btn-secondary list-none px-3 [&::-webkit-details-marker]:hidden">
                {t("nav.menu")}
              </summary>
              <div className="absolute right-0 z-30 mt-3 max-h-[calc(100vh-5.5rem)] w-[min(21rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                <AppNav sections={visibleNavSections} />
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <MobileAccount
                    email={email}
                    languageLabels={languageLabels}
                    languageLabel={t("language.label")}
                    locale={locale}
                    logoutLabel={t("nav.logout")}
                    logoutPendingLabel={t("nav.loggingOut")}
                    roleLabel={formattedRole}
                    switchThemeLabel={t("theme.switch")}
                    theme={theme}
                    themeLabel={t("theme.label")}
                    themeLabels={themeLabels}
                  />
                </div>
              </div>
            </details>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[88rem] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand({
  compact = false,
  dashboardLabel,
  name,
  shortName,
  subtitle,
}: {
  compact?: boolean;
  dashboardLabel: string;
  name: string;
  shortName: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-3">
      <Link
        aria-label={`${name} ${dashboardLabel}`}
        className={
          compact
            ? "brand-mark flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-xs font-bold shadow-sm transition"
            : "brand-mark flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-sm font-bold shadow-sm transition"
        }
        href="/dashboard"
      >
        {shortName}
      </Link>
      <div className="min-w-0 max-w-full">
        <Link
          className={
            compact
              ? "block max-w-full cursor-pointer truncate text-base font-bold tracking-tight text-slate-950 transition hover:text-teal-800"
              : "block max-w-full cursor-pointer break-words text-base font-bold leading-snug tracking-tight text-slate-950 transition hover:text-teal-800"
          }
          href="/dashboard"
        >
          {name}
        </Link>
        <p
          className={
            compact
              ? "mt-0.5 max-w-44 truncate text-xs leading-4 text-slate-500"
              : "mt-1 max-w-full break-words text-sm leading-5 text-slate-500"
          }
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function AccountPanel({
  email,
  languageLabels,
  languageLabel,
  locale,
  logoutLabel,
  logoutPendingLabel,
  roleLabel,
  switchThemeLabel,
  theme,
  themeLabel,
  themeLabels,
}: {
  email: string | null;
  languageLabels: Record<Locale, string>;
  languageLabel: string;
  locale: Locale;
  logoutLabel: string;
  logoutPendingLabel: string;
  roleLabel: string;
  switchThemeLabel: string;
  theme: ThemePreference;
  themeLabel: string;
  themeLabels: Record<ThemePreference, string>;
}) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden border-t border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4 grid min-w-0 max-w-full gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <LanguageSwitcher
          currentLocale={locale}
          label={languageLabel}
          labels={languageLabels}
        />
        <ThemeToggle
          currentTheme={theme}
          label={themeLabel}
          labels={themeLabels}
          switchLabel={switchThemeLabel}
        />
      </div>
      <div className="min-w-0 max-w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 shadow-sm">
        <p className="break-all">{email}</p>
        <p className="mt-1 break-words font-semibold leading-snug text-slate-900">{roleLabel}</p>
      </div>
      <form action={logout} className="mt-3">
        <PendingSubmitButton
          className="btn btn-secondary w-full"
          pendingLabel={logoutPendingLabel}
          toastMessage={logoutPendingLabel}
        >
          {logoutLabel}
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function MobileAccount({
  email,
  languageLabels,
  languageLabel,
  locale,
  logoutLabel,
  logoutPendingLabel,
  roleLabel,
  switchThemeLabel,
  theme,
  themeLabel,
  themeLabels,
}: {
  email: string | null;
  languageLabels: Record<Locale, string>;
  languageLabel: string;
  locale: Locale;
  logoutLabel: string;
  logoutPendingLabel: string;
  roleLabel: string;
  switchThemeLabel: string;
  theme: ThemePreference;
  themeLabel: string;
  themeLabels: Record<ThemePreference, string>;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-hidden">
      <div className="grid min-w-0 max-w-full gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <LanguageSwitcher
          currentLocale={locale}
          label={languageLabel}
          labels={languageLabels}
        />
        <ThemeToggle
          currentTheme={theme}
          label={themeLabel}
          labels={themeLabels}
          switchLabel={switchThemeLabel}
        />
      </div>
      <div className="min-w-0 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
        <p className="break-all">{email}</p>
        <p className="mt-1 break-words font-semibold leading-snug text-slate-900">{roleLabel}</p>
      </div>
      <form action={logout}>
        <PendingSubmitButton
          className="btn btn-secondary w-full"
          pendingLabel={logoutPendingLabel}
          toastMessage={logoutPendingLabel}
        >
          {logoutLabel}
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function isVisibleForRole(
  item: RoleAwareNavItem,
  profile: Profile,
  isPlatformAdmin: boolean,
) {
  if (item.platformAdminOnly) {
    return isPlatformAdmin;
  }

  return !item.roles || (profile?.role && item.roles.includes(profile.role));
}

function formatRole(role: Role, t: (key: string) => string) {
  if (role === "school_admin") {
    return t("roles.schoolAdmin");
  }

  return role === "teacher" ? t("roles.teacher") : t("roles.student");
}
