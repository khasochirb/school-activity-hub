import Link from "next/link";
import { requireSafeguardingStaff } from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import {
  DetailsDisclosure,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "../../_components/page-ui";
import { SafetyReportWorkflowForm } from "./workflow-form";

type SafetyReport = {
  acknowledged_at: string | null;
  closed_at: string | null;
  concern_category: string;
  created_at: string;
  description: string;
  external_referral_at: string | null;
  id: string;
  immediate_contact_requested: boolean;
  related_club_id: string | null;
  related_event_id: string | null;
  reporter_profile_id: string;
  status: string;
};

type NamedProfile = { full_name: string; id: string };
type NamedEvent = { id: string; title: string };
type NamedClub = { id: string; name: string };

export default async function SafeguardingInboxPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await requireSafeguardingStaff();
  const supabase = await createClient();
  const reportResult = await supabase
    .from("safety_reports")
    .select(
      "id, reporter_profile_id, related_event_id, related_club_id, concern_category, description, immediate_contact_requested, status, acknowledged_at, external_referral_at, closed_at, created_at",
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<SafetyReport[]>();

  if (reportResult.error) {
    logServerError("Safeguarding inbox query failed", reportResult.error);
  }

  const reports = reportResult.data ?? [];
  const reporterIds = unique(reports.map((report) => report.reporter_profile_id));
  const eventIds = unique(reports.map((report) => report.related_event_id));
  const clubIds = unique(reports.map((report) => report.related_club_id));
  const [profilesResult, eventsResult, clubsResult] = await Promise.all([
    reporterIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .eq("school_id", profile.school_id)
          .in("id", reporterIds)
          .returns<NamedProfile[]>()
      : Promise.resolve({ data: [] as NamedProfile[], error: null }),
    eventIds.length
      ? supabase
          .from("events")
          .select("id, title")
          .eq("school_id", profile.school_id)
          .in("id", eventIds)
          .returns<NamedEvent[]>()
      : Promise.resolve({ data: [] as NamedEvent[], error: null }),
    clubIds.length
      ? supabase
          .from("clubs")
          .select("id, name")
          .eq("school_id", profile.school_id)
          .in("id", clubIds)
          .returns<NamedClub[]>()
      : Promise.resolve({ data: [] as NamedClub[], error: null }),
  ]);

  if (profilesResult.error || eventsResult.error || clubsResult.error) {
    logServerError(
      "Safeguarding inbox display lookup failed",
      profilesResult.error ?? eventsResult.error ?? clubsResult.error,
    );
  }

  const reporterNames = new Map(
    (profilesResult.data ?? []).map((item) => [item.id, item.full_name]),
  );
  const eventNames = new Map(
    (eventsResult.data ?? []).map((item) => [item.id, item.title]),
  );
  const clubNames = new Map(
    (clubsResult.data ?? []).map((item) => [item.id, item.name]),
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="btn btn-secondary" href="/safety" prefetch={false}>
            {t("safety.actions.back")}
          </Link>
        }
        description={t("safety.inbox.description")}
        title={t("safety.inbox.title")}
      />

      <section className="notice-box notice-warning">
        <p className="font-bold">{t("safety.inbox.restrictedTitle")}</p>
        <p className="mt-2 text-sm leading-6">{t("safety.inbox.restrictedDescription")}</p>
      </section>

      {reportResult.error ? (
        <section className="notice-box notice-danger" role="alert">
          {t("safety.errors.loadInboxFailed")}
        </section>
      ) : reports.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {reports.map((report) => {
            const workflowOptions = getWorkflowOptions(report.status, t);
            const relatedName = report.related_event_id
              ? eventNames.get(report.related_event_id)
              : report.related_club_id
                ? clubNames.get(report.related_club_id)
                : null;

            return (
              <article className="section-card section-card-padded min-w-0" key={report.id}>
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {categoryLabel(report.concern_category, t)}
                    </p>
                    <h2 className="mt-1 break-words text-base font-bold text-slate-950">
                      {reporterNames.get(report.reporter_profile_id) ?? t("safety.inbox.reporterUnavailable")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTime(report.created_at, locale)}
                    </p>
                  </div>
                  <StatusBadge status={report.status}>
                    {statusLabel(report.status, t)}
                  </StatusBadge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {report.immediate_contact_requested ? (
                    <StatusBadge variant="warning">
                      {t("safety.inbox.contactRequested")}
                    </StatusBadge>
                  ) : null}
                  {relatedName ? (
                    <span className="badge">{relatedName}</span>
                  ) : null}
                </div>

                <DetailsDisclosure label={t("safety.inbox.viewConfidentialDescription")}>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                    {report.description}
                  </p>
                </DetailsDisclosure>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {report.acknowledged_at ? (
                    <TimelineItem
                      label={t("safety.myReports.acknowledgedAt")}
                      value={formatDateTime(report.acknowledged_at, locale)}
                    />
                  ) : null}
                  {report.external_referral_at ? (
                    <TimelineItem
                      label={t("safety.inbox.externalReferralAt")}
                      value={formatDateTime(report.external_referral_at, locale)}
                    />
                  ) : null}
                  {report.closed_at ? (
                    <TimelineItem
                      label={t("safety.myReports.closedAt")}
                      value={formatDateTime(report.closed_at, locale)}
                    />
                  ) : null}
                </dl>

                <SafetyReportWorkflowForm
                  labels={{
                    save: t("safety.inbox.updateStatus"),
                    saving: t("common.saving"),
                    status: t("safety.inbox.nextStatus"),
                  }}
                  options={workflowOptions}
                  reportId={report.id}
                />
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          description={t("safety.inbox.emptyDescription")}
          title={t("safety.inbox.emptyTitle")}
        />
      )}
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-card">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value">{value}</dd>
    </div>
  );
}

function unique(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function categoryLabel(value: string, t: (key: string) => string) {
  const keys: Record<string, string> = {
    activity_or_event: "activityOrEvent",
    bullying_or_harassment: "bullyingOrHarassment",
    online_or_platform: "onlineOrPlatform",
    other: "other",
    personal_safety: "personalSafety",
  };

  return t(`safety.categories.${keys[value] ?? "other"}`);
}

function statusLabel(value: string, t: (key: string) => string) {
  const keys: Record<string, string> = {
    acknowledged: "acknowledged",
    closed: "closed",
    external_referral: "externalReferral",
    in_review: "inReview",
    submitted: "submitted",
  };

  return t(`safety.status.${keys[value] ?? "submitted"}`);
}

function getWorkflowOptions(status: string, t: (key: string) => string) {
  const nextByStatus: Record<string, string[]> = {
    acknowledged: ["in_review", "external_referral", "closed"],
    external_referral: ["closed"],
    in_review: ["external_referral", "closed"],
    submitted: ["acknowledged"],
  };

  return (nextByStatus[status] ?? []).map((value) => ({
    label: statusLabel(value, t),
    value,
  }));
}
