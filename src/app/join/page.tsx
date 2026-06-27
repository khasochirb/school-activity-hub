import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { JoinForm } from "./join-form";

export default async function JoinPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <main className="app-surface px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            className="flex w-fit cursor-pointer items-center gap-3 text-sm font-bold text-slate-700 transition hover:text-teal-800"
            href="/"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-xs font-bold text-white">
              {t("app.shortName")}
            </span>
            <span>{t("app.name")}</span>
          </Link>
          <LanguageSwitcher currentLocale={locale} label={t("language.label")} />
        </div>
        <section className="section-card p-6 sm:p-8">
          <p className="page-eyebrow">{t("join.eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {t("join.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("join.description")}
          </p>
          <JoinForm
            labels={{
              createAccount: t("join.createAccount"),
              creatingAccount: t("join.creatingAccount"),
              email: t("join.email"),
              inviteCode: t("join.inviteCode"),
              password: t("join.password"),
            }}
          />
        </section>
      </div>
    </main>
  );
}
