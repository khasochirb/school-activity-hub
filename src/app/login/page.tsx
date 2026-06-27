import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("login.query.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (user) {
    redirect(
      (await timeServer("login.query.has-any-school", () => hasAnySchool()))
        ? "/dashboard"
        : "/setup",
    );
  }

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
          <LanguageSwitcher
            currentLocale={locale}
            label={t("language.label")}
            labels={{
              en: t("language.en"),
              mn: t("language.mn"),
            }}
          />
        </div>
        <section className="section-card p-6 sm:p-8">
          <p className="page-eyebrow">{t("auth.login.eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {t("auth.login.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("auth.login.description")}
          </p>
          <LoginForm
            labels={{
              email: t("auth.login.email"),
              forgotPassword: t("auth.login.forgotPassword"),
              password: t("auth.login.password"),
              signingIn: t("auth.login.signingIn"),
              signIn: t("auth.login.signIn"),
            }}
          />
        </section>
      </div>
    </main>
  );
}
