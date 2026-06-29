import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../../../_components/page-ui";
import {
  createPlatformSchoolAdmin,
  updatePlatformSchool,
  updatePlatformSchoolAdminStatus,
} from "./actions";

type SchoolStatus = "active" | "archived";
type ProfileStatus = "active" | "inactive";

type School = {
  created_at: string;
  id: string;
  name: string;
  province: string | null;
  slug: string;
  status: SchoolStatus;
  updated_at: string;
};

type SchoolAdminProfile = {
  created_at: string;
  full_name: string;
  id: string;
  status: ProfileStatus;
};

type SchoolConnection = {
  status: "pending" | "approved" | "rejected" | "blocked" | "archived";
};

type DetailPageParams = {
  schoolId: string;
};

type DetailSearchParams = {
  error?: string | string[];
  success?: string | string[];
};

type CountResult = {
  count: number | null;
};

type Translator = (key: string) => string;
type Locale = Awaited<ReturnType<typeof getCurrentLocale>>;

export default async function SuperAdminSchoolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<DetailPageParams>;
  searchParams: Promise<DetailSearchParams>;
}) {
  const platformAdmin = await requirePlatformAdmin();
  const { schoolId } = await params;

  if (!isUuid(schoolId)) {
    notFound();
  }

  const [locale, queryParams] = await Promise.all([
    getCurrentLocale(),
    searchParams,
  ]);
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const successMessage = getSearchValue(queryParams.success);
  const errorMessage = getSearchValue(queryParams.error);
  const admin = createAdminClient();

  const [
    { data: school, error: schoolError },
    schoolAdminsResult,
    teacherCountResult,
    studentCountResult,
    { data: connections, error: connectionsError },
  ] = await Promise.all([
    admin
      .from("schools")
      .select("id, name, slug, province, status, created_at, updated_at")
      .eq("id", schoolId)
      .maybeSingle<School>(),
    admin
      .from("profiles")
      .select("id, full_name, status, created_at")
      .eq("school_id", schoolId)
      .eq("role", "school_admin")
      .order("created_at", { ascending: false })
      .returns<SchoolAdminProfile[]>(),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("role", "teacher"),
    admin
      .from("student_rosters")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    admin
      .from("school_connections")
      .select("status")
      .or(
        `requester_school_id.eq.${schoolId},receiver_school_id.eq.${schoolId}`,
      )
      .returns<SchoolConnection[]>(),
  ]);

  if (schoolError) {
    throw new Error("Unable to load super admin school detail.");
  }

  if (!school) {
    notFound();
  }

  const schoolAdmins = schoolAdminsResult.data ?? [];
  const emailByProfileId = await getAuthEmailsByProfileId(admin, schoolAdmins);
  const activeConnections =
    connections?.filter((connection) => connection.status === "approved")
      .length ?? 0;
  const pendingConnections =
    connections?.filter((connection) => connection.status === "pending")
      .length ?? 0;
  const hasLoadError = Boolean(
    schoolAdminsResult.error ||
      teacherCountResult.error ||
      studentCountResult.error ||
      connectionsError,
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <HeaderActionLink href="/super-admin/schools" variant="secondary">
              {t("superAdmin.actions.backToSchools")}
            </HeaderActionLink>
            <HeaderActionLink href="/super-admin/schools/new">
              {t("superAdmin.newSchool.actions.createSchool")}
            </HeaderActionLink>
          </>
        }
        description={t("superAdmin.schoolDetail.description")}
        eyebrow={t("nav.superAdmin")}
        title={t("superAdmin.schoolDetail.title")}
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
      {hasLoadError ? (
        <p className="notice-box notice-warning text-sm" role="alert">
          {t("superAdmin.schoolDetail.errors.loadFailed")}
        </p>
      ) : null}

      <section className="notice-box">
        <p className="text-sm font-semibold">
          {t("superAdmin.schoolDetail.privacyNotice")}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("superAdmin.schoolDetail.fields.schoolAdmins")}
          value={schoolAdmins.length}
        />
        <MetricCard
          label={t("superAdmin.schoolDetail.fields.teachers")}
          value={countValue(teacherCountResult)}
        />
        <MetricCard
          label={t("superAdmin.schoolDetail.fields.students")}
          value={countValue(studentCountResult)}
        />
        <MetricCard
          label={t("superAdmin.schoolDetail.connectionsSummary.active")}
          value={activeConnections}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-4">
          <section className="section-card section-card-padded">
            <div className="section-header">
              <h2 className="section-title">
                {t("superAdmin.schoolDetail.overview.title")}
              </h2>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailItem
                label={t("superAdmin.schoolDetail.fields.schoolName")}
                value={school.name}
              />
              <DetailItem
                label={t("superAdmin.schoolDetail.fields.province")}
                value={school.province ?? t("common.notAvailableShort")}
              />
              <DetailItem
                label={t("superAdmin.schoolDetail.fields.status")}
                value={
                  <StatusBadge status={school.status}>
                    {schoolStatusLabel(school.status, t)}
                  </StatusBadge>
                }
              />
              <DetailItem
                label={t("superAdmin.schoolDetail.fields.schoolIdentifier")}
                value={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span>{school.slug}</span>
                    <StatusBadge variant="info">
                      {t("superAdmin.schoolDetail.fields.readOnly")}
                    </StatusBadge>
                  </span>
                }
              />
              <DetailItem
                label={t("superAdmin.schoolDetail.fields.created")}
                value={formatDate(school.created_at, locale)}
              />
              <DetailItem
                label={t("superAdmin.schoolDetail.fields.updated")}
                value={formatDate(school.updated_at, locale)}
              />
            </dl>
          </section>

          <section className="section-card section-card-padded">
            <div className="section-header">
              <h2 className="section-title">
                {t("superAdmin.schoolDetail.edit.title")}
              </h2>
              <p className="section-description">
                {t("superAdmin.schoolDetail.edit.description")}
              </p>
            </div>
            <EditSchoolForm school={school} t={t} />
          </section>

          <section className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                {t("superAdmin.schoolDetail.admins.title")}
              </h2>
              <p className="section-description">
                {t("superAdmin.schoolDetail.admins.description")}
              </p>
            </div>

            <div className="border-b border-zinc-200 p-4">
              <AddSchoolAdminForm schoolId={school.id} t={t} />
            </div>

            {schoolAdmins.length ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          {t("superAdmin.schoolDetail.fields.fullName")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("superAdmin.schoolDetail.fields.email")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("superAdmin.schoolDetail.fields.status")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("superAdmin.schoolDetail.fields.created")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("superAdmin.schoolDetail.fields.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {schoolAdmins.map((schoolAdmin) => (
                        <tr key={schoolAdmin.id}>
                          <td className="px-4 py-3 font-medium text-zinc-950">
                            {schoolAdmin.full_name}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">
                            {emailByProfileId.get(schoolAdmin.id) ??
                              t("common.notAvailableShort")}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={schoolAdmin.status}>
                              {profileStatusLabel(schoolAdmin.status, t)}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3 text-zinc-700">
                            {formatDate(schoolAdmin.created_at, locale)}
                          </td>
                          <td className="px-4 py-3">
                            <SchoolAdminStatusForm
                              currentProfileId={platformAdmin.id}
                              labels={adminStatusFormLabels(t)}
                              schoolAdmin={schoolAdmin}
                              schoolId={school.id}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-zinc-200 md:hidden">
                  {schoolAdmins.map((schoolAdmin) => (
                    <article className="p-4" key={schoolAdmin.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-zinc-950">
                            {schoolAdmin.full_name}
                          </h3>
                          <p className="mt-1 break-all text-sm text-zinc-600">
                            {emailByProfileId.get(schoolAdmin.id) ??
                              t("common.notAvailableShort")}
                          </p>
                        </div>
                        <StatusBadge status={schoolAdmin.status}>
                          {profileStatusLabel(schoolAdmin.status, t)}
                        </StatusBadge>
                      </div>
                      <dl className="mt-3 grid gap-2 text-sm">
                        <DetailItem
                          label={t("superAdmin.schoolDetail.fields.created")}
                          value={formatDate(schoolAdmin.created_at, locale)}
                        />
                      </dl>
                      <div className="mt-4">
                        <SchoolAdminStatusForm
                          currentProfileId={platformAdmin.id}
                          labels={adminStatusFormLabels(t)}
                          schoolAdmin={schoolAdmin}
                          schoolId={school.id}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-4">
                <EmptyState
                  description={t(
                    "superAdmin.schoolDetail.admins.emptyDescription",
                  )}
                  title={t("superAdmin.schoolDetail.admins.emptyTitle")}
                />
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 self-start">
          <section className="section-card section-card-padded">
            <h2 className="section-title">
              {t("superAdmin.schoolDetail.connectionsSummary.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              <MetricRow
                label={t("superAdmin.schoolDetail.connectionsSummary.active")}
                value={activeConnections}
              />
              <MetricRow
                label={t("superAdmin.schoolDetail.connectionsSummary.pending")}
                value={pendingConnections}
              />
            </div>
            <Link
              className="btn btn-secondary mt-4 h-10 w-full"
              href="/super-admin/connections"
            >
              {t("superAdmin.actions.viewConnections")}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function EditSchoolForm({
  school,
  t,
}: {
  school: School;
  t: Translator;
}) {
  return (
    <form action={updatePlatformSchool} className="compact-form-lg grid gap-3">
      <input name="school_id" type="hidden" value={school.id} />
      <div className="grid gap-3 md:grid-cols-[minmax(16rem,2fr)_minmax(12rem,1fr)_minmax(10rem,1fr)]">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.schoolDetail.fields.schoolName")}
          <input
            className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
            defaultValue={school.name}
            name="name"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.schoolDetail.fields.province")}
          <input
            className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
            defaultValue={school.province ?? ""}
            name="province"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.schoolDetail.fields.status")}
          <select
            className="h-11 cursor-pointer rounded-md border px-3 text-base font-normal outline-none transition"
            defaultValue={school.status}
            name="status"
          >
            <option value="active">{t("status.active")}</option>
            <option value="archived">{t("status.archived")}</option>
          </select>
        </label>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">
        <span className="font-semibold">
          {t("superAdmin.schoolDetail.fields.schoolIdentifier")}:
        </span>{" "}
        {school.slug} ({t("superAdmin.schoolDetail.fields.readOnly")})
      </div>
      <PendingSubmitButton
        className="btn btn-primary h-11 w-full sm:w-auto"
        pendingLabel={t("superAdmin.schoolDetail.actions.updatingSchool")}
      >
        {t("superAdmin.schoolDetail.actions.updateSchool")}
      </PendingSubmitButton>
    </form>
  );
}

function AddSchoolAdminForm({
  schoolId,
  t,
}: {
  schoolId: string;
  t: Translator;
}) {
  return (
    <form
      action={createPlatformSchoolAdmin}
      className="compact-form-lg grid gap-3"
    >
      <input name="school_id" type="hidden" value={schoolId} />
      <div className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_minmax(12rem,0.8fr)]">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.schoolDetail.fields.adminFullName")}
          <input
            className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
            name="full_name"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.schoolDetail.fields.adminEmail")}
          <input
            className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
            name="email"
            required
            type="email"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
          {t("superAdmin.schoolDetail.fields.temporaryPassword")}
          <input
            className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
      </div>
      <PendingSubmitButton
        className="btn btn-primary h-11 w-full sm:w-auto"
        pendingLabel={t("superAdmin.schoolDetail.actions.addingAdmin")}
      >
        {t("superAdmin.schoolDetail.actions.addAdmin")}
      </PendingSubmitButton>
    </form>
  );
}

type AdminStatusFormLabels = {
  cancel: string;
  confirm: string;
  confirmDescription: string;
  deactivate: string;
  deactivating: string;
  protectedAccount: string;
  reactivate: string;
  reactivating: string;
};

function SchoolAdminStatusForm({
  currentProfileId,
  labels,
  schoolAdmin,
  schoolId,
}: {
  currentProfileId: string;
  labels: AdminStatusFormLabels;
  schoolAdmin: SchoolAdminProfile;
  schoolId: string;
}) {
  if (schoolAdmin.id === currentProfileId) {
    return <span className="text-sm text-zinc-500">{labels.protectedAccount}</span>;
  }

  const nextStatus = schoolAdmin.status === "active" ? "inactive" : "active";
  const isDeactivation = nextStatus === "inactive";

  return (
    <form action={updatePlatformSchoolAdminStatus}>
      <input name="school_id" type="hidden" value={schoolId} />
      <input name="profile_id" type="hidden" value={schoolAdmin.id} />
      <input name="status" type="hidden" value={nextStatus} />
      <ConfirmSubmitButton
        cancelLabel={labels.cancel}
        className="btn btn-secondary h-10 w-full sm:w-auto"
        confirmDescription={labels.confirmDescription}
        confirmLabel={labels.confirm}
        confirmTitle={isDeactivation ? labels.deactivate : labels.reactivate}
        pendingLabel={isDeactivation ? labels.deactivating : labels.reactivating}
      >
        {isDeactivation ? labels.deactivate : labels.reactivate}
      </ConfirmSubmitButton>
    </form>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="section-card section-card-padded">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value.toLocaleString()}
      </p>
    </article>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-xl font-bold text-slate-950">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-zinc-900">{value}</dd>
    </div>
  );
}

function adminStatusFormLabels(t: Translator): AdminStatusFormLabels {
  return {
    cancel: t("common.cancel"),
    confirm: t("feedback.confirm"),
    confirmDescription: t("feedback.cannotBeUndone"),
    deactivate: t("superAdmin.schoolDetail.actions.deactivateAdmin"),
    deactivating: t("superAdmin.schoolDetail.actions.deactivatingAdmin"),
    protectedAccount: t("staff.actions.protectedAccount"),
    reactivate: t("superAdmin.schoolDetail.actions.reactivateAdmin"),
    reactivating: t("superAdmin.schoolDetail.actions.reactivatingAdmin"),
  };
}

async function getAuthEmailsByProfileId(
  admin: ReturnType<typeof createAdminClient>,
  schoolAdmins: SchoolAdminProfile[],
) {
  const emailEntries = await Promise.all(
    schoolAdmins.map(async (schoolAdmin) => {
      const { data, error } = await admin.auth.admin.getUserById(
        schoolAdmin.id,
      );

      return [schoolAdmin.id, error ? null : data.user?.email ?? null] as const;
    }),
  );

  return new Map(emailEntries);
}

function schoolStatusLabel(status: SchoolStatus, t: Translator) {
  if (status === "active") {
    return t("status.active");
  }

  return t("status.archived");
}

function profileStatusLabel(status: ProfileStatus, t: Translator) {
  if (status === "active") {
    return t("status.active");
  }

  return t("status.inactive");
}

function countValue(result: CountResult) {
  return result.count ?? 0;
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
