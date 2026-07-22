import type { CSSProperties } from "react";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";
import { formatDateRange } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import { EmptyState } from "../_components/page-ui";
import { ReportTabAction } from "./report-tabs";

type ChartLabels = {
  category: string;
  checkins: string;
  count: string;
  event: string;
  noData: string;
  noDataDescription: string;
  participationByCategory: string;
  participationOverTime: string;
  recordedAttendance: string;
  registrationComparison: string;
  registrations: string;
  viewAllActivities: string;
  week: string;
};

export function ReportCharts({
  categories,
  events,
  labels,
  locale,
  weeks,
}: {
  categories: Array<{
    category: string;
    categoryValue?: string;
    count: number;
  }>;
  events: Array<{
    checkins: number;
    id: string;
    registrations: number;
    title: string;
  }>;
  labels: ChartLabels;
  locale: Locale;
  weeks: Array<{ count: number; startsAt: string }>;
}) {
  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <WeeklyChart labels={labels} locale={locale} weeks={weeks} />
        <CategoryChart categories={categories} labels={labels} locale={locale} />
      </div>
      <EventComparisonChart events={events} labels={labels} locale={locale} />
    </div>
  );
}

function WeeklyChart({
  labels,
  locale,
  weeks,
}: {
  labels: ChartLabels;
  locale: Locale;
  weeks: Array<{ count: number; startsAt: string }>;
}) {
  const rows = weeks.map((week) => ({
    count: week.count,
    label: formatDateRange(
      week.startsAt,
      new Date(new Date(week.startsAt).getTime() + 6 * 24 * 60 * 60 * 1000),
      locale,
    ),
  }));
  const maximum = Math.max(...rows.map((row) => row.count), 1);
  const hasData = rows.some((row) => row.count > 0);
  const desktopLabelInterval = labelInterval(rows.length, 7);
  const mobileLabelInterval = labelInterval(rows.length, 4);

  return (
    <ChartCard title={labels.participationOverTime}>
      {hasData ? (
        <>
          <div className="overflow-x-auto px-3 pb-3 pt-5 sm:px-4">
            <div
              className="dashboard-week-chart min-w-[34rem]"
              style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(2.5rem, 1fr))` }}
            >
              {rows.map((row, index) => (
                <div
                  aria-label={`${row.label}: ${formatNumber(row.count, locale)}`}
                  className="dashboard-chart-point group min-w-0"
                  key={row.label}
                  tabIndex={0}
                  title={`${row.label}: ${formatNumber(row.count, locale)}`}
                >
                  <span className="dashboard-chart-value" aria-hidden="true">
                    {formatNumber(row.count, locale)}
                  </span>
                  <span className="dashboard-week-track" aria-hidden="true">
                    <span
                      className="dashboard-chart-bar-y"
                      style={{ "--chart-scale": row.count / maximum } as CSSProperties}
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className="dashboard-chart-label report-axis-label"
                    data-mobile-visible={isAxisLabelVisible(
                      rows.length,
                      index,
                      mobileLabelInterval,
                    )}
                    data-visible={isAxisLabelVisible(
                      rows.length,
                      index,
                      desktopLabelInterval,
                    )}
                  >
                    {formatAxisDate(weeks[index].startsAt, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <AccessibleTable
            columns={[labels.week, labels.count]}
            rows={rows.map((row) => [row.label, String(row.count)])}
            title={labels.participationOverTime}
          />
        </>
      ) : (
        <ChartEmpty labels={labels} />
      )}
    </ChartCard>
  );
}

function EventComparisonChart({
  events,
  labels,
  locale,
}: {
  events: Array<{ checkins: number; id: string; registrations: number; title: string }>;
  labels: ChartLabels;
  locale: Locale;
}) {
  const maximum = Math.max(
    ...events.flatMap((event) => [event.checkins, event.registrations]),
    1,
  );

  return (
    <ChartCard
      action={
        <ReportTabAction tab="activities">
          {labels.viewAllActivities}
        </ReportTabAction>
      }
      title={labels.registrationComparison}
    >
      {events.length ? (
        <>
          <div className="space-y-4 p-3 sm:p-4">
            {events.map((event) => (
              <div className="min-w-0" key={event.id}>
                <p className="truncate text-sm font-bold text-slate-950" title={event.title}>
                  {event.title}
                </p>
                <ChartBar
                  label={labels.registrations}
                  maximum={maximum}
                  value={event.registrations}
                  variant="primary"
                />
                <ChartBar
                  label={labels.recordedAttendance}
                  maximum={maximum}
                  value={event.checkins}
                  variant="secondary"
                />
              </div>
            ))}
          </div>
          <AccessibleTable
            columns={[labels.event, labels.registrations, labels.recordedAttendance]}
            rows={events.map((event) => [
              event.title,
              formatNumber(event.registrations, locale),
              formatNumber(event.checkins, locale),
            ])}
            title={labels.registrationComparison}
          />
        </>
      ) : (
        <ChartEmpty labels={labels} />
      )}
    </ChartCard>
  );
}

function CategoryChart({
  categories,
  labels,
  locale,
}: {
  categories: Array<{
    category: string;
    categoryValue?: string;
    count: number;
  }>;
  labels: ChartLabels;
  locale: Locale;
}) {
  const maximum = Math.max(...categories.map((row) => row.count), 1);

  return (
    <ChartCard title={labels.participationByCategory}>
      {categories.length ? (
        <>
          <div className="space-y-3 p-3 sm:p-4">
            {categories.map((row) => (
              <div
                className="dashboard-chart-point rounded-md p-1"
                data-category-tone={getActivityCategoryTone(row.categoryValue)}
                key={row.category}
                tabIndex={0}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-bold text-slate-800">
                    {row.category}
                  </span>
                  <span className="dashboard-chart-value shrink-0">
                    {formatNumber(row.count, locale)}
                  </span>
                </div>
                <div className="dashboard-category-track mt-2" aria-hidden="true">
                  <span
                    className="dashboard-chart-bar-x"
                    style={{ "--chart-scale": row.count / maximum } as CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
          <AccessibleTable
            columns={[labels.category, labels.count]}
            rows={categories.map((row) => [row.category, formatNumber(row.count, locale)])}
            title={labels.participationByCategory}
          />
        </>
      ) : (
        <ChartEmpty labels={labels} />
      )}
    </ChartCard>
  );
}

function ChartBar({
  label,
  maximum,
  value,
  variant,
}: {
  label: string;
  maximum: number;
  value: number;
  variant: "primary" | "secondary";
}) {
  return (
    <div className="mt-2 grid min-w-0 grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs">
      <span className="truncate font-semibold text-slate-600">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden="true">
        <span
          className="block h-full origin-left rounded-full dashboard-chart-bar-x"
          style={
            {
              "--chart-scale": value / maximum,
              backgroundColor: variant === "secondary" ? "#64748b" : "#d68a43",
            } as CSSProperties
          }
        />
      </span>
      <span className="text-right font-bold text-slate-800">{value}</span>
    </div>
  );
}

function ChartCard({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <article className="section-card min-w-0 overflow-hidden">
      <div className="section-header flex flex-wrap items-start justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </article>
  );
}

function ChartEmpty({ labels }: { labels: ChartLabels }) {
  return (
    <div className="p-4">
      <EmptyState description={labels.noDataDescription} title={labels.noData} />
    </div>
  );
}

function AccessibleTable({
  columns,
  rows,
  title,
}: {
  columns: string[];
  rows: string[][];
  title: string;
}) {
  return (
    <table className="report-visually-hidden">
      <caption>{title}</caption>
      <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${row[0]}-${rowIndex}`}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? <th key={cellIndex} scope="row">{cell}</th> : <td key={cellIndex}>{cell}</td>,
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA").format(value);
}

function labelInterval(itemCount: number, targetLabels: number) {
  return Math.max(1, Math.ceil(itemCount / targetLabels));
}

function isAxisLabelVisible(
  itemCount: number,
  index: number,
  interval: number,
) {
  return index === 0 || index === itemCount - 1 || index % interval === 0;
}

function formatAxisDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-CA", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
