import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { ParentJoinForm } from "./parent-join-form";

export default async function ParentJoinPage() {
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);

  return (
    <AuthShell
      description={t("family.join.description")}
      eyebrow={t("family.join.eyebrow")}
      title={t("family.join.title")}
    >
      <ParentJoinForm
        labels={{
          confirmPassword: t("auth.join.confirmPassword"),
          createAccount: t("family.join.createAccount"),
          creatingAccount: t("auth.join.creatingAccount"),
          email: t("auth.join.email"),
          emailHint: t("auth.join.emailHint"),
          fullName: t("family.join.fullName"),
          inviteCode: t("family.join.inviteCode"),
          inviteCodePlaceholder: t("auth.join.inviteCodePlaceholder"),
          password: t("auth.join.password"),
        }}
      />
      <p className="mt-4 text-sm text-slate-600">
        {t("family.join.studentInstead")} <Link className="font-semibold underline" href="/join">{t("family.join.studentLink")}</Link>
      </p>
    </AuthShell>
  );
}
