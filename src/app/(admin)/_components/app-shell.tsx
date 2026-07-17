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
import {
  MobileAppNav,
  type MobileNavGroup,
  type MobileNavItem,
  type MobileNavMatch,
} from "./mobile-app-nav";
import { MobileMenuDrawer } from "./mobile-menu-drawer";

type Role = "school_admin" | "teacher" | "student";

type Profile = {
  role: Role;
  schoolName: string | null;
} | null;

type RoleAwareNavItem = {
  href: string;
  intentPrefetch?: boolean;
  labelKey: string;
  match?: MobileNavMatch;
  platformAdminOnly?: boolean;
  roles?: Role[];
  safeguardingOnly?: boolean;
};

const staffAttendanceHref =
  "/events?view=list&scope=school&status=approved&focus=attendance";

const primaryIntentHrefs: Record<Role, ReadonlySet<string>> = {
  school_admin: new Set(["/events", "/students", "/approvals"]),
  student: new Set(["/events", "/clubs"]),
  teacher: new Set(["/events", "/approvals"]),
};

const platformPrimaryIntentHrefs = new Set(["/super-admin/schools"]);

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
      {
        href: "/club-requests",
        labelKey: "nav.clubIdeas",
        roles: ["student"],
      },
      {
        href: "/club-requests",
        labelKey: "nav.clubRequests",
        roles: ["school_admin", "teacher"],
      },
      { href: "/announcements", labelKey: "nav.announcements" },
      {
        href: "/safety",
        intentPrefetch: false,
        labelKey: "nav.safety",
      },
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
      { href: "/staff", labelKey: "nav.staff", roles: ["school_admin"] },
      {
        href: "/invite-codes",
        labelKey: "nav.inviteCodes",
        roles: ["school_admin", "teacher"],
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
      {
        href: "/safety/reports",
        intentPrefetch: false,
        labelKey: "nav.safeguardingInbox",
        safeguardingOnly: true,
      },
    ],
  },
  {
    labelKey: "nav.schoolManagement",
    items: [
      { href: "/settings", labelKey: "nav.settings", roles: ["school_admin"] },
      {
        href: "/school-connections",
        labelKey: "nav.schoolConnections",
        roles: ["school_admin"],
      },
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
    items: [
      { href: "/profile", labelKey: "nav.profile" },
      { href: "/privacy", intentPrefetch: false, labelKey: "nav.privacy" },
    ],
  },
];

const mobilePrimaryNav: Record<Role, RoleAwareNavItem[]> = {
  student: [
    { href: "/dashboard", labelKey: "nav.dashboard" },
    { href: "/events", labelKey: "nav.activities", match: "events" },
    {
      href: "/events?view=month",
      labelKey: "nav.calendar",
      match: "calendar",
      intentPrefetch: false,
    },
    { href: "/clubs", labelKey: "nav.clubs" },
    { href: "/club-requests", labelKey: "nav.clubIdeas" },
    { href: "/announcements", labelKey: "nav.announcements" },
    { href: "/safety", intentPrefetch: false, labelKey: "nav.safety" },
  ],
  teacher: [
    { href: "/dashboard", labelKey: "nav.dashboard" },
    { href: "/events", labelKey: "nav.activities", match: "events" },
    {
      href: "/events?view=month",
      labelKey: "nav.calendar",
      match: "calendar",
      intentPrefetch: false,
    },
    { href: "/clubs", labelKey: "nav.clubs" },
    { href: "/approvals", labelKey: "nav.approvals" },
    {
      href: staffAttendanceHref,
      labelKey: "nav.attendance",
      match: "attendance",
    },
    { href: "/reports", labelKey: "nav.reports" },
  ],
  school_admin: [
    { href: "/dashboard", labelKey: "nav.dashboard" },
    { href: "/events", labelKey: "nav.activities", match: "events" },
    {
      href: "/events?view=month",
      labelKey: "nav.calendar",
      match: "calendar",
      intentPrefetch: false,
    },
    { href: "/students", labelKey: "nav.students" },
    { href: "/staff", labelKey: "nav.staff" },
    { href: "/approvals", labelKey: "nav.approvals" },
    { href: "/reports", labelKey: "nav.reports" },
  ],
};

const mobileNavGroups: Array<{
  id: string;
  items: RoleAwareNavItem[];
  labelKey: string;
}> = [
  {
    id: "more",
    labelKey: "nav.more",
    items: [
      { href: "/clubs", labelKey: "nav.clubs", roles: ["school_admin"] },
      {
        href: "/club-requests",
        labelKey: "nav.clubRequests",
        roles: ["school_admin", "teacher"],
      },
      {
        href: "/announcements",
        labelKey: "nav.announcements",
        roles: ["school_admin", "teacher"],
      },
    ],
  },
  {
    id: "people-access",
    labelKey: "nav.manage",
    items: [
      {
        href: "/students",
        labelKey: "nav.students",
        roles: ["school_admin", "teacher"],
      },
      { href: "/staff", labelKey: "nav.staff", roles: ["school_admin"] },
      {
        href: "/invite-codes",
        labelKey: "nav.inviteCodes",
        roles: ["school_admin", "teacher"],
      },
    ],
  },
  {
    id: "reviews-tracking",
    labelKey: "nav.operations",
    items: [
      {
        href: "/approvals",
        labelKey: "nav.approvals",
        roles: ["school_admin", "teacher"],
      },
      {
        href: staffAttendanceHref,
        labelKey: "nav.attendance",
        match: "attendance",
        roles: ["school_admin", "teacher"],
      },
      {
        href: "/reports",
        labelKey: "nav.reports",
        roles: ["school_admin", "teacher"],
      },
      {
        href: "/safety/reports",
        intentPrefetch: false,
        labelKey: "nav.safeguardingInbox",
        safeguardingOnly: true,
      },
    ],
  },
  {
    id: "safety-privacy",
    labelKey: "nav.safetyAndPrivacy",
    items: [
      { href: "/safety", intentPrefetch: false, labelKey: "nav.safety" },
      { href: "/privacy", intentPrefetch: false, labelKey: "nav.privacy" },
    ],
  },
  {
    id: "school-management",
    labelKey: "nav.schoolManagement",
    items: [
      { href: "/settings", labelKey: "nav.settings", roles: ["school_admin"] },
      {
        href: "/school-connections",
        labelKey: "nav.partnerSchools",
        roles: ["school_admin"],
      },
    ],
  },
  {
    id: "platform",
    labelKey: "nav.platform",
    items: [
      {
        href: "/super-admin",
        labelKey: "nav.platformDashboard",
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
        href: "/super-admin/audit-log",
        labelKey: "nav.auditLog",
        platformAdminOnly: true,
      },
      {
        href: "/super-admin/platform-admins",
        labelKey: "nav.platformAdmins",
        platformAdminOnly: true,
      },
    ],
  },
];

export async function AppShell({
  children,
  email,
  isPlatformAdmin,
  isSafeguardingStaff,
  profile,
}: {
  children: React.ReactNode;
  email: string | null;
  isPlatformAdmin: boolean;
  isSafeguardingStaff: boolean;
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
        .filter((item) =>
          isVisibleForRole(
            item,
            profile,
            isPlatformAdmin,
            isSafeguardingStaff,
          ),
        )
        .map<NavItem>((item) => ({
          href: item.href,
          intentPrefetch: shouldIntentPrefetchNavigationItem(
            item,
            profile,
            isPlatformAdmin,
          ),
          label: t(item.labelKey),
        })),
    }))
    .filter((section) => section.items.length) satisfies NavSection[];
  const mobileNavigation = getMobileNavigation(
    profile,
    isPlatformAdmin,
    isSafeguardingStaff,
    t,
  );
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
            <MobileMenuDrawer
              closeLabel={t("common.close")}
              header={
                <MobileDrawerBrand
                  appName={t("app.name")}
                  roleLabel={formattedRole}
                  schoolName={profile?.schoolName ?? null}
                  shortName={t("app.shortName")}
                />
              }
              menuLabel={t("nav.menu")}
            >
              <div className="flex min-h-full min-w-0 max-w-full flex-col">
                <MobileAppNav
                  groups={mobileNavigation.groups}
                  label={t("nav.menu")}
                  primaryItems={mobileNavigation.primaryItems}
                />
                <div className="mt-auto border-t border-slate-200 pt-5">
                  <MobileAccount
                    email={email}
                    languageLabels={languageLabels}
                    languageLabel={t("language.label")}
                    locale={locale}
                    logoutLabel={t("nav.logout")}
                    logoutPendingLabel={t("nav.loggingOut")}
                    profileLabel={t("nav.profile")}
                    roleLabel={formattedRole}
                    switchThemeLabel={t("theme.switch")}
                    theme={theme}
                    themeLabel={t("theme.label")}
                    themeLabels={themeLabels}
                  />
                </div>
              </div>
            </MobileMenuDrawer>
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
        prefetch={false}
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
          prefetch={false}
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
  profileLabel,
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
  profileLabel: string;
  roleLabel: string;
  switchThemeLabel: string;
  theme: ThemePreference;
  themeLabel: string;
  themeLabels: Record<ThemePreference, string>;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-hidden">
      <Link
        className="btn btn-secondary min-h-11 w-full justify-start"
        href="/profile"
        prefetch={false}
      >
        {profileLabel}
      </Link>
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

function MobileDrawerBrand({
  appName,
  roleLabel,
  schoolName,
  shortName,
}: {
  appName: string;
  roleLabel: string;
  schoolName: string | null;
  shortName: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs font-black shadow-sm">
        {shortName}
      </span>
      <div className="min-w-0">
        <p className="break-words text-sm font-extrabold leading-snug text-slate-950">
          {appName}
        </p>
        <p className="mt-0.5 break-words text-xs font-semibold leading-snug text-slate-600">
          {schoolName ?? roleLabel}
        </p>
        {schoolName ? (
          <p className="mt-0.5 break-words text-[0.68rem] leading-snug text-slate-500">
            {roleLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function getMobileNavigation(
  profile: Profile,
  isPlatformAdmin: boolean,
  isSafeguardingStaff: boolean,
  t: (key: string) => string,
) {
  const primaryDefinitions = profile ? mobilePrimaryNav[profile.role] : [];
  const primaryItems = primaryDefinitions.map((item) =>
    toMobileNavItem(item, profile, isPlatformAdmin, t),
  );
  const primaryHrefs = new Set(primaryDefinitions.map((item) => item.href));
  const groups = mobileNavGroups
    .map<MobileNavGroup>((group) => ({
      id: group.id,
      label: t(group.labelKey),
      items: group.items
        .filter((item) =>
          isVisibleForRole(
            item,
            profile,
            isPlatformAdmin,
            isSafeguardingStaff,
          ),
        )
        .filter((item) => !primaryHrefs.has(item.href))
        .map((item) =>
          toMobileNavItem(item, profile, isPlatformAdmin, t),
        ),
    }))
    .filter((group) => group.items.length);

  return { groups, primaryItems };
}

function toMobileNavItem(
  item: RoleAwareNavItem,
  profile: Profile,
  isPlatformAdmin: boolean,
  t: (key: string) => string,
): MobileNavItem {
  return {
    href: item.href,
    intentPrefetch: shouldIntentPrefetchNavigationItem(
      item,
      profile,
      isPlatformAdmin,
    ),
    label: t(item.labelKey),
    match: item.match,
  };
}

function shouldIntentPrefetchNavigationItem(
  item: RoleAwareNavItem,
  profile: Profile,
  isPlatformAdmin: boolean,
) {
  if (item.intentPrefetch === false || item.href.includes("?")) {
    return false;
  }

  if (isPlatformAdmin) {
    return platformPrimaryIntentHrefs.has(item.href);
  }

  return profile ? primaryIntentHrefs[profile.role].has(item.href) : false;
}

function isVisibleForRole(
  item: RoleAwareNavItem,
  profile: Profile,
  isPlatformAdmin: boolean,
  isSafeguardingStaff: boolean,
) {
  if (item.platformAdminOnly) {
    return isPlatformAdmin;
  }

  if (item.safeguardingOnly && !isSafeguardingStaff) {
    return false;
  }

  return !item.roles || (profile?.role && item.roles.includes(profile.role));
}

function formatRole(role: Role, t: (key: string) => string) {
  if (role === "school_admin") {
    return t("roles.schoolAdmin");
  }

  return role === "teacher" ? t("roles.teacher") : t("roles.student");
}
