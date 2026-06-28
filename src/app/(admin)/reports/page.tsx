import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../_components/page-ui";
import {
  getCurrentStaffProfile,
  getReportsData,
  type ReportTableRow,
} from "./report-data";

export default async function ReportsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const reports = await getReportsData(profile.school_id, {
    event: t("reports.fallback.event"),
    rosterStudent: t("reports.fallback.rosterStudent"),
  });
  const hasReportData = [
    reports.summary.activeStudents,
    reports.summary.activeClubs,
    reports.summary.approvedEvents,
    reports.summary.eventRegistrations,
    reports.summary.attendanceCheckins,
  ].some((value) => value > 0);

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="#csv-exports">
            {t("reports.actions.exportCsv")}
          </HeaderActionLink>
        }
        description={t("reports.description")}
        eyebrow={t("reports.eyebrow")}
        title={t("reports.title")}
      />

      {!hasReportData ? (
        <section className="section-card section-card-padded">
          <EmptyState
            action={
              <>
                <HeaderActionLink href="/students" variant="secondary">
                  {t("reports.empty.addStudents")}
                </HeaderActionLink>
                <HeaderActionLink href="/events#create-event" variant="secondary">
                  {t("reports.empty.createEvent")}
                </HeaderActionLink>
              </>
            }
            description={t("reports.empty.description")}
            title={t("reports.empty.title")}
          />
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label={t("reports.summary.activeStudents")}
          value={formatNumber(reports.summary.activeStudents)}
        />
        <SummaryCard
          label={t("reports.summary.activeClubs")}
          value={formatNumber(reports.summary.activeClubs)}
        />
        <SummaryCard
          label={t("reports.summary.approvedEvents")}
          value={formatNumber(reports.summary.approvedEvents)}
        />
        <SummaryCard
          label={t("reports.summary.eventRegistrations")}
          value={formatNumber(reports.summary.eventRegistrations)}
        />
        <SummaryCard
          label={t("reports.summary.attendanceCheckins")}
          value={formatNumber(reports.summary.attendanceCheckins)}
        />
        <SummaryCard
          label={t("reports.summary.attendanceRate")}
          value={formatAttendanceRate(
            reports.summary.attendanceRate,
            t("common.notAvailableShort"),
          )}
        />
      </section>

      <section
        className="compact-action-card section-card section-card-padded"
        id="csv-exports"
      >
        <h2 className="section-title">{t("reports.exports.title")}</h2>
        <p className="section-description">
          {t("reports.exports.description")}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportLink href="/reports/exports/student-roster">
            {t("reports.exports.studentRoster")}
          </ExportLink>
          <ExportLink href="/reports/exports/event-registrations">
            {t("reports.exports.eventRegistrations")}
          </ExportLink>
          <ExportLink href="/reports/exports/attendance-checkins">
            {t("reports.exports.attendanceCheckins")}
          </ExportLink>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SummaryTable
          countLabel={t("reports.countLabels.registrations")}
          emptyMessage={t(
            "reports.tables.studentsWithMostRegistrations.emptyDescription",
          )}
          labels={{
            detail: t("reports.table.detail"),
            emptyTitle: t("reports.tables.emptyTitle"),
            name: t("reports.table.name"),
            resultCount: tf("filters.showingResults", {
              count: reports.studentsWithMostRegistrations.length,
            }),
          }}
          rows={reports.studentsWithMostRegistrations}
          title={t("reports.tables.studentsWithMostRegistrations.title")}
        />
        <SummaryTable
          countLabel={t("reports.countLabels.checkins")}
          emptyMessage={t(
            "reports.tables.studentsWithMostCheckins.emptyDescription",
          )}
          labels={{
            detail: t("reports.table.detail"),
            emptyTitle: t("reports.tables.emptyTitle"),
            name: t("reports.table.name"),
            resultCount: tf("filters.showingResults", {
              count: reports.studentsWithMostCheckins.length,
            }),
          }}
          rows={reports.studentsWithMostCheckins}
          title={t("reports.tables.studentsWithMostCheckins.title")}
        />
        <SummaryTable
          countLabel={t("reports.countLabels.registrations")}
          emptyMessage={t(
            "reports.tables.eventsWithMostRegistrations.emptyDescription",
          )}
          labels={{
            detail: t("reports.table.detail"),
            emptyTitle: t("reports.tables.emptyTitle"),
            name: t("reports.table.name"),
            resultCount: tf("filters.showingResults", {
              count: reports.eventsWithMostRegistrations.length,
            }),
          }}
          rows={reports.eventsWithMostRegistrations}
          title={t("reports.tables.eventsWithMostRegistrations.title")}
        />
        <SummaryTable
          countLabel={t("reports.countLabels.checkins")}
          emptyMessage={t(
            "reports.tables.eventsWithMostCheckins.emptyDescription",
          )}
          labels={{
            detail: t("reports.table.detail"),
            emptyTitle: t("reports.tables.emptyTitle"),
            name: t("reports.table.name"),
            resultCount: tf("filters.showingResults", {
              count: reports.eventsWithMostCheckins.length,
            }),
          }}
          rows={reports.eventsWithMostCheckins}
          title={t("reports.tables.eventsWithMostCheckins.title")}
        />
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </article>
  );
}

function ExportLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <a
      className="btn btn-primary"
      href={href}
    >
      {children}
    </a>
  );
}

function SummaryTable({
  countLabel,
  emptyMessage,
  labels,
  rows,
  title,
}: {
  countLabel: string;
  emptyMessage: string;
  labels: {
    detail: string;
    emptyTitle: string;
    name: string;
    resultCount: string;
  };
  rows: ReportTableRow[];
  title: string;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <p className="section-description">{labels.resultCount}</p>
      </div>
      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{labels.name}</th>
                  <th className="px-4 py-3 font-medium">{labels.detail}</th>
                  <th className="px-4 py-3 font-medium">{countLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {row.detail || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {formatNumber(row.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-zinc-200 md:hidden">
            {rows.map((row) => (
              <article className="p-4" key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-zinc-950">{row.name}</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {row.detail || "-"}
                    </p>
                  </div>
                  <StatusBadge>
                    {formatNumber(row.count)}
                  </StatusBadge>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="p-4">
          <EmptyState description={emptyMessage} title={labels.emptyTitle} />
        </div>
      )}
    </section>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatAttendanceRate(value: number | null, fallback: string) {
  if (value === null) {
    return fallback;
  }

  return `${Math.round(value * 1000) / 10}%`;
}
