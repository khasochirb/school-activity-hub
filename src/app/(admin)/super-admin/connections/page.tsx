import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ActionToast } from "@/components/toast-provider";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatDate } from "@/lib/i18n/date-format";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getSearchParam, matchesSearch } from "@/lib/list-filters";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EmptyState,
  FilterPanel,
  HeaderActionLink,
  NoResultsState,
  PageHeader,
  SearchField,
  SelectFilter,
  StatusBadge,
} from "../../_components/page-ui";
import {
  createPlatformConnection,
  updatePlatformConnectionStatus,
} from "./actions";

type School = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
};

type ConnectionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked"
  | "archived";

type SchoolConnection = {
  created_at: string;
  id: string;
  receiver_school_id: string;
  requested_at: string | null;
  requester_school_id: string;
  responded_at: string | null;
  status: ConnectionStatus;
  updated_at: string | null;
};

type ConnectionsSearchParams = {
  error?: string | string[];
  q?: string | string[];
  status?: string | string[];
  success?: string | string[];
};

export default async function SuperAdminConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<ConnectionsSearchParams>;
}) {
  await requirePlatformAdmin();

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const searchQuery = getSearchParam(params.q);
  const selectedStatus = parseConnectionStatus(getSearchParam(params.status));
  const successMessage = getSearchParam(params.success);
  const errorMessage = getSearchParam(params.error);
  const admin = createAdminClient();
  const [
    { data: schools, error: schoolsError },
    { data: connections, error: connectionsError },
  ] = await Promise.all([
    admin
      .from("schools")
      .select("id, name, slug, status")
      .order("name", { ascending: true })
      .returns<School[]>(),
    admin
      .from("school_connections")
      .select(
        "id, requester_school_id, receiver_school_id, status, requested_at, responded_at, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .returns<SchoolConnection[]>(),
  ]);

  const schoolRows = schools ?? [];
  const activeSchools = schoolRows.filter((school) => school.status === "active");
  const schoolById = new Map(schoolRows.map((school) => [school.id, school]));
  const connectionRows = connections ?? [];
  const filteredConnections = connectionRows.filter((connection) => {
    const requester = schoolById.get(connection.requester_school_id);
    const receiver = schoolById.get(connection.receiver_school_id);

    return (
      (!selectedStatus || connection.status === selectedStatus) &&
      matchesSearch(searchQuery, [
        requester?.name,
        requester?.slug,
        receiver?.name,
        receiver?.slug,
      ])
    );
  });
  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="/super-admin" variant="secondary">
            {t("superAdmin.actions.backToPlatformDashboard")}
          </HeaderActionLink>
        }
        description={t("superAdmin.connections.description")}
        eyebrow={t("nav.superAdmin")}
        title={t("superAdmin.connections.title")}
      />
      <ActionToast message={successMessage} success />
      <ActionToast message={errorMessage} success={false} />

      {successMessage ? (
        <p className="notice-box notice-success text-sm" role="status">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="notice-box notice-danger text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section className="section-card section-card-padded">
        <div className="mb-4">
          <h2 className="section-title">
            {t("superAdmin.connections.create.title")}
          </h2>
          <p className="section-description">
            {t("superAdmin.connections.create.description")}
          </p>
        </div>
        {schoolsError ? (
          <p className="notice-box notice-danger text-sm" role="alert">
            {t("common.somethingWentWrong")}
          </p>
        ) : null}
        <CreateConnectionForm
          activeSchools={activeSchools}
          labels={{
            active: t("superAdmin.connections.status.active"),
            chooseSchool: t("superAdmin.connections.form.chooseSchool"),
            createConnection: t("superAdmin.connections.actions.create"),
            creating: t("superAdmin.connections.actions.creating"),
            fromSchool: t("superAdmin.connections.fields.fromSchool"),
            pending: t("superAdmin.connections.status.pending"),
            status: t("superAdmin.connections.fields.status"),
            toSchool: t("superAdmin.connections.fields.toSchool"),
          }}
        />
      </section>

      <FilterPanel
        action="/super-admin/connections"
        clearHref="/super-admin/connections"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: filteredConnections.length,
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
          label={t("superAdmin.connections.fields.status")}
          name="status"
          options={[
            { label: t("filters.all"), value: "" },
            { label: t("superAdmin.connections.status.pending"), value: "pending" },
            { label: t("superAdmin.connections.status.active"), value: "approved" },
            { label: t("superAdmin.connections.status.rejected"), value: "rejected" },
            { label: t("superAdmin.connections.status.revoked"), value: "archived" },
            { label: t("status.blocked"), value: "blocked" },
          ]}
        />
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {t("superAdmin.connections.allConnections")}
          </h2>
          {connectionsError ? (
            <p className="mt-2 text-sm text-red-600">
              {t("common.somethingWentWrong")}
            </p>
          ) : null}
        </div>

        {!connectionsError && connectionRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              description={t("superAdmin.connections.emptyDescription")}
              title={t("superAdmin.connections.emptyTitle")}
            />
          </div>
        ) : null}

        {!connectionsError &&
        connectionRows.length > 0 &&
        filteredConnections.length === 0 ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/super-admin/connections"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : null}

        {filteredConnections.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.connections.fields.fromSchool")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.connections.fields.toSchool")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.connections.fields.status")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.connections.fields.requested")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.connections.fields.updated")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.connections.fields.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredConnections.map((connection) => (
                    <ConnectionTableRow
                      connection={connection}
                      key={connection.id}
                      labels={connectionActionLabels(t)}
                      locale={locale}
                      schoolById={schoolById}
                      t={t}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-200 md:hidden">
              {filteredConnections.map((connection) => (
                <ConnectionCard
                  connection={connection}
                  key={connection.id}
                  labels={connectionActionLabels(t)}
                  locale={locale}
                  schoolById={schoolById}
                  t={t}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function CreateConnectionForm({
  activeSchools,
  labels,
}: {
  activeSchools: School[];
  labels: {
    active: string;
    chooseSchool: string;
    createConnection: string;
    creating: string;
    fromSchool: string;
    pending: string;
    status: string;
    toSchool: string;
  };
}) {
  return (
    <form action={createPlatformConnection} className="compact-form-lg grid gap-3 md:grid-cols-3">
      <SchoolSelect
        label={labels.fromSchool}
        name="requester_school_id"
        placeholder={labels.chooseSchool}
        schools={activeSchools}
      />
      <SchoolSelect
        label={labels.toSchool}
        name="receiver_school_id"
        placeholder={labels.chooseSchool}
        schools={activeSchools}
      />
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.status}
        <select
          className="h-11 cursor-pointer rounded-md border px-3 text-base font-normal outline-none transition"
          defaultValue="pending"
          name="status"
        >
          <option value="pending">{labels.pending}</option>
          <option value="approved">{labels.active}</option>
        </select>
      </label>
      <div className="md:col-span-3">
        <PendingSubmitButton
          className="btn btn-primary h-11 w-full sm:w-auto"
          disabled={activeSchools.length < 2}
          pendingLabel={labels.creating}
        >
          {labels.createConnection}
        </PendingSubmitButton>
      </div>
    </form>
  );
}

function SchoolSelect({
  label,
  name,
  placeholder,
  schools,
}: {
  label: string;
  name: string;
  placeholder: string;
  schools: School[];
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
      {label}
      <select
        className="h-11 cursor-pointer rounded-md border px-3 text-base font-normal outline-none transition"
        name={name}
        required
      >
        <option value="">{placeholder}</option>
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name} ({school.slug})
          </option>
        ))}
      </select>
    </label>
  );
}

function ConnectionTableRow({
  connection,
  labels,
  locale,
  schoolById,
  t,
}: {
  connection: SchoolConnection;
  labels: ConnectionActionLabels;
  locale: Awaited<ReturnType<typeof getCurrentLocale>>;
  schoolById: Map<string, School>;
  t: (key: string) => string;
}) {
  const requester = schoolById.get(connection.requester_school_id);
  const receiver = schoolById.get(connection.receiver_school_id);

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-zinc-950">
        <SchoolName school={requester} t={t} />
      </td>
      <td className="px-4 py-3 text-zinc-700">
        <SchoolName school={receiver} t={t} />
      </td>
      <td className="px-4 py-3">
        <ConnectionStatusBadge status={connection.status} t={t} />
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {dateLabel(connection.requested_at, locale, t)}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {dateLabel(connection.updated_at ?? connection.responded_at, locale, t)}
      </td>
      <td className="px-4 py-3">
        <ConnectionActions connection={connection} labels={labels} />
      </td>
    </tr>
  );
}

function ConnectionCard({
  connection,
  labels,
  locale,
  schoolById,
  t,
}: {
  connection: SchoolConnection;
  labels: ConnectionActionLabels;
  locale: Awaited<ReturnType<typeof getCurrentLocale>>;
  schoolById: Map<string, School>;
  t: (key: string) => string;
}) {
  const requester = schoolById.get(connection.requester_school_id);
  const receiver = schoolById.get(connection.receiver_school_id);

  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-zinc-950">
            <SchoolName school={requester} t={t} />
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            {t("superAdmin.connections.fields.toSchool")}:{" "}
            <SchoolName school={receiver} t={t} />
          </p>
        </div>
        <ConnectionStatusBadge status={connection.status} t={t} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <DetailItem
          label={t("superAdmin.connections.fields.requested")}
          value={dateLabel(connection.requested_at, locale, t)}
        />
        <DetailItem
          label={t("superAdmin.connections.fields.updated")}
          value={dateLabel(connection.updated_at ?? connection.responded_at, locale, t)}
        />
      </dl>
      <div className="mt-3">
        <ConnectionActions connection={connection} labels={labels} />
      </div>
    </article>
  );
}

type ConnectionActionLabels = {
  approve: string;
  approving: string;
  cancel: string;
  confirm: string;
  confirmDescription: string;
  confirmRevokeTitle: string;
  noActions: string;
  reject: string;
  rejecting: string;
  revoke: string;
  revoking: string;
};

function ConnectionActions({
  connection,
  labels,
}: {
  connection: SchoolConnection;
  labels: ConnectionActionLabels;
}) {
  if (connection.status === "pending") {
    return (
      <form
        action={updatePlatformConnectionStatus}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        <input name="connection_id" type="hidden" value={connection.id} />
        <PendingSubmitButton
          className="btn btn-primary h-10 w-full sm:w-auto"
          name="decision"
          pendingLabel={labels.approving}
          value="approve"
        >
          {labels.approve}
        </PendingSubmitButton>
        <PendingSubmitButton
          className="btn btn-secondary h-10 w-full sm:w-auto"
          name="decision"
          pendingLabel={labels.rejecting}
          value="reject"
        >
          {labels.reject}
        </PendingSubmitButton>
      </form>
    );
  }

  if (connection.status === "approved") {
    return (
      <form action={updatePlatformConnectionStatus}>
        <input name="connection_id" type="hidden" value={connection.id} />
        <input name="decision" type="hidden" value="revoke" />
        <ConfirmSubmitButton
          cancelLabel={labels.cancel}
          className="btn btn-secondary h-10 w-full sm:w-auto"
          confirmDescription={labels.confirmDescription}
          confirmLabel={labels.confirm}
          confirmTitle={labels.confirmRevokeTitle}
          pendingLabel={labels.revoking}
        >
          {labels.revoke}
        </ConfirmSubmitButton>
      </form>
    );
  }

  return <span className="text-sm text-zinc-500">{labels.noActions}</span>;
}

function ConnectionStatusBadge({
  status,
  t,
}: {
  status: ConnectionStatus;
  t: (key: string) => string;
}) {
  return (
    <StatusBadge status={status}>
      {connectionStatusLabel(status, t)}
    </StatusBadge>
  );
}

function SchoolName({
  school,
  t,
}: {
  school: School | undefined;
  t: (key: string) => string;
}) {
  if (!school) {
    return t("superAdmin.connections.fallback.unknownSchool");
  }

  return (
    <>
      {school.name}
      <span className="ml-1 text-xs font-normal text-zinc-500">
        {school.slug}
      </span>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-zinc-900">{value}</dd>
    </div>
  );
}

function dateLabel(
  value: string | null | undefined,
  locale: Awaited<ReturnType<typeof getCurrentLocale>>,
  t: (key: string) => string,
) {
  return value ? formatDate(value, locale) : t("common.notAvailableShort");
}

function parseConnectionStatus(value: string) {
  return isConnectionStatus(value) ? value : "";
}

function isConnectionStatus(value: string): value is ConnectionStatus {
  return ["pending", "approved", "rejected", "blocked", "archived"].includes(
    value,
  );
}

function connectionStatusLabel(
  status: ConnectionStatus,
  t: (key: string) => string,
) {
  if (status === "approved") {
    return t("superAdmin.connections.status.active");
  }

  if (status === "archived") {
    return t("superAdmin.connections.status.revoked");
  }

  if (status === "blocked") {
    return t("status.blocked");
  }

  return t(`superAdmin.connections.status.${status}`);
}

function connectionActionLabels(t: (key: string) => string) {
  return {
    approve: t("superAdmin.connections.actions.approve"),
    approving: t("superAdmin.connections.actions.approving"),
    cancel: t("common.cancel"),
    confirm: t("feedback.confirm"),
    confirmDescription: t("feedback.cannotBeUndone"),
    confirmRevokeTitle: t("superAdmin.connections.actions.revoke"),
    noActions: t("superAdmin.connections.actions.noActions"),
    reject: t("superAdmin.connections.actions.reject"),
    rejecting: t("superAdmin.connections.actions.rejecting"),
    revoke: t("superAdmin.connections.actions.revoke"),
    revoking: t("superAdmin.connections.actions.revoking"),
  };
}
