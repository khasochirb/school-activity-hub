import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { JoinForm } from "./join-form";

export default async function JoinPage() {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <main className="app-surface px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            className="flex w-fit cursor-pointer items-center gap-3 text-sm font-bold text-slate-700 transition hover:text-teal-800"
            href="/"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-xs font-bold text-white">
              {t("app.shortName")}
            </span>
            <span>{t("app.name")}</span>
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            <LanguageSwitcher
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
        <section className="section-card p-5 sm:p-8">
          <p className="page-eyebrow">{t("auth.join.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {t("auth.join.title")}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600 sm:text-sm sm:leading-6">
            {t("auth.join.description")}
          </p>
          <JoinForm
            labels={{
              createAccount: t("auth.join.createAccount"),
              creatingAccount: t("auth.join.creatingAccount"),
              email: t("auth.join.email"),
              inviteCode: t("auth.join.inviteCode"),
              inviteCodeHelper: t("auth.join.description"),
              inviteCodePlaceholder: t("auth.join.inviteCodePlaceholder"),
              password: t("auth.join.password"),
            }}
          />
        </section>
      </div>
    </main>
  );
}
