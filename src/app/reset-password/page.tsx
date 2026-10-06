import { AuthShell } from "@/components/auth-shell";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <AuthShell
      backLink={{ href: "/login", label: t("auth.backToSignIn") }}
      description={t("auth.reset.description")}
      eyebrow={t("auth.login.eyebrow")}
      title={t("auth.reset.title")}
    >
      <ResetPasswordForm
        labels={{
          email: t("auth.reset.email"),
          emailRequired: t("auth.reset.errors.emailRequired"),
          requestFailed: t("auth.reset.errors.requestFailed"),
          sending: t("auth.reset.sending"),
          submit: t("auth.reset.submit"),
          success: t("auth.reset.success"),
        }}
      />
    </AuthShell>
  );
}
