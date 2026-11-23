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
          <span>
            {founder.name}
            {founder.homeroom ? <small> · {founder.homeroom}</small> : null}
            {founder.isProposer ? <small> · {t("clubRequests.proposal.proposer")}</small> : null}
          </span>
          <span className="founder-status">{t(`clubRequests.proposal.founderStatus.${founder.status}`)}</span>
        </li>
      ))}
    </ul>
  );
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
    .select("id, title, reason, status, created_by_profile_id")
    .in("id", requestIds)
    .eq("school_id", schoolId)
    .in("status", ["gathering", "pending"])
    .order("created_at", { ascending: false })
    .returns<Array<{ created_by_profile_id: string; id: string; reason: string | null; status: "gathering" | "pending"; title: string }>>();

  if (!requests?.length) return null;

  const foundersByRequest = await getFoundersByRequest(admin, requests.map((request) => request.id));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">{t("clubRequests.proposal.mineTitle")}</h2>
      {requests.map((request) => {
        const founders = foundersByRequest.get(request.id) ?? [];
        const me = founders.find((founder) => founder.profileId === profileId);
        const isProposer = request.created_by_profile_id === profileId;
        const confirmed = founders.filter((f) => f.status === "confirmed").length;
        const active = founders.filter((f) => f.status !== "declined").length;

        return (
          <article className="cl-card proposal-card" id={`proposal-${request.id}`} key={request.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="cl-tag" data-tone={request.status === "pending" ? "ok" : "warn"}>
                {request.status === "pending"
                  ? t("clubRequests.proposal.withAdmin")
                  : tf("clubRequests.proposal.progress", { confirmed, required: FOUNDERS_REQUIRED })}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold leading-snug">{request.title}</h3>
            {request.reason ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <b>{t("clubRequests.proposal.why")}</b> {request.reason}
              </p>
            ) : null}
            <FounderList founders={founders} t={t} />

            {me?.status === "invited" && request.status === "gathering" ? (
              <div className="mt-3 flex flex-wrap gap-2">
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
            ) : null}

            {isProposer && request.status === "gathering" && active < MAX_FOUNDERS ? (
              <form action={addProposalFounders} className="mt-3 flex flex-col gap-2">
                <input name="club_request_id" type="hidden" value={request.id} />
                <p className="text-sm text-slate-600">{t("clubRequests.proposal.addMoreHint")}</p>
                <FounderPicker labels={pickerLabels} max={MAX_FOUNDERS - active} min={1} />
                <PendingSubmitButton className="btn btn-secondary w-full sm:w-auto" pendingLabel={t("clubRequests.proposal.adding")}>
                  {t("clubRequests.proposal.addMore")}
                </PendingSubmitButton>
              </form>
            ) : null}

            {isProposer ? (
              <form action={withdrawProposal} className="mt-3">
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
