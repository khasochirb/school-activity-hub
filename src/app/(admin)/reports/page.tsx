import { redirect } from "next/navigation";
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
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Reports</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Review school-wide activity summaries and export roster,
          registration, and attendance CSV files.
        </p>
      </section>

      {!hasReportData ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-950">
            No reports data yet
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Reports will fill in after students, clubs, events, registrations,
            and check-ins are created for this school.
          </p>
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

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">CSV exports</h2>
        <p className="mt-2 text-sm text-zinc-600">
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
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-zinc-950">{value}</p>
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
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
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
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
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
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                    {formatNumber(row.count)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="p-6 text-sm text-zinc-600">{emptyMessage}</p>
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
