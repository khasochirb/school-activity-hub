import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { JoinForm } from "./join-form";

export default async function JoinPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <AuthShell
      description={t("auth.join.description")}
      eyebrow={t("auth.join.eyebrow")}
      title={t("auth.join.title")}
    >
      <JoinForm
        labels={{
          confirmPassword: t("auth.join.confirmPassword"),
          createAccount: t("auth.join.createAccount"),
          creatingAccount: t("auth.join.creatingAccount"),
          email: t("auth.join.email"),
          emailHint: t("auth.join.emailHint"),
          inviteCode: t("auth.join.inviteCode"),
          inviteCodePlaceholder: t("auth.join.inviteCodePlaceholder"),
          password: t("auth.join.password"),
        }}
      />
      <p className="mt-4 text-sm text-slate-600">
        {t("family.join.parentInstead")}{" "}
        <Link className="font-semibold underline" href="/join/parent">
          {t("family.join.parentLink")}
        </Link>
      </p>
    </AuthShell>
  );
}
