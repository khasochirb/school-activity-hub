import { AuthShell } from "@/components/auth-shell";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <AuthShell
      backLink={{ href: "/login", label: t("auth.backToSignIn") }}
      description={t("auth.updatePassword.description")}
      eyebrow={t("auth.login.eyebrow")}
      title={t("auth.updatePassword.title")}
    >
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
          updateFailed: t("auth.updatePassword.errors.updateFailed"),
          updating: t("auth.updatePassword.updating"),
        }}
      />
    </AuthShell>
  );
}
