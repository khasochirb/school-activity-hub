import Link from "next/link";
import {
  loadPlatformAuditLogs,
  type PlatformAuditLog,
} from "@/lib/audit/platform-audit-query";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EmptyState,
  HeaderActionLink,
  StatusBadge,
} from "../_components/page-ui";
import { ClubAvatar, PageHead, Section, Widget } from "../_components/clean-ui";

type CountResult = {
  count: number | null;
};

type School = {
  id: string;
  name: string;
  slug: string;
};

type Translator = (key: string) => string;
type Locale = Awaited<ReturnType<typeof getCurrentLocale>>;

const actionLabelKeyByAction: Record<string, string> = {
  "platform.connection.approved":
    "superAdmin.auditLog.actionLabels.connectionApproved",
  "platform.connection.created":
    "superAdmin.auditLog.actionLabels.connectionCreated",
  "platform.connection.rejected":
    "superAdmin.auditLog.actionLabels.connectionRejected",
  "platform.connection.revoked":
    "superAdmin.auditLog.actionLabels.connectionRevoked",
  "platform.platform_admin.added":
    "superAdmin.auditLog.actionLabels.platformAdminAdded",
  "platform.platform_admin.deactivated":
    "superAdmin.auditLog.actionLabels.platformAdminDeactivated",
  "platform.platform_admin.reactivated":
    "superAdmin.auditLog.actionLabels.platformAdminReactivated",
  "platform.school.created": "superAdmin.auditLog.actionLabels.schoolCreated",
  "platform.school.updated": "superAdmin.auditLog.actionLabels.schoolUpdated",
  "platform.school_admin.created":
    "superAdmin.auditLog.actionLabels.schoolAdminCreated",
  "platform.school_admin.deactivated":
    "superAdmin.auditLog.actionLabels.schoolAdminDeactivated",
  "platform.school_admin.reactivated":
    "superAdmin.auditLog.actionLabels.schoolAdminReactivated",
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
    auditLogResult,
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
    loadPlatformAuditLogs({
      admin,
      context: "Super Admin dashboard audit log query",
      limit: 5,
    }),
  ]);
  const [{ data: schoolRows }, pendingConnectionsResult] = await Promise.all([
    admin
      .from("schools")
      .select("id, name, slug, province, status")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Array<{ id: string; name: string; province: string | null; slug: string; status: string }>>(),
    admin
      .from("school_connections")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  const schoolList = schoolRows ?? [];
  const pendingConnections = pendingConnectionsResult.count ?? 0;
  const provinceCounts = Array.from(
    schoolList.reduce((counts, school) => {
      const key = school.province?.trim() || "-";
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  )
    .map(([province, count]) => ({ count, province }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
  const recentAuditLogs = auditLogResult.logs;
  const schoolIds = uniqueStrings(
    recentAuditLogs.map((log) => log.target_school_id),
  );
  const schoolById = await getAuditLogSchools(admin, schoolIds);
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
    <div className="cl-page">
      <div className="flex flex-col gap-2">
        <span className="cl-tag self-start" data-tone="blue">
          {t("superAdmin.page.mode")}
        </span>
        <PageHead
          action={
            <HeaderActionLink href="/super-admin/schools/new" prefetch={false}>
              + {t("superAdmin.page.newSchool")}
            </HeaderActionLink>
          }
          subtitle={t("superAdmin.dashboard.description")}
          title={t("superAdmin.dashboard.title")}
        />
      </div>

      <section className="cl-stats">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <div className="cl-split">
        <div className="cl-main">
          <Section
            link={{ href: "/super-admin/schools", label: t("superAdmin.actions.viewSchools") }}
            title={t("superAdmin.page.schools")}
          >
            {schoolList.length ? (
              <div className="cl-egrid">
                {schoolList.slice(0, 6).map((school) => (
                  <Link
                    className="cl-card cl-row items-start"
                    href={`/super-admin/schools/${school.id}`}
                    key={school.id}
                    prefetch={false}
                  >
                    <ClubAvatar category={null} name={school.name} size={44} />
                    <span className="cl-grow">
                      <span className="cl-row-title">{school.name}</span>
                      <span className="cl-row-sub">
                        {[school.province, school.slug].filter(Boolean).join(" · ")}
                      </span>
                      <span
                        className="cl-tag mt-2"
                        data-tone={school.status === "active" ? "ok" : undefined}
                      >
                        {t(`status.${school.status}`)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="cl-card cl-empty">{t("superAdmin.page.noSchools")}</p>
            )}
          </Section>

          <Section
            link={{ href: "/super-admin/audit-log", label: t("nav.auditLog") }}
            title={t("superAdmin.auditLog.recentActions")}
          >
          {auditLogResult.state === "unavailable" ? (
            <div className="p-4">
              <EmptyState
                description={t("superAdmin.auditLog.unavailableDescription")}
                title={t("superAdmin.auditLog.unavailableTitle")}
              />
            </div>
          ) : auditLogResult.state === "error" ? (
            <div className="p-4">
              <EmptyState
                description={t("superAdmin.auditLog.loadFailedDescription")}
                title={t("common.somethingWentWrong")}
              />
            </div>
          ) : recentAuditLogs.length === 0 ? (
            <div className="p-4">
              <div className="empty-state">
                <p className="text-sm font-bold text-slate-950">
                  {t("superAdmin.auditLog.noRecentActions")}
                </p>
              </div>
            </div>
          ) : (
            <div className="cl-card cl-rows">
              {recentAuditLogs.map((log) => (
                <RecentAuditLogCard
                  key={log.id}
                  locale={locale}
                  log={log}
                  schoolById={schoolById}
                  t={t}
                />
              ))}
            </div>
          )}
          </Section>
        </div>

        <aside className="cl-side">
          <Widget
            link={{ href: "/super-admin/connections", label: t("superAdmin.actions.viewConnections") }}
            title={t("superAdmin.page.needsAttention")}
          >
            {pendingConnections ? (
              <p className="text-sm">
                <b>{pendingConnections}</b> {t("superAdmin.page.pendingConnections")}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">{t("superAdmin.page.allClear")}</p>
            )}
          </Widget>
          {provinceCounts.length ? (
            <Widget title={t("superAdmin.page.byProvince")}>
              {provinceCounts.map((item) => (
                <div className="cl-goal" key={item.province}>
                  <div>
                    <span>{item.province}</span>
                    <b>{item.count}</b>
                  </div>
                  <div className="cl-bar">
                    <i style={{ width: `${(item.count / provinceCounts[0].count) * 100}%` }} />
                  </div>
                </div>
              ))}
            </Widget>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="cl-card cl-stat">
      <span className="cl-muted">{label}</span>
      <b>{value.toLocaleString()}</b>
    </article>
  );
}

function countValue(result: CountResult) {
  return result.count ?? 0;
}

function RecentAuditLogCard({
  locale,
  log,
  schoolById,
  t,
}: {
  locale: Locale;
  log: PlatformAuditLog;
  schoolById: Map<string, School>;
  t: Translator;
}) {
  const school = log.target_school_id
    ? schoolById.get(log.target_school_id)
    : undefined;

  return (
    <article className="cl-row items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant="info">{auditActionLabel(log.action, t)}</StatusBadge>
          <span className="text-sm font-medium text-slate-600">
            {formatDateTime(log.created_at, locale)}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-700">
          {school ? `${school.name} (${school.slug})` : log.target_type}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {metadataSummary(log.metadata, t)}
        </p>
      </div>
      <Link className="cl-widget-link ml-auto shrink-0" href="/super-admin/audit-log" prefetch={false}>
        {t("common.viewDetails")}
      </Link>
    </article>
  );
}

async function getAuditLogSchools(
  admin: ReturnType<typeof createAdminClient>,
  schoolIds: string[],
) {
  if (!schoolIds.length) {
    return new Map<string, School>();
  }

  const { data, error } = await admin
    .from("schools")
    .select("id, name, slug")
    .in("id", schoolIds)
    .returns<School[]>();

  if (error) {
    console.error("Super Admin dashboard audit log school lookup failed", {
      code: error.code,
    });
  }

  return new Map((data ?? []).map((school) => [school.id, school]));
}

function metadataSummary(metadata: Record<string, unknown>, t: Translator) {
  const entries = Object.entries(metadata)
    .filter(([, value]) => isScalarMetadataValue(value))
    .slice(0, 3)
    .map(([key, value]) => `${formatMetadataKey(key)}: ${formatMetadataValue(value, t)}`);

  return entries.length ? entries.join(", ") : t("common.notAvailableShort");
}

function formatMetadataKey(key: string) {
  return key
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetadataValue(value: unknown, t: Translator) {
  if (value === true) {
    return t("common.yes");
  }

  if (value === false) {
    return t("common.no");
  }

  return value === null ? t("common.notAvailableShort") : String(value);
}

function isScalarMetadataValue(value: unknown) {
  return (
    value === null ||
    ["boolean", "number", "string"].includes(typeof value)
  );
}

function auditActionLabel(action: string, t: Translator) {
  const key = actionLabelKeyByAction[action];

  return key ? t(key) : action;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}
