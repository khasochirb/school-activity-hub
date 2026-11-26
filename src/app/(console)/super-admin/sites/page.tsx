import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  CHART_DAY_OPTIONS,
  dailySeries,
  firstProblem,
  normalizeChartDays,
  overallState,
  percentChange,
  shiftDay,
  sumViews,
  trailingAverage,
  type CheckState,
  type SiteCheck,
} from "@/lib/site/site-health";
import { loadSitesConsole } from "./sites-console-data";

const CHART_W = 720;
const CHART_H = 220;

// Platform admins' console for every school's public site, laid out like an
// analytics dashboard: a status banner, one card with the four figures over
// the visits chart, then ranked pages beside the checks, then the schools.
export default async function SitesConsolePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requirePlatformAdmin();

  const days = normalizeChartDays((await searchParams).days);
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const fill = (key: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), t(key));
  const { checks, counterReachable, now, pages, schools, today, upcomingBySchool, views } = await loadSitesConsole();

  const yesterday = shiftDay(today, -1);
  const weekFrom = shiftDay(today, -6);
  const todayViews = sumViews(views, today, today);
  const yesterdayViews = sumViews(views, yesterday, yesterday);
  const weekViews = sumViews(views, weekFrom, today);
  const lastWeekViews = sumViews(views, shiftDay(today, -13), shiftDay(today, -7));
  const weekChange = percentChange(weekViews, lastWeekViews);
  const published = pages.filter((page) => page.status === "published");
  const liveSchools = schools.filter((school) => published.some((page) => page.school_id === school.id));
  const upcomingTotal = [...upcomingBySchool.values()].reduce((sum, count) => sum + count, 0);
  const state = overallState(checks);
  const problem = firstProblem(checks);
  const counts = { fail: 0, ok: 0, warn: 0 } satisfies Record<CheckState, number>;

  for (const check of checks) counts[check.state] += 1;

  // Chart geometry: bars-free area for daily visits, dashed line for the 7-day average.
  const series = dailySeries(views, days, today);
  const average = trailingAverage(views, days, today);
  const peak = Math.max(4, ...series.map((point) => point.views), ...average.map((point) => point.views));
  const x = (index: number) => (series.length === 1 ? CHART_W / 2 : (index / (series.length - 1)) * CHART_W);
  const y = (value: number) => CHART_H - (value / peak) * (CHART_H - 12);
  const line = series.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.views).toFixed(1)}`).join(" ");
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const avgLine = average.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.views).toFixed(1)}`).join(" ");
  const gridValues = [0, 0.5, 1].map((share) => Math.round(peak * share));
  const labelEvery = Math.ceil(days / 7);

  const lastVisitDay = views.map((row) => row.day).sort().at(-1) ?? null;
  const lastEdit = pages.map((page) => page.updated_at).sort().at(-1) ?? null;

  const pageViews = new Map<string, number>();
  for (const row of views) {
    if (row.day >= weekFrom) {
      const key = `${row.school_id}:${row.page_key}`;
      pageViews.set(key, (pageViews.get(key) ?? 0) + row.views);
    }
  }
  const topPages = [...pageViews.entries()]
    .map(([key, total]) => {
      const [schoolId, pageKey] = key.split(":");
      const school = schools.find((candidate) => candidate.id === schoolId);
      const page = pages.find((candidate) => candidate.id === pageKey);
      return {
        href: school ? `/s/${school.slug}${page ? `/${page.slug}` : ""}` : null,
        path: school ? `/${page ? page.slug : ""}` : "",
        title: page?.title ?? t("superAdmin.sites.topPages.home"),
        total,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const topMax = Math.max(1, ...topPages.map((item) => item.total));

  const kpis = [
    { label: t("superAdmin.sites.kpi.today"), note: fill("superAdmin.sites.kpi.vsYesterday", { count: yesterdayViews }), value: todayViews },
    {
      label: t("superAdmin.sites.kpi.week"),
      note: weekChange === null ? t("superAdmin.sites.kpi.noComparison") : fill("superAdmin.sites.kpi.vsLastWeek", { change: `${weekChange > 0 ? "+" : ""}${weekChange}%` }),
      tone: weekChange === null ? undefined : weekChange >= 0 ? "up" : "down",
      value: weekViews,
    },
    { label: t("superAdmin.sites.kpi.pages"), note: fill("superAdmin.sites.kpi.drafts", { count: pages.length - published.length }), value: published.length },
    { label: t("superAdmin.sites.kpi.liveSites"), note: fill("superAdmin.sites.kpi.ofSchools", { count: schools.length }), value: liveSchools.length },
  ];

  return (
    <>
      <header className="console-top">
        <p className="console-crumb">
          <span>{t("nav.platform")}</span> / <b>{t("superAdmin.sites.title")}</b>
        </p>
        <div className="console-top-actions">
          <nav aria-label={t("superAdmin.sites.chart.title")} className="console-range">
            {CHART_DAY_OPTIONS.map((option) => (
              <Link aria-current={option === days ? "true" : undefined} href={`/super-admin/sites?days=${option}`} key={option} prefetch={false}>
                {fill("superAdmin.sites.chart.days", { count: option })}
              </Link>
            ))}
          </nav>
          <span className="console-stamp">{formatDateTime(now.toISOString(), locale)}</span>
        </div>
      </header>

      <div className="console-body">
        <div className="console-title">
          <h1>{t("superAdmin.sites.title")}</h1>
          <p>{t("superAdmin.sites.description")}</p>
        </div>

        <section className="console-banner" data-state={state}>
          <div className="console-banner-head">
            <span className="console-state" data-state={state}>
              {t(`superAdmin.sites.state.${state}`)}
            </span>
            <span className="console-banner-counts">
              {fill("superAdmin.sites.banner.counts", { fail: counts.fail, ok: counts.ok, warn: counts.warn })}
            </span>
          </div>
          <p className="console-banner-line">
            {problem ? (
              <>
                <b>{t(`superAdmin.sites.checks.${problem.id}.title`)}</b> — {fill(`superAdmin.sites.checks.${problem.id}.summary`, { count: problem.count })} ·{" "}
                <b>{t("superAdmin.sites.banner.next")}:</b> {t(`superAdmin.sites.checks.${problem.id}.action`)}
              </>
            ) : (
              t("superAdmin.sites.banner.allClear")
            )}
          </p>
          <div className="console-sources">
            <span className="console-source" data-ok={counterReachable ? "true" : "false"}>
              <i aria-hidden="true">{counterReachable ? "✓" : "!"}</i>
              <b>{t("superAdmin.sites.console.sourceCounter")}</b>
              {lastVisitDay ?? "—"}
            </span>
            <span className="console-source" data-ok="true">
              <i aria-hidden="true">✓</i>
              <b>{t("superAdmin.sites.console.sourcePages")}</b>
              {lastEdit ? formatDateTime(lastEdit, locale) : "—"}
            </span>
            <span className="console-source" data-ok={upcomingTotal ? "true" : "false"}>
              <i aria-hidden="true">{upcomingTotal ? "✓" : "!"}</i>
              <b>{t("superAdmin.sites.console.sourceActivities")}</b>
              {upcomingTotal}
            </span>
          </div>
        </section>

        <section className="console-card console-analytics">
          <div className="console-kpis">
            {kpis.map((kpi, index) => (
              <div className="console-kpi" data-active={index === 1 ? "true" : undefined} key={kpi.label}>
                <span>{kpi.label}</span>
                <b>{kpi.value.toLocaleString()}</b>
                <small data-tone={kpi.tone}>{kpi.note}</small>
              </div>
            ))}
          </div>
          <div className="console-chart">
            <div className="console-chart-head">
              <h2>{t("superAdmin.sites.chart.title")}</h2>
              <p className="console-legend">
                <span data-series="views">{t("superAdmin.sites.console.seriesViews")}</span>
                <span data-series="avg">{t("superAdmin.sites.console.seriesAverage")}</span>
              </p>
            </div>
            <svg aria-label={t("superAdmin.sites.chart.title")} className="console-svg" preserveAspectRatio="none" role="img" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
              <defs>
                <linearGradient id="console-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4f7dff" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#4f7dff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {gridValues.map((value) => (
                <line className="console-grid" key={value} x1="0" x2={CHART_W} y1={y(value)} y2={y(value)} />
              ))}
              <path d={area} fill="url(#console-area)" />
              <path className="console-line" d={line} />
              <path className="console-avg" d={avgLine} />
            </svg>
            <div className="console-axis">
              {series.map((point, index) =>
                index % labelEvery === 0 || index === series.length - 1 ? (
                  <span key={point.day} style={{ left: `${(x(index) / CHART_W) * 100}%` }}>
                    {point.day.slice(5)}
                  </span>
                ) : null,
              )}
            </div>
            <p className="console-muted">{t("superAdmin.sites.chart.description")}</p>
          </div>
        </section>

        <div className="console-grid-2">
          <section className="console-card console-panel">
            <header>
              <h2>{t("superAdmin.sites.topPages.title")}</h2>
              <span>{t("superAdmin.sites.table.views")}</span>
            </header>
            {topPages.length ? (
              <ol className="console-ranks">
                {topPages.map((item) => (
                  <li key={`${item.href}-${item.title}`}>
                    <span className="console-rank-bar" style={{ width: `${(item.total / topMax) * 100}%` }} />
                    {item.href ? (
                      <a href={item.href} rel="noreferrer" target="_blank">
                        {item.title}
                        <small>{item.path || "/"}</small>
                      </a>
                    ) : (
                      <span>{item.title}</span>
                    )}
                    <b>{item.total}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="console-muted">{t("superAdmin.sites.topPages.empty")}</p>
            )}
          </section>

          <section className="console-card console-panel">
            <header>
              <h2>{t("superAdmin.sites.checks.title")}</h2>
              <span>{t("superAdmin.sites.checks.description")}</span>
            </header>
            <div className="console-checks">
              {checks.map((check) => (
                <details className="console-check" key={check.id} open={check === problem}>
                  <summary>
                    <span className="console-chip" data-state={check.state}>
                      {t(`superAdmin.sites.state.${check.state}`)}
                    </span>
                    <span className="min-w-0">
                      <b>{checkTitle(check, t)}</b>
                      <small>{fill(`superAdmin.sites.checks.${check.id}.summary`, { count: check.count })}</small>
                    </span>
                  </summary>
                  {check.state !== "ok" ? (
                    <p>
                      <b>{t("superAdmin.sites.banner.next")}:</b> {t(`superAdmin.sites.checks.${check.id}.action`)}
                    </p>
                  ) : null}
                  {check.schools.length ? <p className="console-muted">{check.schools.join(", ")}</p> : null}
                </details>
              ))}
            </div>
          </section>
        </div>

        <section className="console-card console-panel">
          <header>
            <h2>{t("superAdmin.sites.table.title")}</h2>
          </header>
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>{t("superAdmin.sites.table.school")}</th>
                  <th>{t("superAdmin.sites.table.published")}</th>
                  <th>{t("superAdmin.sites.table.drafts")}</th>
                  <th>{t("superAdmin.sites.table.photos")}</th>
                  <th>{t("superAdmin.sites.table.views")}</th>
                  <th>{t("superAdmin.sites.table.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => {
                  const own = pages.filter((page) => page.school_id === school.id);
                  const live = own.filter((page) => page.status === "published");
                  const sections = live.filter((page) => !page.parent_id);
                  const updated = own.map((page) => page.updated_at).sort().at(-1);

                  return (
                    <tr key={school.id}>
                      <td>
                        {live.length ? (
                          <a href={`/s/${school.slug}`} rel="noreferrer" target="_blank">
                            {school.name}
                          </a>
                        ) : (
                          school.name
                        )}
                        <small>/s/{school.slug}</small>
                      </td>
                      <td>{live.length}</td>
                      <td>{own.length - live.length}</td>
                      <td>{sections.length ? `${sections.filter((page) => page.cover_path).length} / ${sections.length}` : "—"}</td>
                      <td>{sumViews(views.filter((row) => row.school_id === school.id), weekFrom, today)}</td>
                      <td>{updated ? formatDateTime(updated, locale) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function checkTitle(check: SiteCheck, t: (key: string) => string) {
  return t(`superAdmin.sites.checks.${check.id}.title`);
}
