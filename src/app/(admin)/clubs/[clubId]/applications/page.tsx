import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { getClubAccess } from "@/lib/clubs/club-access";
import { isUuid } from "@/lib/clubs/club-profile";
import type { JoinAnswer, JoinQuestion } from "@/lib/clubs/join-form";
import { formatDate } from "@/lib/i18n/date-format";
import { formatTranslation, getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead } from "../../../_components/clean-ui";
import { LEAVE_REASONS, type LeaveReason } from "@/lib/clubs/leave-form";
import { decideJoinRequest } from "../../join-actions";
import { decideLeaveRequest } from "../../leave-actions";
import { AnswerList } from "./answer-list";
import { LeaveAnswers } from "./leave-answers";
import { JoinFormBuilder } from "./join-form-builder";

type LeaveRequestRow = {
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  feedback: string | null;
  id: string;
  profile_id: string;
  reason: string;
  reason_kind: LeaveReason;
  status: "approved" | "pending" | "rejected" | "withdrawn";
  student_roster_id: string;
};

type JoinRequestRow = {
  answers: JoinAnswer[];
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  id: string;
  status: "approved" | "pending" | "rejected" | "withdrawn";
  student_roster_id: string;
};

// Join requests and the application form of one club. Open to the club
// leader, the supervising teacher and school admins; everyone else gets 404.
export default async function ClubApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ clubId }, { tab }] = await Promise.all([params, searchParams]);
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const profile = await requireActiveSchoolProfile();

  if (!isUuid(clubId)) notFound();

  const admin = createAdminClient();
  const access = await getClubAccess(admin, profile, clubId);

  if (!access?.canReview) notFound();

  const view = tab === "form" ? "form" : tab === "leaving" ? "leaving" : "requests";
  const [{ data: requests }, { data: questions }, { data: leaveRequests }] = await Promise.all([
    admin
      .from("club_join_requests")
      .select("id, student_roster_id, status, answers, decision_note, decided_at, created_at")
      .eq("club_id", clubId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<JoinRequestRow[]>(),
    admin
      .from("club_join_questions")
      .select("id, prompt, kind, options, required")
      .eq("club_id", clubId)
      .order("position")
      .returns<Array<JoinQuestion & { id: string }>>(),
    admin
      .from("club_leave_requests")
      .select("id, student_roster_id, profile_id, status, reason_kind, reason, feedback, decision_note, decided_at, created_at")
      .eq("club_id", clubId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<LeaveRequestRow[]>(),
  ]);
  const rows = requests ?? [];
  const leaves = leaveRequests ?? [];
  const pendingLeaves = leaves.filter((row) => row.status === "pending").reverse();
  const decidedLeaves = leaves.filter((row) => row.status !== "pending").slice(0, 30);
  const reasonLabel = (kind: LeaveReason) =>
    LEAVE_REASONS.includes(kind) ? t(`clubs.leave.reasons.${kind}`) : kind;
  const pending = rows.filter((row) => row.status === "pending").reverse();
  const decided = rows.filter((row) => row.status !== "pending").slice(0, 30);
  const rosterIds = Array.from(
    new Set([...rows, ...leaves].map((row) => row.student_roster_id)),
  );
  const { data: rosters } = rosterIds.length
    ? await admin
        .from("student_rosters")
        .select("id, first_name, last_name, preferred_name, homeroom")
        .in("id", rosterIds)
        .returns<Array<{ first_name: string; homeroom: string | null; id: string; last_name: string; preferred_name: string | null }>>()
    : { data: [] };
  const rosterById = new Map((rosters ?? []).map((roster) => [roster.id, roster]));
  const nameOf = (rosterId: string) => {
    const roster = rosterById.get(rosterId);

    return roster ? `${roster.preferred_name?.trim() || roster.first_name} ${roster.last_name}`.trim() : "—";
  };
  const classOf = (rosterId: string) => rosterById.get(rosterId)?.homeroom ?? null;

  return (
    <div className="cl-page">
      <Link className="cl-back" href={`/clubs/${clubId}`}>
        ← {access.club.name}
      </Link>
      <PageHead
        subtitle={
          access.club.join_mode === "apply"
            ? t("clubs.join.review.subtitleApply")
            : t("clubs.join.review.subtitleOpen")
        }
        title={`${t("clubs.join.review.title")}: ${access.club.name}`}
      />

      <nav aria-label={t("clubs.join.review.title")} className="cl-filters">
        <Link
          aria-current={view === "requests" ? "page" : undefined}
          className="cl-chip"
          href={`/clubs/${clubId}/applications`}
          scroll={false}
        >
          {t("clubs.join.review.tabRequests")}
          {pending.length ? <span className="cl-chip-count">{pending.length}</span> : null}
        </Link>
        <Link
          aria-current={view === "leaving" ? "page" : undefined}
          className="cl-chip"
          href={`/clubs/${clubId}/applications?tab=leaving`}
          scroll={false}
        >
          {t("clubs.leave.review.tab")}
          {pendingLeaves.length ? <span className="cl-chip-count">{pendingLeaves.length}</span> : null}
        </Link>
        <Link
          aria-current={view === "form" ? "page" : undefined}
          className="cl-chip"
          href={`/clubs/${clubId}/applications?tab=form`}
          scroll={false}
        >
          {t("clubs.join.review.tabForm")}
        </Link>
      </nav>

      {view === "form" ? (
        <div className="cl-card join-card">
          <JoinFormBuilder
            clubId={clubId}
            initialMode={access.club.join_mode}
            initialQuestions={questions ?? []}
            labels={{
              addOption: t("clubs.join.builder.addOption"),
              addQuestion: t("clubs.join.builder.addQuestion"),
              apply: t("clubs.join.builder.apply"),
              applyHint: t("clubs.join.builder.applyHint"),
              delete: t("clubs.join.builder.delete"),
              empty: t("clubs.join.builder.empty"),
              kinds: {
                checkbox: t("clubs.join.kinds.checkbox"),
                choice: t("clubs.join.kinds.choice"),
                long: t("clubs.join.kinds.long"),
                short: t("clubs.join.kinds.short"),
              },
              mode: t("clubs.join.builder.mode"),
              moveDown: t("clubs.join.builder.moveDown"),
              moveUp: t("clubs.join.builder.moveUp"),
              open: t("clubs.join.builder.open"),
              openHint: t("clubs.join.builder.openHint"),
              option: t("clubs.join.builder.option"),
              optionPlaceholder: t("clubs.join.builder.option"),
              prompt: t("clubs.join.builder.prompt"),
              promptPlaceholder: t("clubs.join.builder.promptPlaceholder"),
              questions: t("clubs.join.builder.questions"),
              questionsHint: t("clubs.join.builder.questionsHint"),
              removeOption: t("clubs.join.builder.removeOption"),
              required: t("clubs.join.builder.required"),
              save: t("clubs.join.builder.save"),
              saving: t("clubs.join.builder.saving"),
              type: t("clubs.join.builder.type"),
            }}
          />
        </div>
      ) : view === "leaving" ? (
        <>
          {pendingLeaves.length ? (
            <div className="join-requests">
              {pendingLeaves.map((request) => (
                <article className="cl-card join-request" key={request.id}>
                  <header>
                    <span aria-hidden="true" className="founder-avatar">
                      {initials(nameOf(request.student_roster_id))}
                    </span>
                    <span className="min-w-0">
                      <b>{nameOf(request.student_roster_id)}</b>
                      <small>
                        {[classOf(request.student_roster_id), formatDate(request.created_at, locale)]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                  </header>
                  <LeaveAnswers
                    feedback={request.feedback}
                    labels={{ feedback: t("clubs.leave.feedback"), reason: t("clubs.leave.review.reason") }}
                    reason={request.reason}
                    reasonLabel={reasonLabel(request.reason_kind)}
                  />
                  {request.profile_id === profile.id ? (
                    <p className="join-answers-empty">{t("clubs.leave.review.ownRequest")}</p>
                  ) : (
                    <div className="join-decide">
                      <form action={decideLeaveRequest}>
                        <input name="request_id" type="hidden" value={request.id} />
                        <input name="decision" type="hidden" value="approve" />
                        <PendingSubmitButton className="btn btn-primary min-h-11" pendingLabel={t("clubs.join.review.approving")}>
                          {t("clubs.leave.review.approve")}
                        </PendingSubmitButton>
                      </form>
                      <details className="cl-decline">
                        <summary className="btn btn-quiet min-h-11">{t("clubs.leave.review.keep")}…</summary>
                        <form action={decideLeaveRequest} className="mt-3 flex max-w-xl flex-col gap-3">
                          <input name="request_id" type="hidden" value={request.id} />
                          <input name="decision" type="hidden" value="reject" />
                          <label className="flex flex-col gap-2 text-sm font-medium">
                            {t("clubs.leave.review.keepNote")}
                            <textarea
                              className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
                              maxLength={1000}
                              name="note"
                              required
                            />
                          </label>
                          <PendingSubmitButton
                            className="btn btn-secondary min-h-9 w-full px-3 sm:w-fit"
                            pendingLabel={t("clubs.join.review.rejecting")}
                          >
                            {t("clubs.leave.review.keep")}
                          </PendingSubmitButton>
                        </form>
                      </details>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="cl-card cl-empty">
              <b className="block text-[var(--foreground)]">{t("clubs.leave.review.emptyTitle")}</b>
              <p className="mt-1">{t("clubs.leave.review.emptyText")}</p>
            </div>
          )}

          {decidedLeaves.length ? (
            <section className="join-history">
              <h2>{t("clubs.join.review.history")}</h2>
              <ul>
                {decidedLeaves.map((request) => (
                  <li key={request.id}>
                    <span className="min-w-0">
                      <b>{nameOf(request.student_roster_id)}</b>
                      <small>
                        {[reasonLabel(request.reason_kind), request.decided_at ? formatDate(request.decided_at, locale) : null]
                          .filter(Boolean)
                          .join(" · ")}
                        {request.feedback ? ` · “${request.feedback}”` : ""}
                      </small>
                    </span>
                    <span className="cl-tag" data-tone={request.status === "approved" ? "ok" : "warn"}>
                      {t(`clubs.leave.status.${request.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <>
          {access.club.join_mode === "open" ? (
            <p className="notice-box notice-info">
              {t("clubs.join.review.openNotice")}{" "}
              <Link href={`/clubs/${clubId}/applications?tab=form`}>{t("clubs.join.review.openNoticeLink")}</Link>
            </p>
          ) : null}

          {pending.length ? (
            <div className="join-requests">
              {pending.map((request) => (
                <article className="cl-card join-request" key={request.id}>
                  <header>
                    <span aria-hidden="true" className="founder-avatar">
                      {initials(nameOf(request.student_roster_id))}
                    </span>
                    <span className="min-w-0">
                      <b>{nameOf(request.student_roster_id)}</b>
                      <small>
                        {[classOf(request.student_roster_id), formatDate(request.created_at, locale)]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                  </header>
                  <AnswerList answers={request.answers} emptyLabel={t("clubs.join.review.noAnswers")} />
                  <div className="join-decide">
                    <form action={decideJoinRequest}>
                      <input name="request_id" type="hidden" value={request.id} />
                      <input name="decision" type="hidden" value="approve" />
                      <PendingSubmitButton className="btn btn-primary min-h-11" pendingLabel={t("clubs.join.review.approving")}>
                        {t("clubs.join.review.approve")}
                      </PendingSubmitButton>
                    </form>
                    <details className="cl-decline">
                      <summary className="btn btn-quiet min-h-11">{t("clubs.join.review.reject")}…</summary>
                      <form action={decideJoinRequest} className="mt-3 flex max-w-xl flex-col gap-3">
                        <input name="request_id" type="hidden" value={request.id} />
                        <input name="decision" type="hidden" value="reject" />
                        <label className="flex flex-col gap-2 text-sm font-medium">
                          {t("clubs.join.review.rejectNote")}
                          <textarea
                            className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
                            maxLength={1000}
                            name="note"
                          />
                        </label>
                        <PendingSubmitButton
                          className="btn btn-secondary min-h-9 w-full px-3 sm:w-fit"
                          pendingLabel={t("clubs.join.review.rejecting")}
                        >
                          {t("clubs.join.review.reject")}
                        </PendingSubmitButton>
                      </form>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="cl-card cl-empty">
              <b className="block text-[var(--foreground)]">{t("clubs.join.review.emptyTitle")}</b>
              <p className="mt-1">{t("clubs.join.review.emptyText")}</p>
            </div>
          )}

          {decided.length ? (
            <section className="join-history">
              <h2>{t("clubs.join.review.history")}</h2>
              <ul>
                {decided.map((request) => (
                  <li key={request.id}>
                    <span className="min-w-0">
                      <b>{nameOf(request.student_roster_id)}</b>
                      <small>
                        {[classOf(request.student_roster_id), request.decided_at ? formatDate(request.decided_at, locale) : null]
                          .filter(Boolean)
                          .join(" · ")}
                        {request.decision_note ? ` · “${request.decision_note}”` : ""}
                      </small>
                    </span>
                    <span className="cl-tag" data-tone={request.status === "approved" ? "ok" : "warn"}>
                      {t(`clubs.join.status.${request.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      <p className="sr-only">{tf("clubs.join.review.pendingCount", { count: pending.length })}</p>
    </div>
  );
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
