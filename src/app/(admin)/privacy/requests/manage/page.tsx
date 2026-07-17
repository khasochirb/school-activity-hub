import Link from "next/link";
import { requireSchoolAdminForSensitiveWorkflow } from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "../../../_components/page-ui";
import { ProcessRequestForm } from "./process-request-form";

type DataRightsRequest = {
  created_at: string;
  details: string | null;
  id: string;
  request_type: string;
  requester_profile_id: string;
  response_summary: string | null;
  status: string;
};

type NamedProfile = { full_name: string; id: string };
const terminalStatuses = new Set(["completed", "denied_with_reason", "withdrawn"]);

export default async function ManageDataRightsRequestsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await requireSchoolAdminForSensitiveWorkflow();
  const supabase = await createClient();
  const requestResult = await supabase
    .from("data_rights_requests")
    .select(
      "id, requester_profile_id, request_type, details, status, response_summary, created_at",
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<DataRightsRequest[]>();

  if (requestResult.error) {
    logServerError("Data-rights management query failed", requestResult.error);
  }

  const requests = requestResult.data ?? [];
  const requesterIds = [...new Set(requests.map((request) => request.requester_profile_id))];
  const profileResult = requesterIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("school_id", profile.school_id)
        .in("id", requesterIds)
        .returns<NamedProfile[]>()
    : { data: [] as NamedProfile[], error: null };

  if (profileResult.error) {
    logServerError("Data-rights requester display lookup failed", profileResult.error);
  }

  const requesterNames = new Map(
    (profileResult.data ?? []).map((requester) => [requester.id, requester.full_name]),
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="btn btn-secondary" href="/privacy" prefetch={false}>
            {t("privacy.actions.back")}
          </Link>
        }
        description={t("privacy.manage.description")}
        title={t("privacy.manage.title")}
      />

      <section className="notice-box notice-warning">
        <p className="font-bold">{t("privacy.manage.reviewTitle")}</p>
        <p className="mt-2 text-sm leading-6">{t("privacy.manage.reviewDescription")}</p>
      </section>

      {requestResult.error ? (
        <section className="notice-box notice-danger" role="alert">
          {t("privacy.requests.errors.loadFailed")}
        </section>
      ) : requests.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {requests.map((request) => (
            <article className="section-card section-card-padded min-w-0" key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {requestTypeLabel(request.request_type, t)}
                  </p>
                  <h2 className="mt-1 break-words text-base font-bold text-slate-950">
                    {requesterNames.get(request.requester_profile_id) ?? t("privacy.manage.requesterUnavailable")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTime(request.created_at, locale)}
                  </p>
                </div>
                <StatusBadge status={request.status}>
                  {requestStatusLabel(request.status, t)}
                </StatusBadge>
              </div>
              {request.details ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {request.details}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {t("privacy.manage.noDetails")}
                </p>
              )}
              {request.response_summary ? (
                <div className="notice-box mt-3">
                  <p className="text-sm leading-6">{request.response_summary}</p>
                </div>
              ) : null}
              {!terminalStatuses.has(request.status) ? (
                <ProcessRequestForm
                  labels={{
                    response: t("privacy.manage.fields.response"),
                    responseHelp: t("privacy.manage.fields.responseHelp"),
                    save: t("privacy.manage.actions.save"),
                    saving: t("common.saving"),
                    status: t("privacy.manage.fields.status"),
                  }}
                  requestId={request.id}
                  statuses={processingOptions(request.status, t)}
                />
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          description={t("privacy.manage.emptyDescription")}
          title={t("privacy.manage.emptyTitle")}
        />
      )}
    </div>
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

function processingOptions(current: string, t: (key: string) => string) {
  const optionsByStatus: Record<string, string[]> = {
    acknowledged: ["under_review", "action_required", "completed", "denied_with_reason"],
    action_required: ["under_review", "completed", "denied_with_reason"],
    submitted: ["acknowledged", "under_review", "action_required", "completed", "denied_with_reason"],
    under_review: ["action_required", "completed", "denied_with_reason"],
  };

  return (optionsByStatus[current] ?? []).map((status) => ({
    label: requestStatusLabel(status, t),
    value: status,
  }));
}
