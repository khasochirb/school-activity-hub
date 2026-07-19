import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ActionToast } from "@/components/toast-provider";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatDate } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getSearchParam } from "@/lib/list-filters";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../../_components/page-ui";
import { addPlatformAdmin, updatePlatformAdminStatus } from "./actions";

type ProfileStatus = "active" | "inactive";
type ProfileRole = "school_admin" | "teacher" | "student";

type PlatformAdminRow = {
  created_at: string;
  profile_id: string;
  status: ProfileStatus;
};

type ProfileRow = {
  full_name: string;
  id: string;
  role: ProfileRole;
  status: ProfileStatus;
};

type PlatformAdminsSearchParams = {
  error?: string | string[];
  success?: string | string[];
};

type PlatformAdminView = PlatformAdminRow & {
  email: string | null;
  profile: ProfileRow | null;
};

type Translator = (key: string) => string;
type Locale = Awaited<ReturnType<typeof getCurrentLocale>>;

export default async function SuperAdminPlatformAdminsPage({
  searchParams,
}: {
  searchParams: Promise<PlatformAdminsSearchParams>;
}) {
  const currentPlatformAdmin = await requirePlatformAdmin();
  const [locale, params] = await Promise.all([getCurrentLocale(), searchParams]);
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const successMessage = getSearchParam(params.success);
  const errorMessage = getSearchParam(params.error);
  const admin = createAdminClient();
  const { data: platformAdmins, error: platformAdminsError } = await admin
    .from("platform_admins")
    .select("profile_id, status, created_at")
    .order("created_at", { ascending: false })
    .returns<PlatformAdminRow[]>();

  if (platformAdminsError) {
    console.error("Super Admin platform admins query failed", {
      code: platformAdminsError.code,
    });
  }

  const platformAdminRows = platformAdminsError ? [] : platformAdmins ?? [];
  const profileIds = platformAdminRows.map((row) => row.profile_id);
  const profiles = profileIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, role, status")
        .in("id", profileIds)
        .returns<ProfileRow[]>()
    : { data: [] as ProfileRow[], error: null };

  if (profiles.error) {
    console.error("Super Admin platform admin profiles query failed", {
      code: profiles.error.code,
    });
  }

  const profileById = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile]),
  );
  const emailByProfileId = await getAuthEmailsByProfileId(admin, profileIds);
  const rows = platformAdminRows.map<PlatformAdminView>((row) => ({
    ...row,
    email: emailByProfileId.get(row.profile_id) ?? null,
    profile: profileById.get(row.profile_id) ?? null,
  }));

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="/super-admin" variant="secondary">
            {t("superAdmin.actions.backToPlatformDashboard")}
          </HeaderActionLink>
        }
        description={t("superAdmin.platformAdmins.description")}
        eyebrow={t("nav.superAdmin")}
        title={t("superAdmin.platformAdmins.title")}
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
      {platformAdminsError || profiles.error ? (
        <p className="notice-box notice-warning text-sm" role="alert">
          {t("common.somethingWentWrong")}
        </p>
      ) : null}

      <section className="notice-box">
        <p className="text-sm font-semibold">
          {t("superAdmin.platformAdmins.safetyNote")}
        </p>
      </section>

      <section className="section-card section-card-padded">
        <div className="mb-4">
          <h2 className="section-title">
            {t("superAdmin.platformAdmins.add.title")}
          </h2>
          <p className="section-description">
            {t("superAdmin.platformAdmins.add.description")}
          </p>
        </div>
        <AddPlatformAdminForm
          labels={{
            add: t("superAdmin.platformAdmins.actions.add"),
            adding: t("superAdmin.platformAdmins.actions.adding"),
            email: t("superAdmin.platformAdmins.fields.adminEmail"),
          }}
        />
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {t("superAdmin.platformAdmins.current.title")}
          </h2>
          <p className="section-description">
            {t("superAdmin.platformAdmins.current.description")}
          </p>
        </div>

        {!platformAdminsError && rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              description={t("superAdmin.platformAdmins.empty.description")}
              title={t("superAdmin.platformAdmins.empty.title")}
            />
          </div>
        ) : null}

        {rows.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.platformAdmins.fields.fullName")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.platformAdmins.fields.email")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.platformAdmins.fields.schoolRole")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.platformAdmins.fields.status")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.platformAdmins.fields.created")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.platformAdmins.fields.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {rows.map((row) => (
                    <PlatformAdminTableRow
                      currentProfileId={currentPlatformAdmin.id}
                      key={row.profile_id}
                      labels={platformAdminActionLabels(t)}
                      locale={locale}
                      row={row}
                      t={t}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-200 lg:hidden">
              {rows.map((row) => (
                <PlatformAdminCard
                  currentProfileId={currentPlatformAdmin.id}
                  key={row.profile_id}
                  labels={platformAdminActionLabels(t)}
                  locale={locale}
                  row={row}
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

function AddPlatformAdminForm({
  labels,
}: {
  labels: {
    add: string;
    adding: string;
    email: string;
  };
}) {
  return (
    <form action={addPlatformAdmin} className="compact-form-sm grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.email}
        <input
          className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
          name="email"
          required
          type="email"
        />
      </label>
      <div className="flex items-end">
        <PendingSubmitButton
          className="btn btn-primary h-11 w-full sm:w-auto"
          pendingLabel={labels.adding}
        >
          {labels.add}
        </PendingSubmitButton>
      </div>
    </form>
  );
}

function PlatformAdminTableRow({
  currentProfileId,
  labels,
  locale,
  row,
  t,
}: {
  currentProfileId: string;
  labels: PlatformAdminActionLabels;
  locale: Locale;
  row: PlatformAdminView;
  t: Translator;
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium text-zinc-950">
        {row.profile?.full_name ?? t("common.notAvailableShort")}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        <span className="break-all">
          {row.email ?? t("common.notAvailableShort")}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {row.profile ? roleLabel(row.profile.role, t) : t("common.notAvailableShort")}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={row.status}>{statusLabel(row.status, t)}</StatusBadge>
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {formatDate(row.created_at, locale)}
      </td>
      <td className="px-4 py-3">
        <PlatformAdminActions
          currentProfileId={currentProfileId}
          labels={labels}
          row={row}
        />
      </td>
    </tr>
  );
}

function PlatformAdminCard({
  currentProfileId,
  labels,
  locale,
  row,
  t,
}: {
  currentProfileId: string;
  labels: PlatformAdminActionLabels;
  locale: Locale;
  row: PlatformAdminView;
  t: Translator;
}) {
  return (
    <article className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-950">
            {row.profile?.full_name ?? t("common.notAvailableShort")}
          </h3>
          <p className="mt-1 break-all text-sm text-zinc-600">
            {row.email ?? t("common.notAvailableShort")}
          </p>
        </div>
        <StatusBadge status={row.status}>{statusLabel(row.status, t)}</StatusBadge>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DetailItem
          label={t("superAdmin.platformAdmins.fields.schoolRole")}
          value={
            row.profile
              ? roleLabel(row.profile.role, t)
              : t("common.notAvailableShort")
          }
        />
        <DetailItem
          label={t("superAdmin.platformAdmins.fields.created")}
          value={formatDate(row.created_at, locale)}
        />
      </dl>
      <div className="mt-4">
        <PlatformAdminActions
          currentProfileId={currentProfileId}
          labels={labels}
          row={row}
        />
      </div>
    </article>
  );
}

type PlatformAdminActionLabels = {
  cannotDeactivateSelf: string;
  deactivate: string;
  deactivating: string;
  reactivate: string;
  reactivating: string;
};

function PlatformAdminActions({
  currentProfileId,
  labels,
  row,
}: {
  currentProfileId: string;
  labels: PlatformAdminActionLabels;
  row: PlatformAdminView;
}) {
  if (row.profile_id === currentProfileId && row.status === "active") {
    return (
      <span className="text-sm font-medium text-zinc-500">
        {labels.cannotDeactivateSelf}
      </span>
    );
  }

  return (
    <form action={updatePlatformAdminStatus}>
      <input name="profile_id" type="hidden" value={row.profile_id} />
      <input
        name="status"
        type="hidden"
        value={row.status === "active" ? "inactive" : "active"}
      />
      <PendingSubmitButton
        className={
          row.status === "active"
            ? "btn btn-secondary h-10 w-full sm:w-auto"
            : "btn btn-primary h-10 w-full sm:w-auto"
        }
        pendingLabel={
          row.status === "active" ? labels.deactivating : labels.reactivating
        }
      >
        {row.status === "active" ? labels.deactivate : labels.reactivate}
      </PendingSubmitButton>
    </form>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
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

async function getAuthEmailsByProfileId(
  admin: ReturnType<typeof createAdminClient>,
  profileIds: string[],
) {
  const emailEntries = await Promise.all(
    profileIds.map(async (profileId) => {
      const { data, error } = await admin.auth.admin.getUserById(profileId);

      return [profileId, error ? null : data.user?.email ?? null] as const;
    }),
  );

  return new Map(emailEntries);
}

function platformAdminActionLabels(t: Translator) {
  return {
    cannotDeactivateSelf: t(
      "superAdmin.platformAdmins.errors.cannotDeactivateSelf",
    ),
    deactivate: t("superAdmin.platformAdmins.actions.deactivate"),
    deactivating: t("superAdmin.platformAdmins.actions.deactivating"),
    reactivate: t("superAdmin.platformAdmins.actions.reactivate"),
    reactivating: t("superAdmin.platformAdmins.actions.reactivating"),
  };
}

function roleLabel(role: ProfileRole, t: Translator) {
  if (role === "school_admin") {
    return t("roles.schoolAdmin");
  }

  return role === "teacher" ? t("roles.teacher") : t("roles.student");
}

function statusLabel(status: ProfileStatus, t: Translator) {
  return status === "active" ? t("status.active") : t("status.inactive");
}
