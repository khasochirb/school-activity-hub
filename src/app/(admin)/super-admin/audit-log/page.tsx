import Link from "next/link";
import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatDateTime } from "@/lib/i18n/date-format";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getSearchParam, matchesSearch } from "@/lib/list-filters";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../../_components/page-ui";

type AuditLog = {
  action: string;
  actor_profile_id: string | null;
  created_at: string;
  id: string;
  metadata: Record<string, unknown>;
  target_id: string | null;
  target_school_id: string | null;
  target_type: string;
};

type ActorProfile = {
  full_name: string;
  id: string;
};

type School = {
  id: string;
  name: string;
  slug: string;
};

type AuditLogSearchParams = {
  action?: string | string[];
  date?: string | string[];
  q?: string | string[];
  school?: string | string[];
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

export default async function SuperAdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<AuditLogSearchParams>;
}) {
  await requirePlatformAdmin();

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const searchQuery = getSearchParam(params.q);
  const selectedAction = getSearchParam(params.action);
  const selectedSchool = getSearchParam(params.school);
  const selectedDate = getSearchParam(params.date);
  const admin = createAdminClient();
  const { data: logs, error } = await admin
    .from("platform_audit_logs")
    .select(
      "id, actor_profile_id, action, target_type, target_id, target_school_id, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AuditLog[]>();

  if (error) {
    console.error("Super Admin audit log query failed", {
      code: error.code,
      message: error.message,
    });
  }

  const auditLogs = error ? [] : logs ?? [];
  const actorIds = uniqueStrings(
    auditLogs.map((log) => log.actor_profile_id).filter(Boolean),
  );
  const schoolIds = uniqueStrings(
    auditLogs.map((log) => log.target_school_id).filter(Boolean),
  );
  const [actorProfiles, schools] = await Promise.all([
    actorIds.length
      ? admin
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds)
          .returns<ActorProfile[]>()
      : Promise.resolve({ data: [] as ActorProfile[] }),
    schoolIds.length
      ? admin
          .from("schools")
          .select("id, name, slug")
          .in("id", schoolIds)
          .returns<School[]>()
      : Promise.resolve({ data: [] as School[] }),
  ]);
  const actorById = new Map(
    (actorProfiles.data ?? []).map((actor) => [actor.id, actor]),
  );
  const schoolById = new Map((schools.data ?? []).map((school) => [school.id, school]));
  const actorEmailById = await getAuthEmailsByProfileId(admin, actorIds);
  const actionOptions = uniqueStrings(auditLogs.map((log) => log.action));
  const schoolOptions = (schools.data ?? []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const filteredLogs = auditLogs.filter((log) => {
    const actor = log.actor_profile_id
      ? actorById.get(log.actor_profile_id)
      : undefined;
    const actorEmail = log.actor_profile_id
      ? actorEmailById.get(log.actor_profile_id)
      : null;
    const school = log.target_school_id
      ? schoolById.get(log.target_school_id)
      : undefined;
    const metadata = metadataSummary(log.metadata, t);

    return (
      (!selectedAction || log.action === selectedAction) &&
      (!selectedSchool || log.target_school_id === selectedSchool) &&
      (!selectedDate || log.created_at.slice(0, 10) === selectedDate) &&
      matchesSearch(searchQuery, [
        actor?.full_name,
        actorEmail,
        auditActionLabel(log.action, t),
        log.action,
        log.target_type,
        school?.name,
        school?.slug,
        metadata,
      ])
    );
  });

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="/super-admin" variant="secondary">
            {t("superAdmin.actions.backToPlatformDashboard")}
          </HeaderActionLink>
        }
        description={t("superAdmin.auditLog.description")}
        eyebrow={t("superAdmin.auditLog.platformSafety")}
        title={t("superAdmin.auditLog.title")}
      />

      <AuditFilterPanel
        actionOptions={actionOptions}
        date={selectedDate}
        resultCount={filteredLogs.length}
        schoolOptions={schoolOptions}
        selectedAction={selectedAction}
        selectedSchool={selectedSchool}
        searchQuery={searchQuery}
        t={t}
        tf={tf}
      />

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {t("superAdmin.auditLog.recentActions")}
          </h2>
          {error ? (
            <p className="mt-2 text-sm text-amber-700">
              {t("superAdmin.auditLog.unavailableDescription")}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="p-4">
            <EmptyState
              description={t("superAdmin.auditLog.unavailableDescription")}
              title={t("superAdmin.auditLog.unavailableTitle")}
            />
          </div>
        ) : null}

        {!error && auditLogs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              description={t("superAdmin.auditLog.emptyDescription")}
              title={t("superAdmin.auditLog.emptyTitle")}
            />
          </div>
        ) : null}

        {!error && auditLogs.length > 0 && filteredLogs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              action={
                <HeaderActionLink href="/super-admin/audit-log" variant="secondary">
                  {t("filters.clear")}
                </HeaderActionLink>
              }
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : null}

        {filteredLogs.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.auditLog.fields.createdAt")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.auditLog.fields.actor")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.auditLog.fields.action")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.auditLog.fields.target")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.auditLog.fields.targetSchool")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.auditLog.fields.metadata")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredLogs.map((log) => (
                    <AuditLogRow
                      actorById={actorById}
                      actorEmailById={actorEmailById}
                      key={log.id}
                      locale={locale}
                      log={log}
                      schoolById={schoolById}
                      t={t}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-200 lg:hidden">
              {filteredLogs.map((log) => (
                <AuditLogCard
                  actorById={actorById}
                  actorEmailById={actorEmailById}
                  key={log.id}
                  locale={locale}
                  log={log}
                  schoolById={schoolById}
                  t={t}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function AuditFilterPanel({
  actionOptions,
  date,
  resultCount,
  schoolOptions,
  selectedAction,
  selectedSchool,
  searchQuery,
  t,
  tf,
}: {
  actionOptions: string[];
  date: string;
  resultCount: number;
  schoolOptions: School[];
  selectedAction: string;
  selectedSchool: string;
  searchQuery: string;
  t: Translator;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  return (
    <section className="compact-filter-card section-card section-card-padded">
      <form action="/super-admin/audit-log" className="compact-filter-grid">
        <label className="compact-field flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("filters.search")}
          <input
            className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
            defaultValue={searchQuery}
            name="q"
            placeholder={t("superAdmin.auditLog.searchPlaceholder")}
            type="search"
          />
        </label>
        <label className="compact-select flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.auditLog.fields.action")}
          <select
            className="h-11 cursor-pointer rounded-md border px-3 text-base font-normal outline-none transition"
            defaultValue={selectedAction}
            name="action"
          >
            <option value="">{t("filters.all")}</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {auditActionLabel(action, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-select flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.auditLog.fields.targetSchool")}
          <select
            className="h-11 cursor-pointer rounded-md border px-3 text-base font-normal outline-none transition"
            defaultValue={selectedSchool}
            name="school"
          >
            <option value="">{t("filters.all")}</option>
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-select flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.auditLog.fields.date")}
          <input
            className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
            defaultValue={date}
            name="date"
            type="date"
          />
        </label>
        <div className="compact-filter-actions">
          <button className="btn btn-primary min-h-11 md:min-h-10" type="submit">
            {t("filters.filter")}
          </button>
          <Link
            className="btn btn-secondary min-h-11 md:min-h-10"
            href="/super-admin/audit-log"
          >
            {t("filters.clear")}
          </Link>
        </div>
      </form>
      <p className="mt-2 text-sm font-medium text-slate-600">
        {tf("filters.showingResults", { count: resultCount })}
      </p>
    </section>
  );
}

function AuditLogRow({
  actorById,
  actorEmailById,
  locale,
  log,
  schoolById,
  t,
}: {
  actorById: Map<string, ActorProfile>;
  actorEmailById: Map<string, string | null>;
  locale: Locale;
  log: AuditLog;
  schoolById: Map<string, School>;
  t: Translator;
}) {
  return (
    <tr>
      <td className="px-4 py-3 text-zinc-700">
        {formatDateTime(log.created_at, locale)}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        <ActorLabel
          actor={log.actor_profile_id ? actorById.get(log.actor_profile_id) : undefined}
          email={
            log.actor_profile_id ? actorEmailById.get(log.actor_profile_id) : null
          }
          t={t}
        />
      </td>
      <td className="px-4 py-3">
        <StatusBadge variant="info">{auditActionLabel(log.action, t)}</StatusBadge>
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {targetLabel(log, t)}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        <SchoolLabel
          school={
            log.target_school_id ? schoolById.get(log.target_school_id) : undefined
          }
          t={t}
        />
      </td>
      <td className="max-w-md px-4 py-3 text-zinc-700">
        {metadataSummary(log.metadata, t)}
      </td>
    </tr>
  );
}

function AuditLogCard({
  actorById,
  actorEmailById,
  locale,
  log,
  schoolById,
  t,
}: {
  actorById: Map<string, ActorProfile>;
  actorEmailById: Map<string, string | null>;
  locale: Locale;
  log: AuditLog;
  schoolById: Map<string, School>;
  t: Translator;
}) {
  return (
    <article className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            {auditActionLabel(log.action, t)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {formatDateTime(log.created_at, locale)}
          </p>
        </div>
        <StatusBadge variant="info">{targetLabel(log, t)}</StatusBadge>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DetailItem
          label={t("superAdmin.auditLog.fields.actor")}
          value={
            <ActorLabel
              actor={
                log.actor_profile_id ? actorById.get(log.actor_profile_id) : undefined
              }
              email={
                log.actor_profile_id
                  ? actorEmailById.get(log.actor_profile_id)
                  : null
              }
              t={t}
            />
          }
        />
        <DetailItem
          label={t("superAdmin.auditLog.fields.targetSchool")}
          value={
            <SchoolLabel
              school={
                log.target_school_id
                  ? schoolById.get(log.target_school_id)
                  : undefined
              }
              t={t}
            />
          }
        />
        <DetailItem
          label={t("superAdmin.auditLog.fields.metadata")}
          value={metadataSummary(log.metadata, t)}
        />
      </dl>
    </article>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-zinc-900">{value}</dd>
    </div>
  );
}

function ActorLabel({
  actor,
  email,
  t,
}: {
  actor: ActorProfile | undefined;
  email: string | null | undefined;
  t: Translator;
}) {
  if (!actor && !email) {
    return <span>{t("common.notAvailableShort")}</span>;
  }

  return (
    <span>
      {actor?.full_name ?? t("common.notAvailableShort")}
      {email ? <span className="block break-all text-zinc-500">{email}</span> : null}
    </span>
  );
}

function SchoolLabel({
  school,
  t,
}: {
  school: School | undefined;
  t: Translator;
}) {
  if (!school) {
    return <span>{t("common.notAvailableShort")}</span>;
  }

  return (
    <span>
      {school.name}
      <span className="block break-all text-zinc-500">{school.slug}</span>
    </span>
  );
}

async function getAuthEmailsByProfileId(
  admin: ReturnType<typeof createAdminClient>,
  actorIds: string[],
) {
  const emailEntries = await Promise.all(
    actorIds.map(async (actorId) => {
      const { data, error } = await admin.auth.admin.getUserById(actorId);

      return [actorId, error ? null : data.user?.email ?? null] as const;
    }),
  );

  return new Map(emailEntries);
}

function metadataSummary(metadata: Record<string, unknown>, t: Translator) {
  const entries = Object.entries(metadata)
    .filter(([, value]) => isScalarMetadataValue(value))
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

function targetLabel(log: AuditLog, t: Translator) {
  return `${log.target_type}${log.target_id ? ` #${shortId(log.target_id)}` : ""}`;
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function auditActionLabel(action: string, t: Translator) {
  const key = actionLabelKeyByAction[action];

  return key ? t(key) : action;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}
