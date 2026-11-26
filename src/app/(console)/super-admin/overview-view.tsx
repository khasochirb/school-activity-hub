import Link from "next/link";
import type { ReactNode } from "react";

type State = "fail" | "ok" | "warn";
type Point = { count: number; day: string };

export type OverviewLabels = {
  chartCheckins: string;
  chartSignups: string;
  checksTitle: string;
  crumb: string;
  days: Array<{ href: string; label: string; selected: boolean }>;
  description: string;
  funnelNote: string;
  funnelTitle: string;
  log: Array<{ id: string; time: string; title: string }>;
  logAll: string;
  logEmpty: string;
  logTitle: string;
  newSchool: string;
  next: string;
  schoolsTitle: string;
  stamp: string;
  title: string;
};

// Layout only: every figure and label arrives ready, so it can be previewed
// without a database.
export function OverviewView({
  banner,
  charts,
  checks,
  children,
  funnel,
  kpis,
  labels,
  table,
}: {
  banner: { action: string | null; counts: string; line: string; state: State; stateLabel: string; title: string | null };
  charts: { checkins: Point[]; signups: Point[] };
  checks: Array<{ action: string; id: string; open: boolean; schools: string[]; state: State; stateLabel: string; summary: string; title: string }>;
  children?: ReactNode;
  funnel: Array<{ id: string; label: string; share: number | null; value: number }>;
  kpis: Array<{ label: string; value: number }>;
  labels: OverviewLabels;
  table: { columns: string[]; rows: Array<{ cells: Array<number | string>; href: string; id: string; name: string; note: string }> };
}) {
  return (
    <>
      <header className="console-top">
        <p className="console-crumb">
          <span>{labels.crumb}</span> / <b>{labels.title}</b>
        </p>
        <div className="console-top-actions">
          <nav aria-label={labels.chartSignups} className="console-range">
            {labels.days.map((option) => (
              <Link aria-current={option.selected ? "true" : undefined} href={option.href} key={option.href} prefetch={false}>
                {option.label}
              </Link>
            ))}
          </nav>
          <span className="console-stamp">{labels.stamp}</span>
          {children}
        </div>
      </header>

      <div className="console-body">
        <div className="console-title">
          <h1>{labels.title}</h1>
          <p>{labels.description}</p>
        </div>

        <section className="console-banner" data-state={banner.state}>
          <div className="console-banner-head">
            <span className="console-state" data-state={banner.state}>{banner.stateLabel}</span>
            <span className="console-banner-counts">{banner.counts}</span>
          </div>
          <p className="console-banner-line">
            {banner.title ? (
              <>
                <b>{banner.title}</b> — {banner.line} · <b>{labels.next}:</b> {banner.action}
              </>
            ) : (
              banner.line
            )}
          </p>
        </section>

        <section className="console-card console-panel">
          <header>
            <h2>{labels.funnelTitle}</h2>
            <span>{labels.funnelNote}</span>
          </header>
          <ol className="console-funnel">
            {funnel.map((step) => (
              <li key={step.id}>
                <b>{step.value.toLocaleString()}</b>
                <span>{step.label}</span>
                <i aria-hidden="true"><em style={{ width: `${step.share ?? 0}%` }} /></i>
                <small>{step.share === null ? "—" : `${step.share}%`}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="console-card">
          <div className="console-kpis console-kpis-6">
            {kpis.map((kpi) => (
              <div className="console-kpi" key={kpi.label}>
                <span>{kpi.label}</span>
                <b>{kpi.value.toLocaleString()}</b>
              </div>
            ))}
          </div>
        </section>

        <div className="console-grid-2">
          <DayBars points={charts.signups} title={labels.chartSignups} />
          <DayBars points={charts.checkins} title={labels.chartCheckins} />
        </div>

        <section className="console-card console-panel">
          <header>
            <h2>{labels.schoolsTitle}</h2>
          </header>
          <div className="console-table-wrap">
            <table className="console-table console-table-num">
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} scope="col">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={row.href} prefetch={false}>{row.name}</Link>
                      <small>{row.note}</small>
                    </td>
                    {row.cells.map((cell, index) => (
                      <td key={table.columns[index + 1]}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="console-grid-2">
          <section className="console-card console-panel">
            <header>
              <h2>{labels.checksTitle}</h2>
            </header>
            <div className="console-checks">
              {checks.map((check) => (
                <details className="console-check" key={check.id} open={check.open}>
                  <summary>
                    <span className="console-chip" data-state={check.state}>{check.stateLabel}</span>
                    <span className="min-w-0">
                      <b>{check.title}</b>
                      <small>{check.summary}</small>
                    </span>
                  </summary>
                  {check.state !== "ok" ? (
                    <p>
                      <b>{labels.next}:</b> {check.action}
                    </p>
                  ) : null}
                  {check.schools.length ? <p className="console-muted">{check.schools.join(", ")}</p> : null}
                </details>
              ))}
            </div>
          </section>

          <section className="console-card console-panel">
            <header>
              <h2>{labels.logTitle}</h2>
              <Link className="console-panel-link" href="/super-admin/audit-log" prefetch={false}>{labels.logAll}</Link>
            </header>
            {labels.log.length ? (
              <ul className="console-log">
                {labels.log.map((entry) => (
                  <li key={entry.id}>
                    <b>{entry.title}</b>
                    <small>{entry.time}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="console-muted">{labels.logEmpty}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

// One column a day, one series. The figure shows on hover and on focus, and the
// peak and total are written out, so nothing depends on reading a bar's height.
function DayBars({ points, title }: { points: Point[]; title: string }) {
  const peak = Math.max(1, ...points.map((point) => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <section className="console-card console-panel">
      <header>
        <h2>{title}</h2>
        <span>{total.toLocaleString()}</span>
      </header>
      <ol className="console-bars">
        {points.map((point) => (
          <li aria-label={`${point.day}: ${point.count}`} key={point.day} tabIndex={0}>
            <span className="console-bar-tip">{point.day.slice(5)} · {point.count}</span>
            <i style={{ height: `${(point.count / peak) * 100}%` }} />
          </li>
        ))}
      </ol>
      <div className="console-bars-axis">
        <span>{points[0]?.day.slice(5)}</span>
        <span>{points.at(-1)?.day.slice(5)}</span>
      </div>
    </section>
  );
}
