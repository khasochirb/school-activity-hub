import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
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
  eyebrow: string;
  title: string;
}) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

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
          <span className="font-display font-semibold">{t("app.name")}</span>
        </Link>
        <div className="mt-auto">
          <p className="auth-panel-headline font-display">{t("landing.headline")}</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backLink ? (
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
              href={backLink.href}
            >
              <span aria-hidden="true">←</span>
              {backLink.label}
            </Link>
          ) : (
            <Link className="flex items-center gap-3 lg:invisible" href="/">
              <BrandMark className="h-9 w-9" />
              <span className="whitespace-nowrap font-display text-sm font-semibold">
                {t("app.name")}
              </span>
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher
              className="w-auto"
              currentLocale={locale}
              label={t("language.label")}
              labels={{
                en: t("language.en"),
                mn: t("language.mn"),
              }}
            />
            <ThemeToggle
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
          <p className="page-eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
          <div className="auth-card mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
