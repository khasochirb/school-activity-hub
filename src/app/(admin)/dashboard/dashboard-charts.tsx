import type { CSSProperties } from "react";
import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import type { DashboardActivitySummary } from "@/lib/dashboard/activity-summary";
import { formatDateRange } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import { EmptyState } from "../_components/page-ui";

type Translator = (key: string) => string;

export function DashboardCharts({
  locale,
  summary,
  t,
}: {
  locale: Locale;
  summary: DashboardActivitySummary;
  t: Translator;
}) {
  return (
    <section
      aria-label={t("dashboard.analytics.overview")}
      className="grid min-w-0 gap-3 xl:grid-cols-2"
    >
      <UpcomingActivitiesChart locale={locale} summary={summary} t={t} />
      <CategoryOpportunitiesChart locale={locale} summary={summary} t={t} />
    </section>
  );
}

function UpcomingActivitiesChart({
  locale,
  summary,
  t,
}: {
  locale: Locale;
  summary: DashboardActivitySummary;
  t: Translator;
}) {
  const maximum = Math.max(...summary.weeks.map((week) => week.count), 1);
  const rows = summary.weeks.map((week) => ({
    count: week.count,
    label: formatDateRange(
      week.startsAt,
      new Date(new Date(week.endsAt).getTime() - 1),
      locale,
    ),
  }));

  return (
    <article className="section-card min-w-0 overflow-hidden">
      <ChartHeader
        description={t("dashboard.analytics.upcomingActivities.description")}
        title={t("dashboard.analytics.upcomingActivities.title")}
      />
      {summary.total ? (
        <>
          <div className="dashboard-week-chart px-3 pb-3 pt-5 sm:px-4">
            {rows.map((row) => (
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
                    style={
                      {
                        "--chart-scale": row.count / maximum,
                      } as CSSProperties
                    }
                  />
                </span>
                <span className="dashboard-chart-label">{row.label}</span>
              </div>
            ))}
          </div>
          <AccessibleDataTable
            countLabel={t("dashboard.analytics.count")}
            labelHeading={t("dashboard.analytics.week")}
            rows={rows}
            title={t("dashboard.analytics.upcomingActivities.title")}
          />
        </>
      ) : (
        <div className="p-4">
          <EmptyState
            description={t("dashboard.analytics.noActivityData")}
            title={t("dashboard.analytics.noUpcomingActivities")}
          />
        </div>
      )}
    </article>
  );
}

function CategoryOpportunitiesChart({
  locale,
  summary,
  t,
}: {
  locale: Locale;
  summary: DashboardActivitySummary;
  t: Translator;
}) {
  const maximum = Math.max(...summary.categories.map((item) => item.count), 1);
  const rows = summary.categories.map((item) => ({
    count: item.count,
    label: categoryLabel(item.category, t),
  }));

  return (
    <article className="section-card min-w-0 overflow-hidden">
      <ChartHeader
        description={t("dashboard.analytics.opportunitiesByCategory.description")}
        title={t("dashboard.analytics.opportunitiesByCategory.title")}
      />
      {rows.length ? (
        <>
          <div className="space-y-3 p-3 sm:p-4">
            {rows.map((row) => (
              <div
                aria-label={`${row.label}: ${formatNumber(row.count, locale)}`}
                className="dashboard-chart-point group rounded-md px-1 py-1"
                key={row.label}
                tabIndex={0}
                title={`${row.label}: ${formatNumber(row.count, locale)}`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-semibold text-slate-800">
                    {row.label}
                  </span>
                  <span className="dashboard-chart-value shrink-0" aria-hidden="true">
                    {formatNumber(row.count, locale)}
                  </span>
                </div>
                <div className="dashboard-category-track mt-2" aria-hidden="true">
                  <span
                    className="dashboard-chart-bar-x"
                    style={
                      {
                        "--chart-scale": row.count / maximum,
                      } as CSSProperties
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <AccessibleDataTable
            countLabel={t("dashboard.analytics.count")}
            labelHeading={t("common.category")}
            rows={rows}
            title={t("dashboard.analytics.opportunitiesByCategory.title")}
          />
        </>
      ) : (
        <div className="p-4">
          <EmptyState
            description={t("dashboard.analytics.opportunitiesByCategory.description")}
            title={t("dashboard.analytics.noActivityData")}
          />
        </div>
      )}
    </article>
  );
}

function ChartHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      <p className="section-description">{description}</p>
    </div>
  );
}

function AccessibleDataTable({
  countLabel,
  labelHeading,
  rows,
  title,
}: {
  countLabel: string;
  labelHeading: string;
  rows: Array<{ count: number; label: string }>;
  title: string;
}) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">{labelHeading}</th>
          <th scope="col">{countLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function categoryLabel(category: string, t: Translator) {
  const translationKey = getActivityCategoryTranslationKey(category);

  return translationKey ? t(translationKey) : category;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA").format(
    value,
  );
}
