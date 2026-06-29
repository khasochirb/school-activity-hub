import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  HeaderActionLink,
  PageHeader,
} from "../_components/page-ui";

type CountResult = {
  count: number | null;
};

export default async function SuperAdminPage() {
  await requirePlatformAdmin();

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const admin = createAdminClient();

  const [
    allSchoolsResult,
    activeSchoolsResult,
    platformAdminsResult,
    schoolConnectionsResult,
  ] = await Promise.all([
    admin.from("schools").select("id", { count: "exact", head: true }),
    admin
      .from("schools")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("platform_admins")
      .select("profile_id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("school_connections")
      .select("id", { count: "exact", head: true }),
  ]);

  const metrics = [
    {
      label: t("superAdmin.metrics.allSchools"),
      value: countValue(allSchoolsResult),
    },
    {
      label: t("superAdmin.metrics.activeSchools"),
      value: countValue(activeSchoolsResult),
    },
    {
      label: t("superAdmin.metrics.platformAdmins"),
      value: countValue(platformAdminsResult),
    },
    {
      label: t("superAdmin.metrics.schoolConnections"),
      value: countValue(schoolConnectionsResult),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <HeaderActionLink href="/super-admin/schools">
              {t("superAdmin.actions.viewSchools")}
            </HeaderActionLink>
            <HeaderActionLink href="/super-admin/connections" variant="secondary">
              {t("superAdmin.actions.viewConnections")}
            </HeaderActionLink>
          </>
        }
        description={t("superAdmin.dashboard.description")}
        eyebrow={t("nav.superAdmin")}
        title={t("superAdmin.dashboard.title")}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="section-card section-card-padded">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value.toLocaleString()}
      </p>
    </article>
  );
}

function countValue(result: CountResult) {
  return result.count ?? 0;
}
