import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ACTIVITY_CATEGORIES,
  getActivityCategoryTranslationKey,
  parseActivityCategory,
} from "@/lib/activity-categories";
import { formatDateRange } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locales";
import type { ReportAttendanceFilter } from "@/lib/reports/activity-report";
import {
  EmptyState,
  HeaderActionLink,
  PageHeader,
} from "../_components/page-ui";
import { ActivityReportTable } from "./activity-report-table";
import { ReportCharts } from "./report-charts";
import {
  getReportAccessContext,
  getReportExplorerData,
} from "./report-explorer-data";
import { ReportTabs, type ReportTab } from "./report-tabs";
import { StudentReportRoster } from "./student-report-roster";

type ReportsSearchParams = {
  attendance?: string | string[];
  category?: string | string[];
  event?: string | string[];
  from?: string | string[];
  range?: string | string[];
  school?: string | string[];
  tab?: string | string[];
  to?: string | string[];
};

type DateRangePreset = "30" | "90" | "all" | "custom";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const params = await searchParams;
  const selectedSchoolId = valueOf(params.school);
  const access = await getReportAccessContext(selectedSchoolId);

  if (!access) {
    redirect("/dashboard");
  }

  const platformSelector = access.isPlatformAdmin ? (
    <section className="section-card section-card-padded max-w-2xl">
      <form action="/reports" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("reports.explorer.filters.school")}
          <select className="h-11 min-w-0 rounded-md border px-3 text-base font-normal outline-none" defaultValue={selectedSchoolId} name="school" required>
            <option value="">{t("reports.explorer.platform.selectSchool")}</option>
            {access.platformSchools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary min-h-11" type="submit">{t("common.open")}</button>
      </form>
    </section>
  ) : null;

  if (!access.schoolId) {
    return (
      <div className="page-stack">
        <PageHeader
          description={t("reports.explorer.description")}
          eyebrow={t("reports.eyebrow")}
          title={t("reports.explorer.title")}
        />
        {platformSelector}
        <section className="section-card section-card-padded">
          <EmptyState
            description={
              access.schoolOptionsUnavailable
                ? t("reports.explorer.platform.unavailable")
                : t("reports.explorer.platform.description")
            }
            title={t("reports.explorer.platform.selectSchool")}
          />
        </section>
      </div>
    );
  }

  const rangePreset = parseRange(valueOf(params.range));
  const dateRange = resolveDateRange(
    rangePreset,
    valueOf(params.from),
    valueOf(params.to),
  );
  const category = parseActivityCategory(valueOf(params.category));
  const eventId = parseUuid(valueOf(params.event));
  const attendance = parseAttendance(valueOf(params.attendance));
  const initialTab = parseTab(valueOf(params.tab));
  const filters = { attendance, category, dateRange, eventId };
  const report = await getReportExplorerData(access.schoolId, filters);
  const categoryOptions = ACTIVITY_CATEGORIES.map((item) => ({
    label: categoryLabel(item, t),
    value: item,
  }));
  const rangeLabel = dateRange.startsAt
    ? formatDateRange(dateRange.startsAt, dateRange.endsAt, locale)
    : t("reports.explorer.filters.allTime");

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          access.isPlatformAdmin ? undefined : (
            <HeaderActionLink href="#export-reports">
              {t("reports.sections.exportReports")}
            </HeaderActionLink>
          )
        }
        description={t("reports.explorer.description")}
        eyebrow={access.schoolName ?? t("reports.eyebrow")}
        title={t("reports.explorer.title")}
      />
      {platformSelector}

      <ReportFilters
        attendance={attendance}
        category={category ?? ""}
        categoryOptions={categoryOptions}
        customFrom={dateInputValue(dateRange.startsAt)}
        customTo={dateInputValue(dateRange.endsAt)}
        eventId={eventId ?? ""}
        eventOptions={report.eventOptions}
        initialTab={initialTab}
        labels={{
          all: t("filters.all"),
          allTime: t("reports.explorer.filters.allTime"),
          attendance: t("reports.explorer.filters.attendance"),
          attendanceNotRecorded: t("reports.explorer.attendanceNotRecorded"),
          category: t("filters.category"),
          clear: t("filters.clear"),
          customRange: t("reports.explorer.filters.customRange"),
          dateRange: t("reports.explorer.filters.dateRange"),
          event: t("reports.explorer.filters.activity"),
          filter: t("filters.filter"),
          from: t("reports.explorer.filters.from"),
          last30: t("reports.explorer.filters.last30Days"),
          last90: t("reports.explorer.filters.last90Days"),
          recorded: t("reports.explorer.filters.attendanceRecorded"),
          to: t("reports.explorer.filters.to"),
        }}
        range={rangePreset}
        rangeLabel={rangeLabel}
        schoolId={access.schoolId}
      />

      {report.loadFailed ? (
        <section className="notice-box notice-danger" role="alert">
          <strong>{t("common.error")}</strong>
          <p className="mt-1">{t("reports.explorer.errors.loadFailed")}</p>
        </section>
      ) : (
        <ReportTabs
          activities={
            <ActivityReportTable
              activities={report.data.activities.map((activity) => ({
                ...activity,
                category: activity.category
                  ? categoryLabel(activity.category, t)
                  : null,
              }))}
              labels={{
                attendanceNotRecorded: t("reports.explorer.attendanceNotRecorded"),
                category: t("filters.category"),
                checkins: t("reports.explorer.metrics.recordedCheckins"),
                date: t("reports.explorer.table.date"),
                emptyDescription: t("reports.explorer.empty.activitiesDescription"),
                emptyTitle: t("reports.explorer.empty.activitiesTitle"),
                rate: t("reports.explorer.metrics.recordedAttendanceRate"),
                registrations: t("reports.explorer.metrics.totalRegistrations"),
                responsibleStaff: t("reports.explorer.table.responsibleStaff"),
                search: t("common.search"),
                searchPlaceholder: t("reports.explorer.table.searchActivities"),
                sort: t("reports.explorer.table.sortBy"),
                title: t("reports.explorer.tabs.activities"),
                viewEvent: t("common.viewDetails"),
              }}
              locale={locale}
            />
          }
          initialTab={initialTab}
          labels={{
            activities: t("reports.explorer.tabs.activities"),
            overview: t("reports.explorer.tabs.overview"),
            students: t("reports.explorer.tabs.students"),
          }}
          overview={
            <OverviewPanel
              data={report.data}
              locale={locale}
              t={t}
            />
          }
          students={
            <StudentReportRoster
              categoryLabels={Object.fromEntries(
                ACTIVITY_CATEGORIES.map((item) => [item, categoryLabel(item, t)]),
              )}
              labels={{
                attendanceRate: t("reports.explorer.metrics.recordedAttendanceRate"),
                clubsJoined: t("reports.explorer.students.clubsJoined"),
                close: t("common.close"),
                detailsError: t("reports.explorer.errors.studentDetailsFailed"),
                emptyDescription: t("reports.explorer.empty.studentsDescription"),
                emptyTitle: t("reports.explorer.empty.studentsTitle"),
                event: t("reports.explorer.filters.activity"),
                grade: t("students.table.grade"),
                history: t("reports.explorer.students.filteredHistory"),
                homeroom: t("students.table.classGroup"),
                joinedClubs: t("reports.explorer.students.joinedClubs"),
                lastParticipation: t("reports.explorer.students.lastParticipation"),
                loading: t("reports.explorer.students.loading"),
                next: t("common.next"),
                noData: t("reports.explorer.empty.noParticipation"),
                previous: t("common.previous"),
                participationByCategory: t("reports.explorer.charts.participationByCategory"),
                recentParticipation: t("reports.explorer.students.recentParticipation"),
                recordedAttendances: t("reports.explorer.students.recordedAttendances"),
                registrationWithoutCheckin: t("reports.explorer.students.registrationWithoutCheckin"),
                registrations: t("reports.explorer.metrics.totalRegistrations"),
                school: t("reports.explorer.filters.school"),
                search: t("common.search"),
                searchPlaceholder: t("reports.explorer.students.searchStudents"),
                sort: t("reports.explorer.table.sortBy"),
                studentActivityDetails: t("reports.explorer.students.detailsTitle"),
                students: t("reports.explorer.tabs.students"),
                upcomingRegistrations: t("reports.explorer.students.upcomingRegistrations"),
                viewActivityDetails: t("reports.explorer.students.viewDetails"),
                viewEvent: t("common.viewDetails"),
              }}
              locale={locale}
              request={{
                attendance,
                category: category ?? "",
                endsAt: dateRange.endsAt,
                eventId: eventId ?? "",
                schoolId: access.schoolId,
                startsAt: dateRange.startsAt ?? "",
              }}
              students={report.data.students}
            />
          }
        />
      )}

      {!access.isPlatformAdmin ? <ExportReports t={t} /> : null}
    </div>
  );
}

function OverviewPanel({
  data,
  locale,
  t,
}: {
  data: Awaited<ReturnType<typeof getReportExplorerData>>["data"];
  locale: Locale;
  t: (key: string) => string;
}) {
  const metrics = [
    [t("reports.explorer.metrics.activitiesHeld"), formatNumber(data.overview.activitiesHeld, locale)],
    [t("reports.explorer.metrics.participatingStudents"), formatNumber(data.overview.participatingStudents, locale)],
    [t("reports.explorer.metrics.totalRegistrations"), formatNumber(data.overview.totalRegistrations, locale)],
    [t("reports.explorer.metrics.recordedCheckins"), formatNumber(data.overview.recordedCheckins, locale)],
    [t("reports.explorer.metrics.recordedAttendanceRate"), data.overview.attendanceRate === null ? t("common.notAvailableShort") : formatPercent(data.overview.attendanceRate, locale)],
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value]) => (
          <article className="stat-card" key={label}>
            <p className="stat-label">{label}</p>
            <p className="stat-value dashboard-metric-value-enter">{value}</p>
          </article>
        ))}
      </section>
      <p className="notice-box text-sm">{t("reports.explorer.attendanceDefinition")}</p>
      <ReportCharts
        categories={data.charts.categories.map((item) => ({
          ...item,
          category: categoryLabel(item.category, t),
        }))}
        events={data.charts.events}
        labels={{
          category: t("filters.category"),
          checkins: t("reports.explorer.metrics.recordedCheckins"),
          count: t("dashboard.analytics.count"),
          event: t("reports.explorer.filters.activity"),
          noData: t("reports.explorer.empty.noParticipation"),
          noDataDescription: t("reports.explorer.empty.noParticipationDescription"),
          participationByCategory: t("reports.explorer.charts.participationByCategory"),
          participationOverTime: t("reports.explorer.charts.participationOverTime"),
          recordedAttendance: t("reports.explorer.charts.recordedAttendance"),
          registrationComparison: t("reports.explorer.charts.registrationComparison"),
          registrations: t("reports.explorer.metrics.totalRegistrations"),
          viewAllActivities: t("reports.explorer.charts.viewAllActivities"),
          week: t("dashboard.analytics.week"),
        }}
        locale={locale}
        weeks={data.charts.weeks}
      />
    </div>
  );
}

function ReportFilters({
  attendance,
  category,
  categoryOptions,
  customFrom,
  customTo,
  eventId,
  eventOptions,
  initialTab,
  labels,
  range,
  rangeLabel,
  schoolId,
}: {
  attendance: ReportAttendanceFilter;
  category: string;
  categoryOptions: Array<{ label: string; value: string }>;
  customFrom: string;
  customTo: string;
  eventId: string;
  eventOptions: Array<{ id: string; title: string }>;
  initialTab: ReportTab;
  labels: Record<string, string>;
  range: DateRangePreset;
  rangeLabel: string;
  schoolId: string;
}) {
  return (
    <section className="section-card section-card-padded min-w-0">
      <form action="/reports" className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input name="school" type="hidden" value={schoolId} />
        <input data-report-tab-input="true" name="tab" type="hidden" value={initialTab} />
        <FilterSelect defaultValue={range} label={labels.dateRange} name="range" options={[
          { label: labels.last30, value: "30" },
          { label: labels.last90, value: "90" },
          { label: labels.allTime, value: "all" },
          { label: labels.customRange, value: "custom" },
        ]} />
        <FilterSelect defaultValue={category} label={labels.category} name="category" options={[{ label: labels.all, value: "" }, ...categoryOptions]} />
        <FilterSelect defaultValue={eventId} label={labels.event} name="event" options={[{ label: labels.all, value: "" }, ...eventOptions.map((event) => ({ label: event.title, value: event.id }))]} />
        <FilterSelect defaultValue={attendance} label={labels.attendance} name="attendance" options={[
          { label: labels.all, value: "all" },
          { label: labels.recorded, value: "recorded" },
          { label: labels.attendanceNotRecorded, value: "not_recorded" },
        ]} />
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <FilterDate defaultValue={customFrom} label={labels.from} name="from" />
          <FilterDate defaultValue={customTo} label={labels.to} name="to" />
        </div>
        <div className="flex min-w-0 flex-wrap items-end gap-2 md:col-span-2 xl:col-span-5">
          <button className="btn btn-primary min-h-11" type="submit">{labels.filter}</button>
          <Link className="btn btn-secondary min-h-11" href={`/reports?school=${schoolId}`} prefetch={false}>{labels.clear}</Link>
          <p className="min-w-0 break-words text-sm font-semibold text-slate-600">{labels.dateRange}: {rangeLabel}</p>
        </div>
      </form>
    </section>
  );
}

function FilterSelect({ defaultValue, label, name, options }: { defaultValue: string; label: string; name: string; options: Array<{ label: string; value: string }> }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">{label}<select className="h-11 min-w-0 rounded-md border px-3 text-base font-normal outline-none" defaultValue={defaultValue} name={name}>{options.map((option) => <option key={`${name}-${option.value || "all"}`} value={option.value}>{option.label}</option>)}</select></label>;
}

function FilterDate({ defaultValue, label, name }: { defaultValue: string; label: string; name: string }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">{label}<input className="h-11 min-w-0 rounded-md border px-2 text-sm font-normal outline-none" defaultValue={defaultValue} name={name} type="date" /></label>;
}

function ExportReports({ t }: { t: (key: string) => string }) {
  const exports = [
    ["student-roster", t("reports.exports.studentRoster")],
    ["event-registrations", t("reports.exports.eventRegistrations")],
    ["attendance-checkins", t("reports.exports.attendanceCheckins")],
  ];
  return (
    <section className="section-card" id="export-reports">
      <div className="section-header"><h2 className="section-title">{t("reports.exports.title")}</h2><p className="section-description">{t("reports.exports.description")}</p></div>
      <div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">{exports.map(([type, label]) => <a className="btn btn-secondary min-h-11 min-w-0 break-words" href={`/reports/exports/${type}`} key={type}>{label}</a>)}</div>
    </section>
  );
}

function resolveDateRange(preset: DateRangePreset, from: string, to: string) {
  const now = new Date();
  if (preset === "all") return { endsAt: now.toISOString(), startsAt: null };
  if (preset === "custom") {
    const startsAt = parseDateBoundary(from, false);
    const requestedEnd = parseDateBoundary(to, true);
    const endsAt =
      requestedEnd && requestedEnd < now.toISOString()
        ? requestedEnd
        : now.toISOString();
    if (startsAt && startsAt <= endsAt) return { endsAt, startsAt };
  }
  const days = preset === "30" ? 30 : 90;
  return { endsAt: now.toISOString(), startsAt: new Date(now.getTime() - days * 86400000).toISOString() };
}

function parseDateBoundary(value: string, end: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function dateInputValue(value: string | null) { return value?.slice(0, 10) ?? ""; }
function parseRange(value: string): DateRangePreset { return ["30", "90", "all", "custom"].includes(value) ? value as DateRangePreset : "90"; }
function parseAttendance(value: string): ReportAttendanceFilter { return value === "recorded" || value === "not_recorded" ? value : "all"; }
function parseTab(value: string): ReportTab { return value === "activities" || value === "students" ? value : "overview"; }
function parseUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) ? value : null; }
function valueOf(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function categoryLabel(category: string, t: (key: string) => string) { const key = getActivityCategoryTranslationKey(category); return key ? t(key) : category; }
function formatNumber(value: number, locale: Locale) { return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA").format(value); }
function formatPercent(value: number, locale: Locale) { return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA", { maximumFractionDigits: 0, style: "percent" }).format(value); }
