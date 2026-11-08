import Link from "next/link";
import { BrandGlyph } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locales";
import type { ThemePreference } from "@/lib/theme";
import { logout } from "../actions";
import {
  MobileAppNav,
  type MobileNavGroup,
  type MobileNavItem,
  type MobileNavMatch,
} from "./mobile-app-nav";
import { MobileMenuDrawer } from "./mobile-menu-drawer";
import { RouteContentTransition } from "./route-content-transition";
import { StudentTabBar } from "./student-tab-bar";
import { QuickFind } from "./quick-find";
import { TopBarClock } from "./top-bar-clock";
import { TopTabs, type TopTab } from "./top-tabs";

type Role = "school_admin" | "teacher" | "student";

type Profile = {
  fullName?: string | null;
  role: Role;
  schoolName: string | null;
  timeZone?: string | null;
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

const platformEventMobilePrimaryNav: RoleAwareNavItem[] = [
  { href: "/events", labelKey: "nav.activities", match: "events" },
  {
    href: "/events?view=month",
    labelKey: "nav.calendar",
    match: "calendar",
    intentPrefetch: false,
  },
  { href: "/approvals", labelKey: "nav.approvals" },
  {
    href: staffAttendanceHref,
    labelKey: "nav.attendance",
    match: "attendance",
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
    { href: "/portfolio", labelKey: "nav.portfolio" },
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

  const topTabs = getTopTabs(profile?.role ?? null, isPlatformAdmin, t);

  return (
    <div className="app-surface min-h-screen">
      <div className="min-w-0">
        <header className="app-topbar">
          <div className="app-topbar-inner">
            <Brand
              compact
              dashboardLabel={t("nav.dashboard")}
              name={t("app.name")}
              subtitle={t("app.subtitle")}
            />
            <TopTabs label={t("nav.tabs.label")} tabs={topTabs} />
            <div className="topbar-right">
              <TopBarClock locale={locale} timeZone={profile?.timeZone ?? null} />
              <QuickFind
                closeLabel={t("common.close")}
                label={t("nav.search.label")}
                placeholder={
                  profile && profile.role !== "student"
                    ? t("nav.search.placeholderStaff")
                    : t("nav.search.placeholder")
                }
                targets={[
                  ...(profile
                    ? [
                        { href: "/events", label: t("nav.search.inEvents") },
                        { href: "/clubs", label: t("nav.search.inClubs") },
                      ]
                    : []),
                  ...(profile && profile.role !== "student"
                    ? [{ href: "/students", label: t("nav.search.inStudents") }]
                    : []),
                ]}
              />
            <MobileMenuDrawer
              closeLabel={t("common.close")}
              header={
                <MobileDrawerBrand
                  appName={t("app.name")}
                  roleLabel={formattedRole}
                  schoolName={profile?.schoolName ?? null}
                />
              }
              menuLabel={t("nav.more")}
              trigger={
                <span aria-hidden="true">
                  {initialsOf(profile?.fullName ?? email ?? "")}
                </span>
              }
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
          </div>
        </header>

        <main
          className={[
            "app-main mx-auto w-full max-w-[72rem] px-4 py-5 sm:px-6 sm:py-6 lg:py-8",
            profile ? "pb-28 lg:pb-8" : "",
          ].join(" ")}
        >
          <RouteContentTransition>{children}</RouteContentTransition>
        </main>
      </div>
      {profile ? (
        <StudentTabBar
          label={t("nav.tabs.label")}
          tabs={[
            { href: "/dashboard", label: t("nav.tabs.home") },
            { href: "/events", label: t("nav.tabs.events") },
            { href: "/clubs", label: t("nav.tabs.clubs") },
            profile.role === "student"
              ? { href: "/portfolio", label: t("nav.tabs.portfolio") }
              : { href: "/students", label: t("nav.students") },
          ]}
        />
      ) : null}
    </div>
  );
}

function Brand({
  compact = false,
  dashboardLabel,
  name,
  subtitle,
}: {
  compact?: boolean;
  dashboardLabel: string;
  name: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-3">
      <Link
        aria-label={`${name} ${dashboardLabel}`}
        className={
          compact
            ? "brand-mark flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl transition"
            : "brand-mark flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition"
        }
        href="/dashboard"
        prefetch={false}
      >
        <BrandGlyph />
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
        <PendingLinkIndicator />
      </Link>
      <div className="pill-controls grid min-w-0 max-w-full gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
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
}: {
  appName: string;
  roleLabel: string;
  schoolName: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <BrandGlyph />
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
  const primaryDefinitions = profile
    ? mobilePrimaryNav[profile.role]
    : isPlatformAdmin
      ? platformEventMobilePrimaryNav
      : [];
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

  if (isPlatformAdmin && item.href === "/approvals") {
    return true;
  }

  return !item.roles || (profile?.role && item.roles.includes(profile.role));
}

function formatRole(role: Role, t: (key: string) => string) {
  if (role === "school_admin") {
    return t("roles.schoolAdmin");
  }

  return role === "teacher" ? t("roles.teacher") : t("roles.student");
}

function getTopTabs(
  role: string | null,
  isPlatformAdmin: boolean,
  t: (key: string) => string,
): TopTab[] {
  if (!role && isPlatformAdmin) {
    return [
      { exact: true, href: "/super-admin", icon: "home", label: t("nav.tabs.platform") },
      { href: "/super-admin/schools", icon: "schools", label: t("nav.tabs.schools") },
      { href: "/super-admin/connections", icon: "events", label: t("nav.tabs.connections") },
      { href: "/super-admin/audit-log", icon: "audit", label: t("nav.tabs.audit") },
    ];
  }

  if (role === "student") {
    return [
      { exact: true, href: "/dashboard", icon: "home", label: t("nav.tabs.home") },
      { href: "/events", icon: "events", label: t("nav.tabs.events") },
      { href: "/clubs", icon: "clubs", label: t("nav.tabs.clubs") },
      { href: "/portfolio", icon: "portfolio", label: t("nav.tabs.portfolio") },
    ];
  }

  return [
    { exact: true, href: "/dashboard", icon: "home", label: t("nav.tabs.home") },
    { href: "/events", icon: "events", label: t("nav.tabs.events") },
    { href: "/students", icon: "students", label: t("nav.tabs.students") },
    { href: "/approvals", icon: "approvals", label: t("nav.tabs.approvals") },
  ];
}

function initialsOf(value: string) {
  const words = value.replace(/@.*/, "").trim().split(/[\s._-]+/).filter(Boolean);

  if (!words.length) return "?";

  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}
