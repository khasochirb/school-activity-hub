import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            className="w-fit cursor-pointer text-sm font-semibold text-zinc-700 transition hover:text-zinc-950"
            href="/login"
          >
            {t("auth.backToSignIn")}
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
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {t("auth.updatePassword.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {t("auth.updatePassword.description")}
          </p>
          <UpdatePasswordForm
            labels={{
              checkingLink: t("auth.updatePassword.checkingLink"),
              confirmPassword: t("auth.updatePassword.confirmPassword"),
              goToDashboard: t("auth.updatePassword.goToDashboard"),
              newPassword: t("auth.updatePassword.newPassword"),
              openResetLink: t("auth.updatePassword.openResetLink"),
              passwordMinLength: t("auth.errors.passwordMinLength"),
              passwordMismatch: t("auth.updatePassword.errors.passwordMismatch"),
              submit: t("auth.updatePassword.submit"),
              success: t("auth.updatePassword.success"),
              updating: t("auth.updatePassword.updating"),
            }}
          />
        </section>
      </div>
    </main>
  );
}
