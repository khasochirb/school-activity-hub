import Link from "next/link";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "../../_components/page-ui";
import { DataRightsRequestForm } from "./data-rights-request-form";
import { WithdrawRequestForm } from "./withdraw-request-form";

type DataRightsRequest = {
  created_at: string;
  details: string | null;
  id: string;
  request_type: string;
  response_summary: string | null;
  status: string;
  status_changed_at: string;
};

const terminalStatuses = new Set(["completed", "denied_with_reason", "withdrawn"]);

export default async function DataRightsRequestsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await requireActiveSchoolProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_rights_requests")
    .select(
      "id, request_type, details, status, response_summary, status_changed_at, created_at",
    )
    .eq("school_id", profile.school_id)
    .eq("requester_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<DataRightsRequest[]>();

  if (error) {
    logServerError("Own data-rights requests query failed", error);
  }

  const requests = data ?? [];

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="btn btn-secondary" href="/privacy" prefetch={false}>
            {t("privacy.actions.back")}
          </Link>
        }
        description={t("privacy.requests.description")}
        title={t("privacy.requests.title")}
      />

      <section className="notice-box">
        <p className="text-sm leading-6">{t("privacy.requests.reviewNotice")}</p>
      </section>

      <section className="section-card section-card-padded max-w-3xl">
        <h2 className="section-title">{t("privacy.requests.newTitle")}</h2>
        <p className="section-description">{t("privacy.requests.newDescription")}</p>
        <div className="mt-4">
          <DataRightsRequestForm
            labels={{
              details: t("privacy.requests.fields.details"),
              detailsHelp: t("privacy.requests.fields.detailsHelp"),
              requestType: t("privacy.requests.fields.type"),
              submit: t("privacy.requests.actions.submit"),
              submitting: t("privacy.requests.actions.submitting"),
            }}
            requestTypes={requestTypeOptions(t)}
          />
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">{t("privacy.requests.currentTitle")}</h2>
        {error ? (
          <div className="notice-box notice-danger" role="alert">
            {t("privacy.requests.errors.loadFailed")}
          </div>
        ) : requests.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => (
              <article className="section-card section-card-padded min-w-0" key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="break-words text-base font-bold text-slate-950">
                    {requestTypeLabel(request.request_type, t)}
                  </h3>
                  <StatusBadge status={request.status}>
                    {requestStatusLabel(request.status, t)}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {t("privacy.requests.submittedAt")}: {formatDateTime(request.created_at, locale)}
                </p>
                {request.details ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {request.details}
                  </p>
                ) : null}
                {request.response_summary ? (
                  <div className="notice-box mt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {t("privacy.requests.response")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                      {request.response_summary}
                    </p>
                  </div>
                ) : null}
                {!terminalStatuses.has(request.status) ? (
                  <div className="mt-4">
                    <WithdrawRequestForm
                      labels={{
                        withdraw: t("privacy.requests.actions.withdraw"),
                        withdrawing: t("privacy.requests.actions.withdrawing"),
                      }}
                      requestId={request.id}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            description={t("privacy.requests.emptyDescription")}
            title={t("privacy.requests.emptyTitle")}
          />
        )}
      </section>
    </div>
  );
}

function requestTypeOptions(t: (key: string) => string) {
  return ["access", "correction", "export", "deletion_or_deactivation", "research_withdrawal"].map(
    (value) => ({ label: requestTypeLabel(value, t), value }),
  );
}

function requestTypeLabel(value: string, t: (key: string) => string) {
  const keys: Record<string, string> = {
    access: "access",
    correction: "correction",
    deletion_or_deactivation: "deletionOrDeactivation",
    export: "export",
    research_withdrawal: "researchWithdrawal",
  };

  return t(`privacy.requests.types.${keys[value] ?? "access"}`);
}

function requestStatusLabel(value: string, t: (key: string) => string) {
  const keys: Record<string, string> = {
    acknowledged: "acknowledged",
    action_required: "actionRequired",
    completed: "completed",
    denied_with_reason: "deniedWithReason",
    submitted: "submitted",
    under_review: "underReview",
    withdrawn: "withdrawn",
  };

  return t(`privacy.requests.status.${keys[value] ?? "submitted"}`);
}
