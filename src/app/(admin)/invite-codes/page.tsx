import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  getPageParam,
  getSearchParam,
  pageRange,
  pageRows,
} from "@/lib/list-filters";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";
import {
  CollapsibleFormSection,
  EmptyState,
  FormSectionToggleButton,
  NoResultsState,
  PaginationControls,
} from "../_components/page-ui";
import Link from "next/link";
import { ActionMenu } from "../_components/action-menu";
import { PageHead, Widget } from "../_components/clean-ui";
import { revokeInviteCode } from "./actions";
import { BulkGenerateInviteForm } from "./bulk-generate-invite-form";
import { GenerateInviteForm } from "./generate-invite-form";

type StaffProfile = {
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type ActiveStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom: string | null;
  profile_id: string | null;
  student_number: string | null;
};

type InviteCode = {
  id: string;
  student_roster_id: string | null;
  status: string;
  use_count: number;
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
};

type InviteCodesSearchParams = {
  page?: string | string[];
  status?: string | string[];
};

const INVITE_CODES_PAGE_SIZE = 50;

export default async function InviteCodesPage({
  searchParams,
}: {
  searchParams: Promise<InviteCodesSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const selectedStatus = parseInviteStatusFilter(getSearchParam(params.status));
  const page = getPageParam(params.page);
  const range = pageRange(page, INVITE_CODES_PAGE_SIZE);
  const now = new Date().toISOString();
  const supabase = await createClient();
  const user = await timeServer("invite-codes.query.auth-get-user", () =>
    getCurrentUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("invite-codes.query.profile", () =>
    supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .maybeSingle<StaffProfile>(),
  );

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  let inviteHistoryQuery = supabase
    .from("invite_codes")
    .select(
      "id, student_roster_id, status, use_count, created_at, expires_at, redeemed_at",
    )
    .eq("school_id", profile.school_id);

  if (selectedStatus === "expired") {
    inviteHistoryQuery = inviteHistoryQuery
      .eq("status", "active")
      .lt("expires_at", now);
  } else if (selectedStatus === "active") {
    inviteHistoryQuery = inviteHistoryQuery
      .eq("status", "active")
      .gte("expires_at", now);
  } else if (selectedStatus) {
    inviteHistoryQuery = inviteHistoryQuery.eq("status", selectedStatus);
  }

  const [{ data: activeStudents, error: studentsError }, { data: inviteCodes, error: invitesError }] =
    await Promise.all([
      timeServer("invite-codes.query.active-students", () =>
        supabase
          .from("student_rosters")
          .select(
            "id, first_name, last_name, grade_level, homeroom, profile_id, student_number",
          )
          .eq("school_id", profile.school_id)
          .eq("status", "active")
          .order("last_name", { ascending: true })
          .returns<ActiveStudent[]>(),
      ),
      timeServer("invite-codes.query.invite-history", () =>
        inviteHistoryQuery
          .order("created_at", { ascending: false })
          .range(range.from, range.to)
          .returns<InviteCode[]>(),
      ),
    ]);

  const studentMap = new Map(
    (activeStudents ?? []).map((student) => [student.id, student]),
  );
  const { hasNextPage, rows: inviteHistory } = pageRows(
    inviteCodes,
    INVITE_CODES_PAGE_SIZE,
  );
  const filteredInviteCodes = inviteHistory;
  const activeRoster = activeStudents ?? [];
  const waitingStudents = activeRoster.filter((student) => !student.profile_id);
  const joinedCount = activeRoster.length - waitingStudents.length;
  const joinedPercent = activeRoster.length
    ? Math.round((joinedCount / activeRoster.length) * 100)
    : 0;

  return (
    <div className="cl-page">
      <PageHead
        action={
          <ActionMenu
            buttonClassName="btn btn-primary min-h-11 gap-1.5"
            buttonLabel={<>+ {t("invites.list.generate")}</>}
            items={[
              { href: "#generate-invite", label: t("invites.actions.generate") },
              { href: "#bulk-generate", label: t("invites.actions.bulkGenerateShort") },
            ]}
            label={t("invites.list.generate")}
          />
        }
        subtitle={tf("invites.list.subtitle", {
          joined: joinedCount,
          total: activeRoster.length,
          waiting: waitingStudents.length,
        })}
        title={t("invites.title")}
      />

      {waitingStudents.length ? (
        <div className="cl-card cl-invite-banner">
          <div className="min-w-0">
            <b>{tf("invites.list.waitingTitle", { count: waitingStudents.length })}</b>
            <p>{t("invites.list.waitingHelp")}</p>
          </div>
          <Link className="cl-btn-soft min-h-11" href="#bulk-generate" prefetch={false}>
            {t("invites.actions.bulkGenerateShort")}
          </Link>
        </div>
      ) : null}

      <CollapsibleFormSection
        description={t("invites.single.description")}
        hideLabel={t("common.hideForm")}
        id="generate-invite"
        showLabel={t("common.showForm")}
        title={t("invites.single.title")}
      >
        {studentsError ? (
          <p className="mt-2 text-sm text-red-600">
            {tf("invites.errors.studentsLoadFailed", {
              error: t("common.somethingWentWrong"),
            })}
          </p>
        ) : null}
        <GenerateInviteForm
          labels={{
            chooseStudent: t("invites.single.chooseStudent"),
            generate: t("invites.actions.generate"),
            generating: t("invites.actions.generating"),
            gradeOption: t("invites.single.gradeOption"),
            noStudents: t("invites.single.noStudents"),
            plainCodeLabel: t("invites.single.plainCodeLabel"),
            studentLabel: t("invites.single.studentLabel"),
          }}
          students={activeStudents ?? []}
        />
      </CollapsibleFormSection>

      <CollapsibleFormSection
        description={t("invites.bulk.description")}
        hideLabel={t("common.hideForm")}
        id="bulk-generate"
        showLabel={t("common.showForm")}
        title={t("invites.bulk.title")}
      >
        {studentsError ? (
          <p className="mt-2 text-sm text-red-600">
            {tf("invites.errors.studentsLoadFailed", {
              error: t("common.somethingWentWrong"),
            })}
          </p>
        ) : null}
        <BulkGenerateInviteForm
          labels={{
            allUnlinkedDescription: t(
              "invites.bulk.allUnlinked.description",
            ),
            allUnlinkedLabel: t("invites.bulk.allUnlinked.label"),
            anyClassGroup: t("invites.bulk.filters.anyClassGroup"),
            anyGrade: t("invites.bulk.filters.anyGrade"),
            bulkSubmit: t("invites.bulk.submit"),
            classGroup: t("invites.bulk.filters.classGroup"),
            copyTextList: t("invites.bulk.copyTextList"),
            downloadCsv: t("invites.bulk.downloadCsv"),
            filteredDescription: t("invites.bulk.filtered.description"),
            filteredLabel: t("invites.bulk.filtered.label"),
            generatedTitle: t("invites.bulk.generatedTitle"),
            generating: t("invites.actions.generating"),
            grade: t("invites.bulk.filters.grade"),
            noEligibleStudents: t("invites.bulk.noEligibleStudents"),
            scope: t("invites.bulk.scope"),
            selectedDescription: t("invites.bulk.selected.description"),
            selectedLabel: t("invites.bulk.selected.label"),
            selectStudents: t("invites.bulk.selectStudents"),
            selectStudentsDescription: t(
              "invites.bulk.selectStudentsDescription",
            ),
          }}
          students={activeStudents ?? []}
        />
      </CollapsibleFormSection>

      <nav aria-label={t("filters.status")} className="cl-filters">
        {([
          ["", t("filters.all")],
          ["active", t("status.active")],
          ["redeemed", t("status.redeemed")],
          ["revoked", t("status.revoked")],
          ["expired", t("filters.expired")],
        ] as const).map(([value, label]) => (
          <Link
            aria-current={selectedStatus === value ? "page" : undefined}
            className="cl-chip"
            href={inviteCodesPageHref(1, value)}
            key={value || "all"}
            prefetch={false}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="cl-split">
      <div className="cl-main">

      <section className="cl-sec">
        <header>
          <h2>{t("invites.history.title")}</h2>
        </header>
        {invitesError ? (
          <p className="notice-box notice-warning">
            {tf("invites.errors.codesLoadFailed", {
              error: t("common.somethingWentWrong"),
            })}
          </p>
        ) : null}
        {inviteHistory.length && filteredInviteCodes.length ? (
          <div className="cl-card cl-rows">
            {filteredInviteCodes.map((invite) => {
              const student = studentMap.get(invite.student_roster_id ?? "");
              const name = studentName(student, t);
              const status = inviteDisplayStatus(invite, now);

              return (
                <div className="cl-row" key={invite.id}>
                  <span aria-hidden="true" className="cl-av">
                    {student ? (student.first_name[0] ?? "") + (student.last_name[0] ?? "") : "?"}
                  </span>
                  <span className="cl-grow">
                    <span className="cl-row-title">{name}</span>
                    <span className="cl-row-sub">
                      {[student?.grade_level ? `${t("students.table.grade")} ${student.grade_level}` : null, student?.homeroom]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </span>
                  </span>
                  <span className="cl-row-cols flex-col items-end gap-0 text-right">
                    <span>
                      {invite.redeemed_at
                        ? tf("invites.list.redeemedOn", { date: formatDate(invite.redeemed_at, locale) })
                        : tf("invites.list.expiresOn", { date: formatDate(invite.expires_at, locale) })}
                    </span>
                    <span className="text-[12px]">
                      {tf("invites.list.createdOn", { date: formatDate(invite.created_at, locale) })}
                    </span>
                  </span>
                  <span
                    className="cl-tag"
                    data-tone={status === "active" ? "blue" : status === "redeemed" ? "ok" : status === "revoked" ? "warn" : undefined}
                  >
                    {statusLabel(status, t)}
                  </span>
                  <RevokeForm
                    invite={invite}
                    labels={{
                      alreadyUsedOrInactive: "",
                      cancel: t("common.cancel"),
                      confirm: t("feedback.confirm"),
                      confirmDescription: t("feedback.cannotBeUndone"),
                      confirmRevoke: t("feedback.revokeInviteCode"),
                      revoke: t("invites.actions.revoke"),
                      revoking: t("invites.actions.revoking"),
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : inviteHistory.length && selectedStatus ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/invite-codes"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                <>
                  <FormSectionToggleButton targetId="generate-invite">
                    {t("invites.actions.generate")}
                  </FormSectionToggleButton>
                  <FormSectionToggleButton targetId="bulk-generate" variant="secondary">
                    {t("invites.actions.bulkGenerateShort")}
                  </FormSectionToggleButton>
                </>
              }
              description={t("invites.empty.description")}
              title={t("invites.empty.title")}
            />
          </div>
        )}
        {!invitesError && (filteredInviteCodes.length > 0 || page > 1) ? (
          <PaginationControls
            getHref={(nextPage) =>
              inviteCodesPageHref(nextPage, selectedStatus)
            }
            hasNextPage={hasNextPage}
            labels={{
              next: t("common.next"),
              page: tf("common.pageNumber", { number: page }),
              previous: t("common.previous"),
            }}
            page={page}
          />
        ) : null}
      </section>
      </div>

      <aside className="cl-side">
        <Widget title={t("invites.list.progress")}>
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="cl-ring"
              style={{
                background: `conic-gradient(var(--cl-green) ${joinedPercent * 3.6}deg, var(--card-soft) 0)`,
              }}
            >
              <b>{joinedPercent}%</b>
            </span>
            <p className="text-[13.5px] text-[var(--muted)]">
              {tf("invites.list.progressText", { joined: joinedCount, total: activeRoster.length })}
            </p>
          </div>
        </Widget>
        <Widget
          link={{ href: "/students", label: t("nav.students") }}
          title={t("students.list.notJoinedYet")}
        >
          {waitingStudents.length ? (
            waitingStudents.slice(0, 5).map((student) => (
              <div key={student.id}>
                <b className="block text-sm">
                  {student.first_name} {student.last_name}
                </b>
                <span className="text-[13px] text-[var(--muted)]">
                  {[student.grade_level ? `${t("students.table.grade")} ${student.grade_level}` : null, student.homeroom]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("students.list.everyoneJoined")}</p>
          )}
        </Widget>
      </aside>
      </div>
    </div>
  );
}

function RevokeForm({
  invite,
  labels,
}: {
  invite: InviteCode;
  labels: {
    alreadyUsedOrInactive: string;
    cancel: string;
    confirm: string;
    confirmDescription: string;
    confirmRevoke: string;
    revoke: string;
    revoking: string;
  };
}) {
  const canRevoke =
    invite.status === "active" && invite.use_count === 0 && !invite.redeemed_at;

  if (!canRevoke) {
    return (
      <span className="text-sm text-zinc-500">
        {labels.alreadyUsedOrInactive}
      </span>
    );
  }

  return (
    <form action={revokeInviteCode}>
      <input name="invite_code_id" type="hidden" value={invite.id} />
      <ConfirmSubmitButton
        cancelLabel={labels.cancel}
        className="btn btn-quiet min-h-9 px-3"
        confirmDescription={labels.confirmDescription}
        confirmLabel={labels.confirm}
        confirmTitle={labels.confirmRevoke}
        pendingLabel={labels.revoking}
      >
        {labels.revoke}
      </ConfirmSubmitButton>
    </form>
  );
}

function studentName(student: ActiveStudent | undefined, t: (key: string) => string) {
  return student
    ? `${student.first_name} ${student.last_name}`
    : t("invites.fallback.rosterStudent");
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === "active") {
    return t("status.active");
  }

  if (status === "revoked") {
    return t("status.revoked");
  }

  if (status === "redeemed") {
    return t("status.redeemed");
  }

  if (status === "expired") {
    return t("filters.expired");
  }

  return status;
}

function inviteDisplayStatus(invite: InviteCode, now: string) {
  if (invite.status === "active" && invite.expires_at < now) {
    return "expired";
  }

  return invite.status;
}

function parseInviteStatusFilter(value: string) {
  return ["active", "redeemed", "revoked", "expired"].includes(value)
    ? value
    : "";
}

function inviteCodesPageHref(page: number, selectedStatus: string) {
  const params = new URLSearchParams();

  if (selectedStatus) {
    params.set("status", selectedStatus);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/invite-codes?${query}` : "/invite-codes";
}
