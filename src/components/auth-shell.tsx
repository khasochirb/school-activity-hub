import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";

// Shared frame for the signed-out account pages (sign in, join, password
// reset): a brand panel on large screens and the form card beside it.
export async function AuthShell({
  backLink,
  children,
  description,
  eyebrow,
  title,
}: {
  backLink?: { href: string; label: string };
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  const highlights = [
    t("landing.trustInviteOnly"),
    t("landing.trustStaffApproval"),
    t("landing.trustQrAttendance"),
  ];

  return (
    <main className="auth-shell min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="auth-panel hidden lg:flex">
        <Link className="flex w-fit items-center gap-3" href="/">
          <BrandMark />
          <span className="font-semibold">{t("app.name")}</span>
        </Link>
        <AuthPanelPreview t={t} tf={tf} />
        <div className="mt-auto">
          <p className="auth-panel-headline">{t("landing.headline")}</p>
          <ul className="mt-8 grid gap-3">
            {highlights.map((item) => (
              <li className="flex items-center gap-3 text-sm font-semibold" key={item}>
                <span aria-hidden="true" className="auth-panel-dot" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          {backLink ? (
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
              href={backLink.href}
            >
              <span aria-hidden="true">←</span>
              {backLink.label}
            </Link>
          ) : (
            <Link className="flex min-w-0 items-center gap-3 lg:hidden" href="/">
              <BrandMark className="h-9 w-9" />
              <span className="hidden min-w-0 text-sm font-semibold leading-tight sm:inline">
                {t("app.name")}
              </span>
            </Link>
          )}
          <div className="auth-controls flex shrink-0 items-center gap-2">
            <LanguageSwitcher
              className="w-auto"
              compact
              currentLocale={locale}
              label={t("language.label")}
              labels={{
                en: t("language.en"),
                mn: t("language.mn"),
              }}
            />
            <ThemeToggle
              compact
              currentTheme={theme}
              label={t("theme.label")}
              labels={{
                dark: t("theme.dark"),
                light: t("theme.light"),
                system: t("theme.system"),
              }}
              showLabel={false}
              switchLabel={t("theme.switch")}
            />
          </div>
        </div>

        <section className="mx-auto my-auto w-full max-w-md py-10">
          {eyebrow ? <p className="page-eyebrow mb-4">{eyebrow}</p> : null}
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
          <div className="auth-card mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

// A glimpse of what students find after signing in, built from the app's own
// reviewed labels rather than marketing copy.
function AuthPanelPreview({
  t,
  tf,
}: {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const cards = [
    {
      category: t("categories.arts"),
      flags: [
        t("clubs.profile.fields.beginnersWelcome"),
        t("clubs.profile.fields.firstVisitFree"),
      ],
      tilt: "-rotate-2",
    },
    {
      category: t("categories.sports"),
      flags: [t("clubs.profile.fields.beginnersWelcome")],
      tilt: "rotate-1 translate-x-8",
    },
  ];

  return (
    <div aria-hidden="true" className="auth-panel-preview my-auto py-8">
      <p className="mb-3 text-sm font-semibold opacity-80">
        {t("studentProfile.clubsForYou.title")}
      </p>
      <div className="grid max-w-sm gap-3">
        {cards.map((card) => (
          <div
            className={`auth-panel-card rounded-2xl p-4 shadow-xl ${card.tilt}`}
            key={card.category}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold">{card.category}</span>
              <span className="auth-panel-join rounded-full px-3 py-1 text-xs font-bold">
                {t("clubs.actions.join")}
              </span>
            </div>
            <p className="mt-1 text-sm opacity-75">
              {tf("studentProfile.clubsForYou.reason", { interest: card.category })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {card.flags.map((flag) => (
                <span className="auth-panel-flag rounded-full px-2.5 py-1 text-xs font-semibold" key={flag}>
                  {flag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
