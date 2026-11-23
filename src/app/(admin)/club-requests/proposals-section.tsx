import "server-only";

import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { FounderPicker, type FounderPickerLabels } from "./founder-picker";
import {
  addProposalFounders,
  respondToFounderInvite,
  withdrawProposal,
} from "./proposal-actions";
import {
  FOUNDERS_REQUIRED,
  MAX_FOUNDERS,
  founderDisplayName,
  type FounderStatus,
} from "./proposal-rules";

type Admin = ReturnType<typeof createAdminClient>;

export type FounderSummary = {
  homeroom: string | null;
  isProposer: boolean;
  name: string;
  profileId: string;
  status: FounderStatus;
};

type Translate = (key: string) => string;

// Founders of the given proposals with display names. Read with the service
// role: students may not read other students' names, and only founders of a
// proposal (or staff) are ever shown this.
export async function getFoundersByRequest(admin: Admin, requestIds: string[]) {
  const byRequest = new Map<string, FounderSummary[]>();

  if (!requestIds.length) return byRequest;

  const { data: founders } = await admin
    .from("club_request_founders")
    .select("club_request_id, profile_id, status, is_proposer, school_id")
    .in("club_request_id", requestIds)
    .order("created_at", { ascending: true })
    .returns<Array<{ club_request_id: string; is_proposer: boolean; profile_id: string; school_id: string; status: FounderStatus }>>();
  const profileIds = Array.from(new Set((founders ?? []).map((f) => f.profile_id)));
  const { data: rosters } = profileIds.length
    ? await admin
        .from("student_rosters")
        .select("profile_id, first_name, last_name, preferred_name, homeroom")
        .in("profile_id", profileIds)
        .returns<Array<{ first_name: string; homeroom: string | null; last_name: string; preferred_name: string | null; profile_id: string }>>()
    : { data: [] };
  const rosterByProfile = new Map((rosters ?? []).map((roster) => [roster.profile_id, roster]));

  (founders ?? []).forEach((founder) => {
    const roster = rosterByProfile.get(founder.profile_id);
    const list = byRequest.get(founder.club_request_id) ?? [];

    list.push({
      homeroom: roster?.homeroom ?? null,
      isProposer: founder.is_proposer,
      name: roster ? founderDisplayName(roster) : "—",
      profileId: founder.profile_id,
      status: founder.status,
    });
    byRequest.set(founder.club_request_id, list);
  });

  return byRequest;
}

export function FounderList({ founders, t }: { founders: FounderSummary[]; t: Translate }) {
  return (
    <ul className="founder-list">
      {founders.map((founder) => (
        <li data-status={founder.status} key={founder.profileId}>
          <span aria-hidden="true" className="founder-avatar">
            {initials(founder.name)}
          </span>
          <span className="founder-name">
            <b>{founder.name}</b>
            <small>
              {[founder.homeroom, founder.isProposer ? t("clubRequests.proposal.proposer") : null]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </span>
          <span className="founder-pill">{t(`clubRequests.proposal.founderStatus.${founder.status}`)}</span>
        </li>
      ))}
    </ul>
  );
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

// "Your club proposals": every proposal the student founded or was tagged in
// that is still gathering founders or waiting for the school admin.
export async function MyProposals({
  pickerLabels,
  profileId,
  schoolId,
  t,
  tf,
}: {
  pickerLabels: FounderPickerLabels;
  profileId: string;
  schoolId: string;
  t: Translate;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const admin = createAdminClient();
  const { data: mine } = await admin
    .from("club_request_founders")
    .select("club_request_id")
    .eq("profile_id", profileId)
    .eq("school_id", schoolId)
    .neq("status", "declined")
    .returns<Array<{ club_request_id: string }>>();
  const requestIds = (mine ?? []).map((row) => row.club_request_id);

  if (!requestIds.length) return null;

  const { data: requests } = await admin
    .from("club_requests")
    .select("id, title, description, reason, status, created_by_profile_id")
    .in("id", requestIds)
    .eq("school_id", schoolId)
    .in("status", ["gathering", "pending"])
    .order("created_at", { ascending: false })
    .returns<Array<{ created_by_profile_id: string; description: string | null; id: string; reason: string | null; status: "gathering" | "pending"; title: string }>>();

  if (!requests?.length) return null;

  const foundersByRequest = await getFoundersByRequest(admin, requests.map((request) => request.id));
  const needsAnswer = (requestId: string, status: string) =>
    status === "gathering" &&
    foundersByRequest.get(requestId)?.find((founder) => founder.profileId === profileId)?.status === "invited";
  // Invitations waiting for this student's answer come first.
  const ordered = [...requests].sort(
    (a, b) => Number(needsAnswer(b.id, b.status)) - Number(needsAnswer(a.id, a.status)),
  );
  const waiting = ordered.filter((request) => needsAnswer(request.id, request.status)).length;

  return (
    <section className="proposals" aria-labelledby="my-proposals-title">
      <header className="proposals-head">
        <h2 id="my-proposals-title">{t("clubRequests.proposal.mineTitle")}</h2>
        {waiting ? (
          <span className="proposals-badge">{tf("clubRequests.proposal.needsAnswer", { count: waiting })}</span>
        ) : null}
      </header>
      {ordered.map((request) => {
        const founders = foundersByRequest.get(request.id) ?? [];
        const proposer = founders.find((founder) => founder.isProposer);
        const isProposer = request.created_by_profile_id === profileId;
        const confirmed = founders.filter((f) => f.status === "confirmed").length;
        const active = founders.filter((f) => f.status !== "declined").length;
        const invited = needsAnswer(request.id, request.status);
        const percent = Math.min(100, Math.round((confirmed / FOUNDERS_REQUIRED) * 100));

        return (
          <article
            className="cl-card proposal-card"
            data-needs-answer={invited ? "" : undefined}
            id={`proposal-${request.id}`}
            key={request.id}
          >
            {invited ? (
              <div className="proposal-invite">
                <div className="min-w-0">
                  <b>{tf("clubRequests.proposal.invitedBy", { proposer: proposer?.name ?? "" })}</b>
                  <span>{t("clubRequests.proposal.inviteHint")}</span>
                </div>
                <div className="proposal-invite-actions">
                  <form action={respondToFounderInvite}>
                    <input name="club_request_id" type="hidden" value={request.id} />
                    <input name="answer" type="hidden" value="confirm" />
                    <PendingSubmitButton className="btn btn-primary" pendingLabel={t("clubRequests.proposal.confirming")}>
                      {t("clubRequests.proposal.confirm")}
                    </PendingSubmitButton>
                  </form>
                  <form action={respondToFounderInvite}>
                    <input name="club_request_id" type="hidden" value={request.id} />
                    <input name="answer" type="hidden" value="decline" />
                    <PendingSubmitButton className="btn btn-secondary" pendingLabel={t("clubRequests.proposal.declining")}>
                      {t("clubRequests.proposal.decline")}
                    </PendingSubmitButton>
                  </form>
                </div>
              </div>
            ) : null}

            <div className="proposal-head">
              <h3>{request.title}</h3>
              <span className="cl-tag" data-tone={request.status === "pending" ? "ok" : "warn"}>
                {request.status === "pending"
                  ? t("clubRequests.proposal.withAdmin")
                  : t("clubRequests.proposal.gathering")}
              </span>
            </div>

            {request.description ? <p className="proposal-desc">{request.description}</p> : null}
            {request.reason ? (
              <blockquote className="proposal-why">
                <span>{t("clubRequests.proposal.why")}</span>
                {request.reason}
              </blockquote>
            ) : null}

            <div className="proposal-progress">
              <div
                aria-label={tf("clubRequests.proposal.progress", { confirmed, required: FOUNDERS_REQUIRED })}
                aria-valuemax={FOUNDERS_REQUIRED}
                aria-valuemin={0}
                aria-valuenow={Math.min(confirmed, FOUNDERS_REQUIRED)}
                className="proposal-bar"
                role="progressbar"
              >
                <i style={{ width: `${percent}%` }} />
              </div>
              <span>{tf("clubRequests.proposal.progress", { confirmed, required: FOUNDERS_REQUIRED })}</span>
            </div>

            <FounderList founders={founders} t={t} />

            {isProposer && request.status === "gathering" && active < MAX_FOUNDERS ? (
              <form action={addProposalFounders} className="proposal-add">
                <input name="club_request_id" type="hidden" value={request.id} />
                <p>{t("clubRequests.proposal.addMoreHint")}</p>
                <FounderPicker labels={pickerLabels} max={MAX_FOUNDERS - active} min={1} />
                <PendingSubmitButton className="btn btn-secondary w-full sm:w-auto" pendingLabel={t("clubRequests.proposal.adding")}>
                  {t("clubRequests.proposal.addMore")}
                </PendingSubmitButton>
              </form>
            ) : null}

            {isProposer ? (
              <form action={withdrawProposal} className="proposal-foot">
                <input name="club_request_id" type="hidden" value={request.id} />
                <PendingSubmitButton className="btn btn-quiet" pendingLabel={t("clubRequests.proposal.withdrawing")}>
                  {t("clubRequests.proposal.withdraw")}
                </PendingSubmitButton>
              </form>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
