import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { ConsoleShell } from "./console-shell";

// Platform admins' console: its own dark shell with a sidebar, outside the
// school app's top bar. Every page in this group is platform-admin only.
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdmin();
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);

  return (
    <ConsoleShell
      email={admin.email}
      labels={{
        auditLog: t("nav.auditLog"),
        backToApp: t("superAdmin.sites.console.backToApp"),
        brandSub: t("superAdmin.sites.console.brandSub"),
        connections: t("nav.platformConnections"),
        dashboard: t("nav.platformDashboard"),
        platformAdmins: t("nav.platformAdmins"),
        schoolSites: t("nav.schoolSites"),
        schools: t("nav.schools"),
        sectionManage: t("superAdmin.sites.console.sectionManage"),
        sectionSystem: t("superAdmin.sites.console.sectionSystem"),
      }}
      name={admin.full_name}
    >
      {children}
    </ConsoleShell>
  );
}
