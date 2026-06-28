import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locales";
import { getSearchParam, matchesSearch } from "@/lib/list-filters";
import { createClient } from "@/lib/supabase/server";
import {
  DetailsDisclosure,
  EmptyState,
  FilterPanel,
  NoResultsState,
  PageHeader,
  SearchField,
  SelectFilter,
} from "../_components/page-ui";
import {
  requestSchoolConnection,
  respondToSchoolConnection,
} from "./actions";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type School = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  status: string;
};

type ConnectionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked"
  | "archived";

type SchoolConnection = {
  id: string;
  requester_school_id: string;
  receiver_school_id: string;
  status: ConnectionStatus;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
};

type SearchParams = {
  direction?: string | string[];
  error?: string | string[];
  q?: string | string[];
  status?: string | string[];
  success?: string | string[];
};

export default async function SchoolConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const searchQuery = getSearchParam(params.q);
  const selectedStatus = parseConnectionStatus(getSearchValue(params.status));
  const selectedDirection = parseConnectionDirection(
    getSearchValue(params.direction),
  );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (!profile || profile.role !== "school_admin") {
    redirect("/dashboard");
  }

  const [
    { data: currentSchool },
    { data: activeSchools, error: schoolsError },
    { data: connections, error: connectionsError },
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, slug, province, status")
      .eq("id", profile.school_id)
      .maybeSingle<School>(),
    supabase
      .from("schools")
      .select("id, name, slug, province, status")
      .eq("status", "active")
      .neq("id", profile.school_id)
      .order("name", { ascending: true })
      .returns<School[]>(),
    supabase
      .from("school_connections")
      .select(
        "id, requester_school_id, receiver_school_id, status, requested_at, responded_at, created_at",
      )
      .or(
        `requester_school_id.eq.${profile.school_id},receiver_school_id.eq.${profile.school_id}`,
      )
      .order("created_at", { ascending: false })
      .returns<SchoolConnection[]>(),
  ]);

  const otherSchools = activeSchools ?? [];
  const schoolsById = new Map<string, School>();

  for (const school of activeSchools ?? []) {
    schoolsById.set(school.id, school);
  }

  if (currentSchool) {
    schoolsById.set(currentSchool.id, currentSchool);
  }

  const connectionByOtherSchoolId = new Map<string, SchoolConnection>();

  for (const connection of connections ?? []) {
    connectionByOtherSchoolId.set(
      otherSchoolId(connection, profile.school_id),
      connection,
    );
  }

  const incomingRequests = (connections ?? []).filter(
    (connection) =>
      connection.receiver_school_id === profile.school_id &&
      connection.status === "pending",
  );
  const filteredIncomingRequests = incomingRequests.filter((connection) =>
    matchesSchoolSearch(
      searchQuery,
      schoolsById.get(connection.requester_school_id),
    ),
  );
  const filteredOtherSchools = otherSchools.filter((school) => {
    const connection = connectionByOtherSchoolId.get(school.id);

    return (
      matchesSchoolSearch(searchQuery, school) &&
      matchesConnectionFilters(
        connection,
        profile.school_id,
        selectedStatus,
        selectedDirection,
      )
    );
  });
  const connectionHistory = connections ?? [];
  const filteredConnections = connectionHistory.filter((connection) => {
    const school = schoolsById.get(otherSchoolId(connection, profile.school_id));

    return (
      matchesSchoolSearch(searchQuery, school) &&
      matchesConnectionFilters(
        connection,
        profile.school_id,
        selectedStatus,
        selectedDirection,
      )
    );
  });
  const hasFilters = Boolean(searchQuery || selectedStatus || selectedDirection);
  const activeMessage = getSearchValue(params.success);
  const errorMessage = getSearchValue(params.error);

  return (
    <div className="page-stack">
      <PageHeader
        description={t("schoolConnections.description")}
        title={t("schoolConnections.title")}
      />

      {activeMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {activeMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <FilterPanel
        action="/school-connections"
        clearHref="/school-connections"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: filteredOtherSchools.length + filteredConnections.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SearchField
          defaultValue={searchQuery}
          label={t("filters.search")}
          placeholder={t("filters.searchSchools")}
        />
        <SelectFilter
          defaultValue={selectedStatus}
          label={t("filters.status")}
          name="status"
          options={[
            { label: t("filters.all"), value: "" },
            { label: t("status.pending"), value: "pending" },
            { label: t("status.approved"), value: "approved" },
            { label: t("status.rejected"), value: "rejected" },
            { label: t("status.blocked"), value: "blocked" },
            { label: t("status.archived"), value: "archived" },
          ]}
        />
        <SelectFilter
          defaultValue={selectedDirection}
          label={t("filters.direction")}
          name="direction"
          options={[
            { label: t("filters.all"), value: "" },
            { label: t("filters.sent"), value: "sent" },
            { label: t("filters.received"), value: "received" },
          ]}
        />
      </FilterPanel>

      <section className="section-card section-card-padded">
        <h2 className="section-title">{t("schoolConnections.yourSchool.title")}</h2>
        {currentSchool ? (
          <>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailItem
                label={t("schoolConnections.fields.schoolName")}
                value={currentSchool.name}
              />
              <DetailItem
                label={t("schoolConnections.fields.province")}
                value={currentSchool.province ?? "-"}
              />
            </dl>
            <DetailsDisclosure label={t("common.viewDetails")}>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label={t("schoolConnections.fields.slug")}
                  value={currentSchool.slug}
                />
                <DetailItem
                  label={t("schoolConnections.fields.status")}
                  value={statusLabel(currentSchool.status, t)}
                />
              </dl>
            </DetailsDisclosure>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            {t("schoolConnections.errors.currentSchoolMissing")}
          </p>
        )}
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("schoolConnections.incoming.title")}
          </h2>
          {connectionsError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("schoolConnections.errors.connectionsLoadFailed", {
                error: connectionsError.message,
              })}
            </p>
          ) : null}
        </div>
        {incomingRequests.length && filteredIncomingRequests.length ? (
          <div className="grid gap-3 p-3">
            {filteredIncomingRequests.map((connection) => {
              const requester = schoolsById.get(connection.requester_school_id);

              return (
                <article
                  className="rounded-lg border border-zinc-200 p-3"
                  key={connection.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <SchoolSummary
                      fallback={t("schoolConnections.fallback.unknownSchool")}
                      school={requester}
                      subtitle={tf("schoolConnections.incoming.requestedDate", {
                        date: formatDate(connection.requested_at, locale),
                      })}
                    />
                    <div className="flex flex-wrap gap-2">
                      <ConnectionResponseForm
                        connectionId={connection.id}
                        decision="approve"
                        labels={{
                          approve: t("schoolConnections.actions.approve"),
                          approving: t("schoolConnections.actions.approving"),
                          reject: t("schoolConnections.actions.reject"),
                          rejecting: t("schoolConnections.actions.rejecting"),
                        }}
                      />
                      <ConnectionResponseForm
                        connectionId={connection.id}
                        decision="reject"
                        labels={{
                          approve: t("schoolConnections.actions.approve"),
                          approving: t("schoolConnections.actions.approving"),
                          reject: t("schoolConnections.actions.reject"),
                          rejecting: t("schoolConnections.actions.rejecting"),
                        }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : incomingRequests.length && searchQuery ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/school-connections"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm font-medium text-zinc-950">
              {t("schoolConnections.incoming.emptyTitle")}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {t("schoolConnections.incoming.emptyDescription")}
            </p>
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("schoolConnections.otherSchools.title")}
          </h2>
          {schoolsError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("schoolConnections.errors.schoolsLoadFailed", {
                error: schoolsError.message,
              })}
            </p>
          ) : null}
        </div>
        {otherSchools.length && filteredOtherSchools.length ? (
          <div className="grid gap-3 p-3 md:grid-cols-2">
            {filteredOtherSchools.map((school) => {
              const connection = connectionByOtherSchoolId.get(school.id);

              return (
                <article
                  className="rounded-lg border border-zinc-200 p-3"
                  key={school.id}
                >
                  <div className="flex h-full flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <SchoolSummary
                        fallback={t("schoolConnections.fallback.unknownSchool")}
                        school={school}
                        subtitle={school.province ?? school.slug}
                      />
                      {connection ? (
                        <ConnectionBadge
                          label={statusLabel(connection.status, t)}
                          status={connection.status}
                        />
                      ) : null}
                    </div>
                    <div className="mt-auto">
                      {connection ? (
                        <p className="text-sm text-zinc-600">
                          {connectionDescription(
                            connection,
                            profile.school_id,
                            locale,
                            t,
                            tf,
                          )}
                        </p>
                      ) : (
                        <RequestConnectionForm
                          labels={{
                            request: t("schoolConnections.actions.request"),
                            requesting: t("schoolConnections.actions.requesting"),
                          }}
                          schoolId={school.id}
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : otherSchools.length && hasFilters ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/school-connections"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              description={t("schoolConnections.otherSchools.emptyDescription")}
              title={t("schoolConnections.otherSchools.emptyTitle")}
            />
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("schoolConnections.history.title")}
          </h2>
        </div>
        {connectionHistory.length && filteredConnections.length ? (
          <div className="grid gap-3 p-3">
            {filteredConnections.map((connection) => {
              const otherSchool = schoolsById.get(
                otherSchoolId(connection, profile.school_id),
              );

              return (
                <article
                  className="rounded-lg border border-zinc-200 p-3"
                  key={connection.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <SchoolSummary
                      fallback={t("schoolConnections.fallback.unknownSchool")}
                      school={otherSchool}
                      subtitle={connectionDescription(
                        connection,
                        profile.school_id,
                        locale,
                        t,
                        tf,
                      )}
                    />
                    <ConnectionBadge
                      label={statusLabel(connection.status, t)}
                      status={connection.status}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : connectionHistory.length && hasFilters ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/school-connections"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              description={t("schoolConnections.history.emptyDescription")}
              title={t("schoolConnections.history.emptyTitle")}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function RequestConnectionForm({
  labels,
  schoolId,
}: {
  labels: {
    request: string;
    requesting: string;
  };
  schoolId: string;
}) {
  return (
    <form action={requestSchoolConnection}>
      <input name="receiver_school_id" type="hidden" value={schoolId} />
      <PendingSubmitButton
        className="btn btn-primary h-10 w-full sm:w-auto"
        pendingLabel={labels.requesting}
      >
        {labels.request}
      </PendingSubmitButton>
    </form>
  );
}

function ConnectionResponseForm({
  connectionId,
  decision,
  labels,
}: {
  connectionId: string;
  decision: "approve" | "reject";
  labels: {
    approve: string;
    approving: string;
    reject: string;
    rejecting: string;
  };
}) {
  const isApprove = decision === "approve";

  return (
    <form action={respondToSchoolConnection}>
      <input name="connection_id" type="hidden" value={connectionId} />
      <input name="decision" type="hidden" value={decision} />
      <PendingSubmitButton
        className={
          isApprove
            ? "btn btn-primary h-10"
            : "btn btn-secondary h-10"
        }
        pendingLabel={isApprove ? labels.approving : labels.rejecting}
      >
        {isApprove ? labels.approve : labels.reject}
      </PendingSubmitButton>
    </form>
  );
}

function SchoolSummary({
  fallback,
  school,
  subtitle,
}: {
  fallback: string;
  school?: School;
  subtitle: string;
}) {
  return (
    <div>
      <h3 className="font-semibold text-zinc-950">
        {school?.name ?? fallback}
      </h3>
      <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
      {school ? (
        <p className="mt-1 text-xs text-zinc-500">{school.slug}</p>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-card">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value">{value}</dd>
    </div>
  );
}

function ConnectionBadge({
  label,
  status,
}: {
  label: string;
  status: ConnectionStatus;
}) {
  const color =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "bg-amber-50 text-amber-700"
        : status === "rejected"
          ? "bg-red-50 text-red-700"
          : "bg-zinc-100 text-zinc-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function connectionDescription(
  connection: SchoolConnection,
  currentSchoolId: string,
  locale: Locale,
  t: (key: string) => string,
  tf: (key: string, values: Record<string, string | number>) => string,
) {
  const direction =
    connection.requester_school_id === currentSchoolId
      ? t("schoolConnections.direction.sent")
      : t("schoolConnections.direction.received");
  const date =
    connection.status === "pending"
      ? connection.requested_at
      : connection.responded_at ?? connection.requested_at;

  return tf("schoolConnections.history.description", {
    date: formatDate(date, locale),
    direction,
    status: statusLabel(connection.status, t),
  });
}

function otherSchoolId(
  connection: Pick<
    SchoolConnection,
    "requester_school_id" | "receiver_school_id"
  >,
  currentSchoolId: string,
) {
  return connection.requester_school_id === currentSchoolId
    ? connection.receiver_school_id
    : connection.requester_school_id;
}

function statusLabel(status: string, t: (key: string) => string) {
  return t(`status.${status}`);
}

function matchesSchoolSearch(query: string, school: School | undefined) {
  if (!school) {
    return !query;
  }

  return matchesSearch(query, [school.name, school.slug, school.province]);
}

function matchesConnectionFilters(
  connection: SchoolConnection | undefined,
  currentSchoolId: string,
  selectedStatus: ConnectionStatus | "",
  selectedDirection: "received" | "sent" | "",
) {
  if (!connection) {
    return !selectedStatus && !selectedDirection;
  }

  const direction =
    connection.requester_school_id === currentSchoolId ? "sent" : "received";

  return (
    (!selectedStatus || connection.status === selectedStatus) &&
    (!selectedDirection || direction === selectedDirection)
  );
}

function parseConnectionStatus(value: string): ConnectionStatus | "" {
  return ["pending", "approved", "rejected", "blocked", "archived"].includes(
    value,
  )
    ? (value as ConnectionStatus)
    : "";
}

function parseConnectionDirection(value: string) {
  return value === "sent" || value === "received" ? value : "";
}

function getSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
