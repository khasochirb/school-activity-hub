import Link from "next/link";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "../../_components/page-ui";

type SafetyReportReceipt = {
  acknowledged_at: string | null;
  closed_at: string | null;
  concern_category: string;
  created_at: string;
  id: string;
  immediate_contact_requested: boolean;
  status: string;
};

export default async function MySafetyReportsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  await requireActiveSchoolProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_safety_report_receipts");

  if (error) {
    logServerError("Own safety report receipts failed", error);
  }

  const reports = (data ?? []) as SafetyReportReceipt[];

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="btn btn-primary" href="/safety/report" prefetch={false}>
            {t("safety.cards.reportAction")}
          </Link>
        }
        description={t("safety.myReports.description")}
        title={t("safety.myReports.title")}
      />

      <section className="notice-box">
        <p className="text-sm leading-6">{t("safety.myReports.safeSubset")}</p>
      </section>

      {error ? (
        <section className="notice-box notice-danger" role="alert">
          {t("safety.errors.loadOwnReportsFailed")}
        </section>
      ) : reports.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <article className="section-card section-card-padded" key={report.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="section-title">
                  {categoryLabel(report.concern_category, t)}
                </h2>
                <StatusBadge status={report.status}>
                  {statusLabel(report.status, t)}
                </StatusBadge>
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <ReceiptItem
                  label={t("safety.myReports.submittedAt")}
                  value={formatDateTime(report.created_at, locale)}
                />
                {report.acknowledged_at ? (
                  <ReceiptItem
                    label={t("safety.myReports.acknowledgedAt")}
                    value={formatDateTime(report.acknowledged_at, locale)}
                  />
                ) : null}
                {report.closed_at ? (
                  <ReceiptItem
                    label={t("safety.myReports.closedAt")}
                    value={formatDateTime(report.closed_at, locale)}
                  />
                ) : null}
                <ReceiptItem
                  label={t("safety.report.fields.immediateContact")}
                  value={report.immediate_contact_requested ? t("common.yes") : t("common.no")}
                />
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          action={
            <Link className="btn btn-primary" href="/safety/report" prefetch={false}>
              {t("safety.cards.reportAction")}
            </Link>
          }
          description={t("safety.myReports.emptyDescription")}
          title={t("safety.myReports.emptyTitle")}
        />
      )}
    </div>
  );
}

function ReceiptItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 border-t border-slate-200 pt-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className="break-words text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function categoryLabel(value: string, t: (key: string) => string) {
  const keyByCategory: Record<string, string> = {
    activity_or_event: "activityOrEvent",
    bullying_or_harassment: "bullyingOrHarassment",
    online_or_platform: "onlineOrPlatform",
    other: "other",
    personal_safety: "personalSafety",
  };

  return t(`safety.categories.${keyByCategory[value] ?? "other"}`);
}

function statusLabel(value: string, t: (key: string) => string) {
  const keyByStatus: Record<string, string> = {
    acknowledged: "acknowledged",
    closed: "closed",
    external_referral: "externalReferral",
    in_review: "inReview",
    submitted: "submitted",
  };

  return t(`safety.status.${keyByStatus[value] ?? "submitted"}`);
}
