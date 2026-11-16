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
  type CheckState,
  type SiteCheck,
} from "@/lib/site/site-health";
import { PageHead, Section, Widget } from "../../_components/clean-ui";
import { loadSitesConsole } from "./sites-console-data";

// Platform admins' console for every school's public site: is it healthy, is
// anyone reading it, and what to fix first. Modelled on an ops console: a
// status banner, four figures, readers per day, then the checks.
export default async function SitesConsolePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requirePlatformAdmin();

  const days = normalizeChartDays((await searchParams).days);
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const fill = (key: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), t(key));
  const { checks, now, pages, schools, today, views } = await loadSitesConsole();

  const yesterday = shiftDay(today, -1);
  const todayViews = sumViews(views, today, today);
  const yesterdayViews = sumViews(views, yesterday, yesterday);
  const weekViews = sumViews(views, shiftDay(today, -6), today);
  const lastWeekViews = sumViews(views, shiftDay(today, -13), shiftDay(today, -7));
  const weekChange = percentChange(weekViews, lastWeekViews);
  const published = pages.filter((page) => page.status === "published");
  const liveSchools = schools.filter((school) => published.some((page) => page.school_id === school.id));
  const series = dailySeries(views, days, today);
  const peak = Math.max(1, ...series.map((point) => point.views));
  const state = overallState(checks);
  const problem = firstProblem(checks);
  const counts = { fail: 0, ok: 0, warn: 0 } satisfies Record<CheckState, number>;

  for (const check of checks) counts[check.state] += 1;

  const pageViews = new Map<string, number>();
  for (const row of views) {
    if (row.day >= shiftDay(today, -6)) {
      const key = `${row.school_id}:${row.page_key}`;
      pageViews.set(key, (pageViews.get(key) ?? 0) + row.views);
    }
  }
  const topPages = [...pageViews.entries()]
    .map(([key, total]) => {
      const [schoolId, pageKey] = key.split(":");
      const school = schools.find((candidate) => candidate.id === schoolId);
      const page = pages.find((candidate) => candidate.id === pageKey);
      return { href: school ? `/s/${school.slug}${page ? `/${page.slug}` : ""}` : null, school: school?.name ?? "", title: page?.title ?? t("superAdmin.sites.topPages.home"), total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return (
    <div className="cl-page">
      <div className="flex flex-col gap-2">
        <span className="cl-tag self-start" data-tone="blue">
          {t("superAdmin.page.mode")}
        </span>
        <PageHead subtitle={t("superAdmin.sites.description")} title={t("superAdmin.sites.title")} />
      </div>

      <section className="sites-banner" data-state={state}>
        <p className="sites-banner-state">{t(`superAdmin.sites.state.${state}`)}</p>
        <p className="sites-banner-line">
          {problem ? (
            <>
              <b>{checkTitle(problem, t)}</b> — {fill(`superAdmin.sites.checks.${problem.id}.summary`, { count: problem.count })} ·{" "}
              <b>{t("superAdmin.sites.banner.next")}:</b> {t(`superAdmin.sites.checks.${problem.id}.action`)}
            </>
          ) : (
            t("superAdmin.sites.banner.allClear")
          )}
        </p>
        <p className="sites-banner-meta">
          {fill("superAdmin.sites.banner.counts", { fail: counts.fail, ok: counts.ok, warn: counts.warn })} ·{" "}
          {fill("superAdmin.sites.banner.asOf", { time: formatDateTime(now.toISOString(), locale) })}
        </p>
      </section>

      <section className="cl-stats">
        <Stat label={t("superAdmin.sites.kpi.today")} note={fill("superAdmin.sites.kpi.vsYesterday", { count: yesterdayViews })} value={todayViews} />
        <Stat
          label={t("superAdmin.sites.kpi.week")}
          note={weekChange === null ? t("superAdmin.sites.kpi.noComparison") : fill("superAdmin.sites.kpi.vsLastWeek", { change: `${weekChange > 0 ? "+" : ""}${weekChange}%` })}
          tone={weekChange === null ? undefined : weekChange >= 0 ? "up" : "down"}
          value={weekViews}
        />
        <Stat label={t("superAdmin.sites.kpi.pages")} note={fill("superAdmin.sites.kpi.drafts", { count: pages.length - published.length })} value={published.length} />
        <Stat label={t("superAdmin.sites.kpi.liveSites")} note={fill("superAdmin.sites.kpi.ofSchools", { count: schools.length })} value={liveSchools.length} />
      </section>

      <div className="cl-split">
        <div className="cl-main">
          <section className="cl-card sites-chart-card">
            <header className="sites-chart-head">
              <div>
                <h2>{t("superAdmin.sites.chart.title")}</h2>
                <p className="cl-muted">{t("superAdmin.sites.chart.description")}</p>
              </div>
              <nav aria-label={t("superAdmin.sites.chart.title")} className="sites-range">
                {CHART_DAY_OPTIONS.map((option) => (
                  <Link aria-current={option === days ? "true" : undefined} href={`/super-admin/sites?days=${option}`} key={option} prefetch={false}>
                    {fill("superAdmin.sites.chart.days", { count: option })}
                  </Link>
                ))}
              </nav>
            </header>
            <div aria-label={t("superAdmin.sites.chart.title")} className="sites-chart" data-days={days} role="img">
              {series.map((point, index) => (
                <div className="sites-bar" key={point.day} title={`${point.day}: ${point.views}`}>
                  <span style={{ height: `${(point.views / peak) * 100}%` }} />
                  {index % Math.ceil(days / 7) === 0 || index === series.length - 1 ? <small>{point.day.slice(5)}</small> : null}
                </div>
              ))}
            </div>
            {weekViews === 0 && lastWeekViews === 0 ? <p className="cl-muted mt-3">{t("superAdmin.sites.chart.empty")}</p> : null}
          </section>

          <Section title={t("superAdmin.sites.table.title")}>
            <div className="cl-card sites-table-wrap">
              <table className="sites-table">
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
                          <span className="cl-muted block text-xs">/s/{school.slug}</span>
                        </td>
                        <td>{live.length}</td>
                        <td>{own.length - live.length}</td>
                        <td>{sections.length ? `${sections.filter((page) => page.cover_path).length} / ${sections.length}` : "—"}</td>
                        <td>{sumViews(views.filter((row) => row.school_id === school.id), shiftDay(today, -6), today)}</td>
                        <td>{updated ? formatDateTime(updated, locale) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={t("superAdmin.sites.topPages.title")}>
            {topPages.length ? (
              <ol className="cl-card sites-top">
                {topPages.map((item) => (
                  <li key={`${item.href}-${item.title}`}>
                    <span className="min-w-0">
                      {item.href ? (
                        <a href={item.href} rel="noreferrer" target="_blank">
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                      <span className="cl-muted block text-xs">{item.school}</span>
                    </span>
                    <b>{item.total}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cl-card cl-empty">{t("superAdmin.sites.topPages.empty")}</p>
            )}
          </Section>
        </div>

        <aside className="cl-side">
          <Widget title={t("superAdmin.sites.checks.title")}>
            <p className="cl-muted text-sm">{t("superAdmin.sites.checks.description")}</p>
            <div className="sites-checks">
              {checks.map((check) => (
                <details className="sites-check" key={check.id} open={check === problem}>
                  <summary>
                    <span className="cl-tag" data-tone={toneOf(check.state)}>
                      {t(`superAdmin.sites.state.${check.state}`)}
                    </span>
                    <span className="min-w-0">
                      <b>{checkTitle(check, t)}</b>
                      <span className="cl-muted block text-xs">{fill(`superAdmin.sites.checks.${check.id}.summary`, { count: check.count })}</span>
                    </span>
                  </summary>
                  {check.state !== "ok" ? (
                    <p>
                      <b>{t("superAdmin.sites.banner.next")}:</b> {t(`superAdmin.sites.checks.${check.id}.action`)}
                    </p>
                  ) : null}
                  {check.schools.length ? <p className="cl-muted text-xs">{check.schools.join(", ")}</p> : null}
                </details>
              ))}
            </div>
          </Widget>
        </aside>
      </div>
    </div>
  );
}

function checkTitle(check: SiteCheck, t: (key: string) => string) {
  return t(`superAdmin.sites.checks.${check.id}.title`);
}

function toneOf(state: CheckState) {
  return state === "ok" ? "ok" : state === "warn" ? "warn" : "danger";
}

function Stat({ label, note, tone, value }: { label: string; note: string; tone?: "down" | "up"; value: number }) {
  return (
    <article className="cl-card cl-stat">
      <span className="cl-muted">{label}</span>
      <b>{value.toLocaleString()}</b>
      <span className="sites-stat-note" data-tone={tone}>
        {note}
      </span>
    </article>
  );
}
