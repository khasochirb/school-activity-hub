import "server-only";

import Link from "next/link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import { formatDate } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryLabel } from "../_components/clean-ui";
import { approveClubRequest, rejectClubRequest } from "../club-requests/actions";
import { FounderList, getFoundersByRequest } from "../club-requests/proposals-section";

type Translate = (key: string) => string;

type PendingClubRequest = {
  category: string | null;
  created_at: string;
  description: string | null;
  id: string;
  reason: string | null;
  title: string;
};

// The "New clubs" tab of Approvals: proposals whose founders have all
// confirmed, waiting for the school admin. Teachers can read them; only
// school admins decide (the actions check that again on the server).
export async function ClubApprovals({
  canDecide,
  locale,
  schoolId,
  selectedId,
  t,
  tf,
}: {
  canDecide: boolean;
  locale: Locale;
  schoolId: string;
  selectedId: string;
  t: Translate;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("club_requests")
    .select("id, title, description, reason, category, created_at")
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<PendingClubRequest[]>();
  const requests = data ?? [];

  if (!requests.length) {
    return (
      <div className="cl-card cl-empty">
        <b className="block text-[var(--foreground)]">{t("approvals.clubs.emptyTitle")}</b>
        <p className="mt-1">{t("approvals.clubs.emptyDescription")}</p>
      </div>
    );
  }

  const selected = requests.find((request) => request.id === selectedId) ?? requests[0];
  const foundersByRequest = await getFoundersByRequest(admin, requests.map((request) => request.id));
  const founders = foundersByRequest.get(selected.id) ?? [];
  const { data: advisors } = canDecide
    ? await admin
        .from("profiles")
        .select("id, full_name")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .in("role", ["teacher", "school_admin"])
        .order("full_name")
        .returns<Array<{ full_name: string | null; id: string }>>()
    : { data: [] };
  const categoryName = (category: string | null) =>
    category ? t(getActivityCategoryTranslationKey(category)) : null;

  return (
    <div className="cl-inbox">
      <nav aria-label={t("approvals.tabs.clubs")} className="cl-card cl-rows self-start overflow-hidden">
        {requests.map((request) => (
          <Link
            aria-current={request.id === selected.id ? "page" : undefined}
            className="cl-row cl-inbox-row"
            href={`/approvals?type=clubs&selected=${request.id}`}
            key={request.id}
            prefetch={false}
            scroll={false}
          >
            <span className="cl-grow">
              <span className="cl-row-title">{request.title}</span>
              <span className="cl-row-sub">
                {tf("approvals.clubs.foundersCount", {
                  count: (foundersByRequest.get(request.id) ?? []).filter((f) => f.status === "confirmed").length,
                })}{" "}
                · {formatDate(request.created_at, locale)}
              </span>
            </span>
            <CategoryLabel category={request.category} label={categoryName(request.category)} />
          </Link>
        ))}
      </nav>

      <article className="cl-card proposal-card">
        <div className="proposal-head">
          <div className="min-w-0">
            <CategoryLabel category={selected.category} label={categoryName(selected.category)} />
            <h2 className="mt-2 text-2xl font-bold leading-tight">{selected.title}</h2>
          </div>
          <span className="cl-tag" data-tone="warn">
            {t("clubRequests.status.pendingReview")}
          </span>
        </div>
        {selected.description ? <p className="proposal-desc">{selected.description}</p> : null}
        {selected.reason ? (
          <blockquote className="proposal-why">
            <span>{t("clubRequests.proposal.why")}</span>
            {selected.reason}
          </blockquote>
        ) : null}
        {founders.length ? <FounderList founders={founders} t={t} /> : null}

        {canDecide ? (
          <div className="club-decision">
            <form action={approveClubRequest} className="club-decision-approve">
              <input name="club_request_id" type="hidden" value={selected.id} />
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">
                {t("clubRequests.proposal.advisor")}
                <select
                  className="h-11 cursor-pointer rounded-md border bg-[var(--card)] px-3 text-base font-normal outline-none transition"
                  name="advisor_profile_id"
                  required
                >
                  <option value="">{t("approvals.clubs.chooseTeacher")}</option>
                  {(advisors ?? []).map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name || t("clubRequests.fallback.staff")}
                    </option>
                  ))}
                </select>
              </label>
              <PendingSubmitButton
                className="btn btn-primary min-h-11 px-5"
                pendingLabel={t("clubRequests.actions.approving")}
              >
                {t("approvals.clubs.approve")}
              </PendingSubmitButton>
            </form>
            <details className="cl-decline">
              <summary className="btn btn-quiet min-h-11">{t("approvals.clubs.reject")}…</summary>
              <form action={rejectClubRequest} className="mt-3 flex max-w-xl flex-col gap-3">
                <input name="club_request_id" type="hidden" value={selected.id} />
                <label className="flex flex-col gap-2 text-sm font-medium">
                  {t("clubRequests.fields.rejectionReason")}
                  <textarea className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition" name="rejection_reason" />
                </label>
                <PendingSubmitButton
                  className="btn btn-secondary min-h-9 w-full px-3 sm:w-fit"
                  pendingLabel={t("clubRequests.actions.rejecting")}
                >
                  {t("approvals.clubs.reject")}
                </PendingSubmitButton>
              </form>
            </details>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("approvals.clubs.adminOnly")}</p>
        )}
      </article>
    </div>
  );
}

// How many proposals are waiting, for the tab count.
export async function countPendingClubRequests(schoolId: string) {
  const { count } = await createAdminClient()
    .from("club_requests")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("status", "pending");

  return count ?? 0;
}
