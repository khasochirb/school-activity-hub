import type { ReactNode } from "react";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { ConsoleShell } from "./console-shell";

// The platform admins' frame with its labels. The caller has already checked
// that this person is an active platform admin.
export async function ConsoleFrame({
  children,
  email,
  name,
}: {
  children: ReactNode;
  email: string | null;
  name: string;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <ConsoleShell
      email={email}
      labels={{
        activities: t("nav.activities"),
        appName: t("app.name"),
        approvals: t("nav.approvals"),
        auditLog: t("nav.auditLog"),
        brandSub: t("superAdmin.sites.console.brandSub"),
        connections: t("nav.platformConnections"),
        language: t("language.label"),
        loggingOut: t("nav.loggingOut"),
        logout: t("nav.logout"),
        overview: t("superAdmin.overview.title"),
        platformAdmins: t("nav.platformAdmins"),
        reports: t("nav.reports"),
        schoolSites: t("nav.schoolSites"),
        schools: t("nav.schools"),
        sectionManage: t("superAdmin.sites.console.sectionManage"),
        sectionSystem: t("superAdmin.sites.console.sectionSystem"),
      }}
      locale={locale}
      name={name}
    >
      {children}
    </ConsoleShell>
  );
}
