import { AuthShell } from "@/components/auth-shell";
import { redirect } from "next/navigation";
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
    <AuthShell
      description={t("auth.login.description")}
      eyebrow={t("auth.login.eyebrow")}
      title={t("auth.login.title")}
    >
      <LoginForm
        labels={{
          email: t("auth.login.email"),
          failed: t("auth.login.failed"),
          forgotPassword: t("auth.login.forgotPassword"),
          password: t("auth.login.password"),
          signingIn: t("auth.login.signingIn"),
          signIn: t("auth.login.signIn"),
        }}
      />
    </AuthShell>
  );
}
