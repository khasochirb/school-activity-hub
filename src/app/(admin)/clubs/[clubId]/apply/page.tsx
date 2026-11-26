import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { getClubAccess } from "@/lib/clubs/club-access";
import { isUuid } from "@/lib/clubs/club-profile";
import type { JoinAnswer, JoinQuestion } from "@/lib/clubs/join-form";
import { formatDate } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead } from "../../../_components/clean-ui";
import { withdrawJoinRequest } from "../../join-actions";
import { AnswerList } from "../applications/answer-list";
import { ApplyForm } from "./apply-form";

export default async function ApplyToClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await requireActiveSchoolProfile();

  if (!isUuid(clubId)) notFound();
  if (profile.role !== "student") redirect(`/clubs/${clubId}`);

  const admin = createAdminClient();
  const access = await getClubAccess(admin, profile, clubId);

  if (!access || access.club.status !== "active") notFound();
  if (access.isMember || access.club.join_mode !== "apply") redirect(`/clubs/${clubId}`);

  const [{ data: questions }, { data: pending }] = await Promise.all([
    admin
      .from("club_join_questions")
      .select("id, prompt, kind, options, required")
      .eq("club_id", clubId)
      .order("position")
      .returns<Array<JoinQuestion & { id: string }>>(),
    access.rosterId
      ? admin
          .from("club_join_requests")
          .select("id, answers, created_at")
          .eq("club_id", clubId)
          .eq("student_roster_id", access.rosterId)
          .eq("status", "pending")
          .maybeSingle<{ answers: JoinAnswer[]; created_at: string; id: string }>()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="cl-page">
      <Link className="cl-back" href={`/clubs/${clubId}`}>
        ← {access.club.name}
      </Link>
      <PageHead
        subtitle={t("clubs.join.apply.subtitle")}
        title={`${t("clubs.join.apply.title")}: ${access.club.name}`}
      />
      <div className="cl-card join-card">
        {!access.rosterId ? (
          <p className="notice-box notice-warning">{t("clubs.join.errors.noRoster")}</p>
        ) : pending ? (
          <>
            <div className="join-sent">
              <b>{t("clubs.join.apply.sentTitle")}</b>
              <span>
                {t("clubs.join.apply.sentText")} · {formatDate(pending.created_at, locale)}
              </span>
            </div>
            <AnswerList answers={pending.answers} emptyLabel={t("clubs.join.review.noAnswers")} />
            <form action={withdrawJoinRequest}>
              <input name="request_id" type="hidden" value={pending.id} />
              <PendingSubmitButton className="btn btn-quiet" pendingLabel={t("clubs.join.apply.withdrawing")}>
                {t("clubs.join.apply.withdraw")}
              </PendingSubmitButton>
            </form>
          </>
        ) : (
          <ApplyForm
            clubId={clubId}
            labels={{
              intro: t("clubs.join.apply.intro"),
              noQuestions: t("clubs.join.apply.noQuestions"),
              optional: t("clubs.join.apply.optional"),
              send: t("clubs.join.apply.send"),
              sending: t("clubs.join.apply.sending"),
            }}
            questions={questions ?? []}
          />
        )}
      </div>
    </div>
  );
}
