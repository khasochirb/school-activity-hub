import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { getClubAccess } from "@/lib/clubs/club-access";
import { isUuid } from "@/lib/clubs/club-profile";
import { LEAVE_REASONS, type LeaveReason } from "@/lib/clubs/leave-form";
import { formatDate } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead } from "../../../_components/clean-ui";
import { withdrawLeaveRequest } from "../../leave-actions";
import { LeaveAnswers } from "../applications/leave-answers";
import { LeaveForm } from "./leave-form";

type LeaveRow = {
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  feedback: string | null;
  id: string;
  reason: string;
  reason_kind: LeaveReason;
  status: "approved" | "pending" | "rejected" | "withdrawn";
};

export default async function LeaveClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const [{ clubId }, { sent }] = await Promise.all([params, searchParams]);
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await requireActiveSchoolProfile();

  if (!isUuid(clubId)) notFound();
  if (profile.role !== "student") redirect(`/clubs/${clubId}`);

  const admin = createAdminClient();
  const access = await getClubAccess(admin, profile, clubId);

  if (!access) notFound();

  const { data: requests } = access.rosterId
    ? await admin
        .from("club_leave_requests")
        .select("id, status, reason_kind, reason, feedback, decision_note, decided_at, created_at")
        .eq("club_id", clubId)
        .eq("student_roster_id", access.rosterId)
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<LeaveRow[]>()
    : { data: [] as LeaveRow[] };
  const pending = (requests ?? []).find((row) => row.status === "pending");
  const lastDeclined = (requests ?? [])[0]?.status === "rejected" ? requests![0] : null;

  if (!access.isMember && !pending) redirect(`/clubs/${clubId}`);

  const reasons = Object.fromEntries(
    LEAVE_REASONS.map((reason) => [reason, t(`clubs.leave.reasons.${reason}`)]),
  ) as Record<LeaveReason, string>;

  return (
    <div className="cl-page">
      <Link className="cl-back" href={`/clubs/${clubId}`}>
        ← {access.club.name}
      </Link>
      <PageHead
        subtitle={t("clubs.leave.subtitle")}
        title={`${t("clubs.leave.title")}: ${access.club.name}`}
      />
      <div className="cl-card join-card">
        {pending ? (
          <>
            {sent === "1" ? (
              <p className="notice-box notice-success" role="status">
                {t("clubs.leave.sentNotice")}
              </p>
            ) : null}
            <div className="join-sent">
              <b>{t("clubs.leave.sentTitle")}</b>
              <span>
                {t("clubs.leave.sentText")} · {formatDate(pending.created_at, locale)}
              </span>
            </div>
            <LeaveAnswers
              feedback={pending.feedback}
              labels={{ feedback: t("clubs.leave.feedback"), reason: t("clubs.leave.review.reason") }}
              reason={pending.reason}
              reasonLabel={reasons[pending.reason_kind]}
            />
            <form action={withdrawLeaveRequest}>
              <input name="request_id" type="hidden" value={pending.id} />
              <PendingSubmitButton className="btn btn-quiet" pendingLabel={t("clubs.leave.withdrawing")}>
                {t("clubs.leave.withdraw")}
              </PendingSubmitButton>
            </form>
          </>
        ) : (
          <>
            {lastDeclined ? (
              <p className="notice-box notice-warning">
                {t("clubs.leave.lastDeclined")}
                {lastDeclined.decision_note ? ` “${lastDeclined.decision_note}”` : ""}
              </p>
            ) : null}
            <p className="join-apply-intro">{t("clubs.leave.intro")}</p>
            <LeaveForm
              clubId={clubId}
              labels={{
                feedback: t("clubs.leave.feedback"),
                feedbackHint: t("clubs.leave.feedbackHint"),
                optional: t("clubs.join.apply.optional"),
                reason: t("clubs.leave.reason"),
                reasonDetail: t("clubs.leave.reasonDetail"),
                reasonDetailHint: t("clubs.leave.reasonDetailHint"),
                reasons,
                send: t("clubs.leave.send"),
                sending: t("clubs.leave.sending"),
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
