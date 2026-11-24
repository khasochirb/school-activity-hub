import Link from "next/link";
import { loadPlatformAuditLogs } from "@/lib/audit/platform-audit-query";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatDate, formatDateTime } from "@/lib/i18n/date-format";
import { formatTranslation, getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { FUNNEL_STEPS, shareOf } from "@/lib/platform/overview";
import { CHART_DAY_OPTIONS, normalizeChartDays } from "@/lib/site/site-health";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditActionLabelKey } from "./audit-labels";
import { loadPlatformOverview } from "./overview-data";
import { OverviewView, type OverviewLabels } from "./overview-view";

// The platform admins' front page: every school in totals. It shows no student
// names, codes or attendance records, as the platform promises.
export default async function PlatformOverviewPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requirePlatformAdmin();

  const days = normalizeChartDays((await searchParams).days);
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) => formatTranslation(dictionary, key, values);
  const [overview, audit] = await Promise.all([
    // A failed read shows as an error, never as a smaller number.
    loadPlatformOverview(days).catch(() => null),
    loadPlatformAuditLogs({ admin: createAdminClient(), context: "Platform overview audit log query", limit: 6 }),
  ]);

  if (!overview) {
    return (
      <div className="console-body">
        <div className="console-title">
          <h1>{t("superAdmin.overview.title")}</h1>
        </div>
        <section className="console-banner" data-state="fail" role="alert">
          <span className="console-state" data-state="fail">{t("superAdmin.sites.state.fail")}</span>
          <p className="console-banner-line">{t("superAdmin.overview.loadFailed")}</p>
        </section>
      </div>
    );
  }

  const labels: OverviewLabels = {
    chartCheckins: t("superAdmin.overview.chart.checkins"),
    chartSignups: t("superAdmin.overview.chart.signups"),
    checksTitle: t("superAdmin.sites.checks.title"),
    crumb: t("nav.platform"),
    days: CHART_DAY_OPTIONS.map((option) => ({ href: `/super-admin?days=${option}`, label: tf("superAdmin.sites.chart.days", { count: option }), selected: option === days })),
    description: t("superAdmin.overview.description"),
    funnelNote: t("superAdmin.overview.funnel.note"),
    funnelTitle: t("superAdmin.overview.funnel.title"),
    log: audit.logs.map((log) => ({ id: log.id, time: formatDateTime(log.created_at, locale), title: t(auditActionLabelKey(log.action)) })),
    logAll: t("nav.auditLog"),
    logEmpty: t("superAdmin.auditLog.noRecentActions"),
    logTitle: t("superAdmin.auditLog.recentActions"),
    newSchool: t("superAdmin.page.newSchool"),
    next: t("superAdmin.sites.banner.next"),
    schoolsTitle: t("superAdmin.page.schools"),
    stamp: formatDateTime(overview.now.toISOString(), locale),
    title: t("superAdmin.overview.title"),
  };
  const problem = overview.checks.find((check) => check.state === "fail") ?? overview.checks.find((check) => check.state === "warn") ?? null;
  const tally = { fail: 0, ok: 0, warn: 0 };
  for (const check of overview.checks) tally[check.state] += 1;

  return (
    <OverviewView
      banner={{
        action: problem ? t(`superAdmin.overview.checks.${problem.id}.action`) : null,
        counts: tf("superAdmin.sites.banner.counts", tally),
        line: problem ? tf(`superAdmin.overview.checks.${problem.id}.summary`, { count: problem.count }) : t("superAdmin.sites.banner.allClear"),
        state: problem?.state ?? "ok",
        stateLabel: t(`superAdmin.sites.state.${problem?.state ?? "ok"}`),
        title: problem ? t(`superAdmin.overview.checks.${problem.id}.title`) : null,
      }}
      charts={{ checkins: overview.checkinSeries, signups: overview.signupSeries }}
      checks={overview.checks.map((check) => ({
        action: t(`superAdmin.overview.checks.${check.id}.action`),
        id: check.id,
        open: check === problem,
        schools: check.schools,
        state: check.state,
        stateLabel: t(`superAdmin.sites.state.${check.state}`),
        summary: tf(`superAdmin.overview.checks.${check.id}.summary`, { count: check.count }),
        title: t(`superAdmin.overview.checks.${check.id}.title`),
      }))}
      funnel={FUNNEL_STEPS.map((step) => ({
        id: step,
        label: t(`superAdmin.overview.funnel.${step}`),
        share: shareOf(overview.totals[step], overview.totals.students),
        value: overview.totals[step],
      }))}
      kpis={(["schools", "teachers", "clubs", "upcoming", "checkinsRecent", "pending"] as const).map((key) => ({
        label: t(`superAdmin.overview.kpi.${key}`),
        value: overview.totals[key],
      }))}
      labels={labels}
      table={{
        columns: (["school", "students", "joined", "inClub", "clubs", "upcoming", "checkinsRecent", "teachers", "admins", "pending", "lastSignup"] as const).map((key) => t(`superAdmin.overview.table.${key}`)),
        // Demo schools last, so the first line is always a real school.
        rows: [...overview.schools].sort((a, b) => Number(a.isDemo) - Number(b.isDemo)).map((school) => ({
          cells: [
            school.students,
            school.students ? `${school.joined} (${shareOf(school.joined, school.students)}%)` : "0",
            school.inClub,
            school.clubs,
            school.upcoming,
            school.checkinsRecent,
            school.teachers,
            school.admins,
            school.pending,
            school.lastSignup ? formatDate(school.lastSignup, locale) : "—",
          ],
          href: `/super-admin/schools/${school.id}`,
          id: school.id,
          name: school.name,
          note: school.isDemo ? t("superAdmin.overview.demoNote") : `/s/${school.slug}`,
        })),
      }}
    >
      <Link className="console-action" href="/super-admin/schools/new" prefetch={false}>
        + {labels.newSchool}
      </Link>
    </OverviewView>
  );
}
