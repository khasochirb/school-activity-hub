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
  const summary = reports.summary;
  const attendanceRate = formatAttendanceRate(
    summary.attendanceRate,
    t("common.notAvailableShort"),
    locale,
  );
  const hasReportData = [
    summary.totalStudents,
    summary.activeStudents,
    summary.activeClubs,
    summary.totalEvents,
    summary.approvedEvents,
    summary.eventRegistrations,
    summary.attendanceCheckins,
  ].some((value) => value > 0);
  const overviewMetrics = [
    {
      label: t("reports.summary.totalStudents"),
      value: formatNumber(summary.totalStudents, locale),
    },
    {
      label: t("reports.summary.activeStudents"),
      value: formatNumber(summary.activeStudents, locale),
    },
    {
      label: t("reports.summary.totalEvents"),
      value: formatNumber(summary.totalEvents, locale),
    },
    {
      label: t("reports.summary.approvedEvents"),
      value: formatNumber(summary.approvedEvents, locale),
    },
    {
      label: t("reports.summary.eventRegistrations"),
      value: formatNumber(summary.eventRegistrations, locale),
    },
    {
      label: t("reports.summary.attendanceCheckins"),
      value: formatNumber(summary.attendanceCheckins, locale),
    },
    {
      label: t("reports.summary.attendanceRate"),
      value: attendanceRate,
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="#export-reports">
            {t("reports.sections.exportReports")}
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

      <ReportSection title={t("reports.sections.overview")}>
        <MetricGrid metrics={overviewMetrics} />
      </ReportSection>

      <ReportSection title={t("reports.sections.participationSummary")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label={t("reports.summary.totalStudents")}
            value={formatNumber(summary.totalStudents, locale)}
          />
          <SummaryCard
            label={t("reports.summary.activeStudents")}
            value={formatNumber(summary.activeStudents, locale)}
          />
          <SummaryCard
            label={t("reports.summary.activeClubs")}
            value={formatNumber(summary.activeClubs, locale)}
          />
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
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
            locale={locale}
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
            locale={locale}
            rows={reports.studentsWithMostCheckins}
            title={t("reports.tables.studentsWithMostCheckins.title")}
          />
        </div>
      </ReportSection>

      <ReportSection title={t("reports.sections.eventActivity")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t("reports.summary.totalEvents")}
            value={formatNumber(summary.totalEvents, locale)}
          />
          <SummaryCard
            label={t("reports.summary.approvedEvents")}
            value={formatNumber(summary.approvedEvents, locale)}
          />
          <SummaryCard
            label={t("reports.summary.eventRegistrations")}
            value={formatNumber(summary.eventRegistrations, locale)}
          />
          <SummaryCard
            label={t("reports.summary.activeClubs")}
            value={formatNumber(summary.activeClubs, locale)}
          />
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
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
            locale={locale}
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
            locale={locale}
            rows={reports.eventsWithMostCheckins}
            title={t("reports.tables.eventsWithMostCheckins.title")}
          />
        </div>
      </ReportSection>

      <ReportSection title={t("reports.sections.attendanceSummary")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label={t("reports.summary.eventRegistrations")}
            value={formatNumber(summary.eventRegistrations, locale)}
          />
          <SummaryCard
            label={t("reports.summary.attendanceCheckins")}
            value={formatNumber(summary.attendanceCheckins, locale)}
          />
          <SummaryCard
            label={t("reports.summary.attendanceRate")}
            value={attendanceRate}
          />
        </div>
      </ReportSection>

      <ReportSection
        id="export-reports"
        title={t("reports.sections.exportReports")}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ExportCard
            downloadLabel={t("reports.exports.downloadCsv")}
            href="/reports/exports/event-registrations"
            title={t("reports.exports.eventRegistrations")}
          />
          <ExportCard
            downloadLabel={t("reports.exports.downloadCsv")}
            href="/reports/exports/attendance-checkins"
            title={t("reports.exports.attendanceCheckins")}
          />
          <ExportCard
            downloadLabel={t("reports.exports.downloadCsv")}
            href="/reports/exports/student-roster"
            title={t("reports.exports.studentRoster")}
          />
        </div>
      </ReportSection>
    </div>
  );
}

function ReportSection({
  children,
  id,
  title,
}: {
  children: React.ReactNode;
  id?: string;
  title: string;
}) {
  return (
    <section className="space-y-3" id={id}>
      <div>
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
      {metrics.map((metric) => (
        <SummaryCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
        />
      ))}
    </section>
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

function ExportCard({
  downloadLabel,
  href,
  title,
}: {
  downloadLabel: string;
  href: string;
  title: string;
}) {
  return (
    <article className="section-card section-card-padded">
      <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      <a className="btn btn-primary mt-3 w-full" href={href}>
        {downloadLabel}
      </a>
    </article>
  );
}

function SummaryTable({
  countLabel,
  emptyMessage,
  labels,
  locale,
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
  locale: string;
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
                      {formatNumber(row.count, locale)}
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
                  <StatusBadge>{formatNumber(row.count, locale)}</StatusBadge>
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

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}

function formatAttendanceRate(
  value: number | null,
  fallback: string,
  locale: string,
) {
  if (value === null) {
    return fallback;
  }

  const rate = Math.round(value * 1000) / 10;

  return `${new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: 1,
  }).format(rate)}%`;
}

function numberLocale(locale: string) {
  return locale === "mn" ? "mn-MN" : "en-CA";
}
