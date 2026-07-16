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
  PageHeader,
  StatusBadge,
} from "../_components/page-ui";

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

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {t("superAdmin.auditLog.recentActions")}
            </h2>
            <p className="section-description">
              {t("superAdmin.auditLog.description")}
            </p>
          </div>
          <HeaderActionLink href="/super-admin/audit-log" variant="secondary">
            {t("nav.auditLog")}
          </HeaderActionLink>
        </div>

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
          <div className="divide-y divide-zinc-200">
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
    <article className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
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
      <Link className="btn btn-secondary h-10 w-full sm:w-auto" href="/super-admin/audit-log">
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
      message: error.message,
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
