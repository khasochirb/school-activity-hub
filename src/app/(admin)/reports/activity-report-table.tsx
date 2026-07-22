"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { formatDate } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import type { ReportActivityRow } from "@/lib/reports/activity-report";
import { CategoryBadge, EmptyState, StatusBadge } from "../_components/page-ui";

type ActivitySort = "checkins" | "date" | "rate" | "registrations";
type DisplayActivityRow = ReportActivityRow & { categoryValue?: string | null };

export function ActivityReportTable({
  activities,
  labels,
  locale,
}: {
  activities: DisplayActivityRow[];
  labels: {
    attendanceNotRecorded: string;
    category: string;
    checkins: string;
    clearFilters: string;
    date: string;
    emptyDescription: string;
    emptyTitle: string;
    noResults: string;
    noResultsDescription: string;
    rate: string;
    registrations: string;
    responsibleStaff: string;
    search: string;
    searchPlaceholder: string;
    sort: string;
    title: string;
    viewEvent: string;
  };
  locale: Locale;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ActivitySort>("date");
  const visibleActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return activities
      .filter(
        (activity) =>
          !normalizedQuery ||
          activity.title.toLocaleLowerCase(locale).includes(normalizedQuery),
      )
      .sort((left, right) => compareActivities(left, right, sort));
  }, [activities, locale, query, sort]);

  return (
    <section className="section-card min-w-0 overflow-hidden">
      <div className="section-header">
        <h2 className="section-title">{labels.title}</h2>
        <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.search}
            <input
              className="h-11 min-w-0 rounded-md border px-3 text-base font-normal outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              type="search"
              value={query}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.sort}
            <select
              className="h-11 min-w-0 rounded-md border px-3 text-base font-normal outline-none"
              onChange={(event) => setSort(event.target.value as ActivitySort)}
              value={sort}
            >
              <option value="date">{labels.date}</option>
              <option value="registrations">{labels.registrations}</option>
              <option value="checkins">{labels.checkins}</option>
              <option value="rate">{labels.rate}</option>
            </select>
          </label>
        </div>
      </div>

      {visibleActivities.length ? (
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {visibleActivities.map((activity) => (
              <ActivityCard
                activity={activity}
                key={activity.id}
                labels={labels}
                locale={locale}
              />
            ))}
          </div>
          <div
            aria-label={labels.title}
            className="report-table-scroll hidden overflow-x-auto overscroll-x-contain md:block"
            role="region"
            tabIndex={0}
          >
            <table className="report-table min-w-[76rem]">
              <thead>
                <tr>
                  <th className="min-w-64" scope="col">{labels.title}</th>
                  <th className="min-w-32" scope="col">{labels.date}</th>
                  <th className="min-w-36" scope="col">{labels.category}</th>
                  <th className="min-w-36" scope="col">{labels.registrations}</th>
                  <th className="min-w-36" scope="col">{labels.checkins}</th>
                  <th className="min-w-48" scope="col">{labels.rate}</th>
                  <th className="min-w-48" scope="col">{labels.responsibleStaff}</th>
                  <th className="report-table-action min-w-36" scope="col"><span className="sr-only">{labels.viewEvent}</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleActivities.map((activity) => (
                  <tr key={activity.id}>
                    <th className="max-w-80 break-words text-left" scope="row">
                      {activity.title}
                    </th>
                    <td>{formatDate(activity.startsAt, locale)}</td>
                    <td>
                      {activity.category ? (
                        <CategoryBadge category={activity.categoryValue}>
                          {activity.category}
                        </CategoryBadge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{formatNumber(activity.registrations, locale)}</td>
                    <td>{formatNumber(activity.checkins, locale)}</td>
                    <td>
                      {activity.attendanceRate === null ? (
                        <StatusBadge variant="warning">
                          {labels.attendanceNotRecorded}
                        </StatusBadge>
                      ) : (
                        formatPercent(activity.attendanceRate, locale)
                      )}
                    </td>
                    <td>{activity.responsibleStaff ?? "-"}</td>
                    <td className="report-table-action">
                      <Link
                        className="btn btn-secondary min-h-10 gap-2"
                        href={`/events/${activity.id}`}
                        prefetch={false}
                      >
                        {labels.viewEvent}
                        <PendingLinkIndicator />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : activities.length && query ? (
        <div className="p-4">
          <EmptyState
            action={
              <button
                className="btn btn-secondary"
                onClick={() => setQuery("")}
                type="button"
              >
                {labels.clearFilters}
              </button>
            }
            description={labels.noResultsDescription}
            title={labels.noResults}
            visual="filter"
          />
        </div>
      ) : (
        <div className="p-4">
          <EmptyState
            description={labels.emptyDescription}
            title={labels.emptyTitle}
          />
        </div>
      )}
    </section>
  );
}

function ActivityCard({
  activity,
  labels,
  locale,
}: {
  activity: DisplayActivityRow;
  labels: Parameters<typeof ActivityReportTable>[0]["labels"];
  locale: Locale;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words text-base font-bold text-slate-950">
          {activity.title}
        </h3>
        {activity.category ? (
          <CategoryBadge category={activity.categoryValue}>
            {activity.category}
          </CategoryBadge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {formatDate(activity.startsAt, locale)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label={labels.registrations} value={formatNumber(activity.registrations, locale)} />
        <Metric label={labels.checkins} value={formatNumber(activity.checkins, locale)} />
      </dl>
      <div className="mt-3">
        {activity.attendanceRate === null ? (
          <StatusBadge variant="warning">{labels.attendanceNotRecorded}</StatusBadge>
        ) : (
          <p className="text-sm font-semibold text-slate-700">
            {labels.rate}: {formatPercent(activity.attendanceRate, locale)}
          </p>
        )}
      </div>
      {activity.responsibleStaff ? (
        <p className="mt-2 break-words text-sm text-slate-600">
          {labels.responsibleStaff}: {activity.responsibleStaff}
        </p>
      ) : null}
      <Link
        className="btn btn-secondary mt-3 min-h-11 w-full gap-2"
        href={`/events/${activity.id}`}
        prefetch={false}
      >
        {labels.viewEvent}
        <PendingLinkIndicator />
      </Link>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-2">
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd className="mt-1 font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function compareActivities(
  left: ReportActivityRow,
  right: ReportActivityRow,
  sort: ActivitySort,
) {
  if (sort === "registrations") {
    return right.registrations - left.registrations;
  }
  if (sort === "checkins") {
    return right.checkins - left.checkins;
  }
  if (sort === "rate") {
    return (right.attendanceRate ?? -1) - (left.attendanceRate ?? -1);
  }
  return right.startsAt.localeCompare(left.startsAt);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA").format(value);
}

function formatPercent(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA", {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(value);
}
