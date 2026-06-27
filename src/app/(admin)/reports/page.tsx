import { redirect } from "next/navigation";
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
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const reports = await getReportsData(profile.school_id);
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
          <HeaderActionLink href="#csv-exports">Export CSV</HeaderActionLink>
        }
        description="Review school-wide activity summaries and export roster, registration, and attendance CSV files."
        eyebrow="Operations reporting"
        title="Reports"
      />

      {!hasReportData ? (
        <section className="section-card section-card-padded">
          <EmptyState
            action={
              <>
                <HeaderActionLink href="/students" variant="secondary">
                  Add students
                </HeaderActionLink>
                <HeaderActionLink href="/events#create-event" variant="secondary">
                  Create event
                </HeaderActionLink>
              </>
            }
            description="Reports will fill in after students, clubs, events, registrations, and check-ins are created for this school."
            title="No reports data yet"
          />
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Active students"
          value={formatNumber(reports.summary.activeStudents)}
        />
        <SummaryCard
          label="Active clubs"
          value={formatNumber(reports.summary.activeClubs)}
        />
        <SummaryCard
          label="Approved events"
          value={formatNumber(reports.summary.approvedEvents)}
        />
        <SummaryCard
          label="Event registrations"
          value={formatNumber(reports.summary.eventRegistrations)}
        />
        <SummaryCard
          label="Attendance check-ins"
          value={formatNumber(reports.summary.attendanceCheckins)}
        />
        <SummaryCard
          label="Attendance rate"
          value={formatAttendanceRate(reports.summary.attendanceRate)}
        />
      </section>

      <section className="section-card section-card-padded" id="csv-exports">
        <h2 className="section-title">CSV exports</h2>
        <p className="section-description">
          Download school-scoped CSV files for a pilot review or admin handoff.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportLink href="/reports/exports/student-roster">
            Student roster
          </ExportLink>
          <ExportLink href="/reports/exports/event-registrations">
            Event registrations
          </ExportLink>
          <ExportLink href="/reports/exports/attendance-checkins">
            Attendance check-ins
          </ExportLink>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SummaryTable
          countLabel="Registrations"
          emptyMessage="No student registration totals yet. Students will appear here after joining events."
          rows={reports.studentsWithMostRegistrations}
          title="Students with most event registrations"
        />
        <SummaryTable
          countLabel="Check-ins"
          emptyMessage="No student attendance totals yet. Check-ins will appear after events use the QR link."
          rows={reports.studentsWithMostCheckins}
          title="Students with most attendance check-ins"
        />
        <SummaryTable
          countLabel="Registrations"
          emptyMessage="No event registration totals yet. Events will appear here after students register."
          rows={reports.eventsWithMostRegistrations}
          title="Events with most registrations"
        />
        <SummaryTable
          countLabel="Check-ins"
          emptyMessage="No event check-in totals yet. Events will appear here after students check in."
          rows={reports.eventsWithMostCheckins}
          title="Events with most check-ins"
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
  rows,
  title,
}: {
  countLabel: string;
  emptyMessage: string;
  rows: ReportTableRow[];
  title: string;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
      </div>
      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
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
          <EmptyState description={emptyMessage} title="No table data yet" />
        </div>
      )}
    </section>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatAttendanceRate(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${Math.round(value * 1000) / 10}%`;
}
