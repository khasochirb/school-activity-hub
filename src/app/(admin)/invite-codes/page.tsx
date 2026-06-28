import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getSearchParam } from "@/lib/list-filters";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";
import {
  CollapsibleFormSection,
  EmptyState,
  DetailsDisclosure,
  FilterPanel,
  HeaderActionLink,
  NoResultsState,
  PageHeader,
  SelectFilter,
  StatusBadge,
} from "../_components/page-ui";
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
  status?: string | string[];
};

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("invite-codes.query.auth-get-user", () =>
    supabase.auth.getUser(),
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
        supabase
          .from("invite_codes")
          .select(
            "id, student_roster_id, status, use_count, created_at, expires_at, redeemed_at",
          )
          .eq("school_id", profile.school_id)
          .order("created_at", { ascending: false })
          .returns<InviteCode[]>(),
      ),
    ]);

  const studentMap = new Map(
    (activeStudents ?? []).map((student) => [student.id, student]),
  );
  const now = new Date().toISOString();
  const inviteHistory = inviteCodes ?? [];
  const filteredInviteCodes = inviteHistory.filter((invite) => {
    if (!selectedStatus) {
      return true;
    }

    return inviteDisplayStatus(invite, now) === selectedStatus;
  });

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <HeaderActionLink href="#generate-invite">
              {t("invites.actions.generate")}
            </HeaderActionLink>
            <HeaderActionLink href="#bulk-generate" variant="secondary">
              {t("invites.actions.bulkGenerateShort")}
            </HeaderActionLink>
          </>
        }
        description={t("invites.description")}
        eyebrow={t("invites.eyebrow")}
        title={t("invites.title")}
      />

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
              error: studentsError.message,
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
              error: studentsError.message,
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

      <FilterPanel
        action="/invite-codes"
        clearHref="/invite-codes"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: filteredInviteCodes.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SelectFilter
          defaultValue={selectedStatus}
          label={t("filters.status")}
          name="status"
          options={[
            { label: t("filters.all"), value: "" },
            { label: t("status.active"), value: "active" },
            { label: t("status.redeemed"), value: "redeemed" },
            { label: t("status.revoked"), value: "revoked" },
            { label: t("filters.expired"), value: "expired" },
          ]}
        />
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {t("invites.history.title")}
          </h2>
          {invitesError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("invites.errors.codesLoadFailed", {
                error: invitesError.message,
              })}
            </p>
          ) : null}
        </div>
        {inviteHistory.length && filteredInviteCodes.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("invites.table.student")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("invites.table.status")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("invites.table.created")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("invites.table.expires")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("invites.table.redeemed")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("invites.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredInviteCodes.map((invite) => (
                    <tr key={invite.id}>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {studentName(
                          studentMap.get(invite.student_roster_id ?? ""),
                          t,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inviteDisplayStatus(invite, now)}>
                          {statusLabel(inviteDisplayStatus(invite, now), t)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(invite.created_at, locale)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(invite.expires_at, locale)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {invite.redeemed_at
                          ? formatDate(invite.redeemed_at, locale)
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <RevokeForm
                          invite={invite}
                          labels={{
                            alreadyUsedOrInactive: t(
                              "invites.actions.alreadyUsedOrInactive",
                            ),
                            revoke: t("invites.actions.revoke"),
                            revoking: t("invites.actions.revoking"),
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-200 md:hidden">
              {filteredInviteCodes.map((invite) => (
                <article className="p-4" key={invite.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {studentName(
                          studentMap.get(invite.student_roster_id ?? ""),
                          t,
                        )}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {t("invites.table.created")}{" "}
                        {formatDate(invite.created_at, locale)}
                      </p>
                    </div>
                    <StatusBadge status={inviteDisplayStatus(invite, now)}>
                      {statusLabel(inviteDisplayStatus(invite, now), t)}
                    </StatusBadge>
                  </div>
                  <DetailsDisclosure label={t("common.viewDetails")}>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-zinc-500">
                          {t("invites.table.expires")}
                        </dt>
                        <dd className="text-zinc-800">
                          {formatDate(invite.expires_at, locale)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">
                          {t("invites.table.redeemed")}
                        </dt>
                        <dd className="text-zinc-800">
                          {invite.redeemed_at
                            ? formatDate(invite.redeemed_at, locale)
                            : "-"}
                        </dd>
                      </div>
                    </dl>
                  </DetailsDisclosure>
                  <div className="mt-4">
                    <RevokeForm
                      invite={invite}
                      labels={{
                        alreadyUsedOrInactive: t(
                          "invites.actions.alreadyUsedOrInactive",
                        ),
                        revoke: t("invites.actions.revoke"),
                        revoking: t("invites.actions.revoking"),
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
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
                  <HeaderActionLink href="#generate-invite">
                    {t("invites.actions.generate")}
                  </HeaderActionLink>
                  <HeaderActionLink href="#bulk-generate" variant="secondary">
                    {t("invites.actions.bulkGenerateShort")}
                  </HeaderActionLink>
                </>
              }
              description={t("invites.empty.description")}
              title={t("invites.empty.title")}
            />
          </div>
        )}
      </section>
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
      <PendingSubmitButton
        className="btn btn-secondary min-h-9 px-3"
        pendingLabel={labels.revoking}
      >
        {labels.revoke}
      </PendingSubmitButton>
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
