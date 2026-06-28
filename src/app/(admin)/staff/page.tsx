import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getSearchParam, matchesSearch } from "@/lib/list-filters";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CollapsibleFormSection,
  EmptyState,
  DetailsDisclosure,
  FilterPanel,
  HeaderActionLink,
  NoResultsState,
  PageHeader,
  SearchField,
  SelectFilter,
} from "../_components/page-ui";
import { updateTeacherStatus } from "./actions";
import { CreateTeacherForm } from "./create-teacher-form";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type School = {
  name: string;
};

type StaffProfile = {
  id: string;
  full_name: string;
  role: "school_admin" | "teacher" | "student";
  status: string;
  created_at: string;
};

type StaffSearchParams = {
  q?: string | string[];
  role?: string | string[];
  status?: string | string[];
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<StaffSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const searchQuery = getSearchParam(params.q);
  const selectedRole = parseStaffRole(getSearchParam(params.role));
  const selectedStatus = parseProfileStatus(getSearchParam(params.status));
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

  const admin = createAdminClient();
  const [
    { data: school },
    { data: staffProfiles, error: staffError },
  ] = await Promise.all([
    admin
      .from("schools")
      .select("name")
      .eq("id", profile.school_id)
      .maybeSingle<School>(),
    admin
      .from("profiles")
      .select("id, full_name, role, status, created_at")
      .eq("school_id", profile.school_id)
      .in("role", ["school_admin", "teacher"])
      .order("created_at", { ascending: false })
      .returns<StaffProfile[]>(),
  ]);
  const emailByProfileId = await getAuthEmailsByProfileId(staffProfiles ?? []);
  const staffList = staffProfiles ?? [];
  const filteredStaff = staffList.filter((staff) => {
    const email = emailByProfileId.get(staff.id);

    return (
      (!selectedRole || staff.role === selectedRole) &&
      (!selectedStatus || staff.status === selectedStatus) &&
      matchesSearch(searchQuery, [staff.full_name, email])
    );
  });
  const hasFilters = Boolean(searchQuery || selectedRole || selectedStatus);

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="#create-teacher">
            {t("staff.actions.createTeacher")}
          </HeaderActionLink>
        }
        description={t("staff.description")}
        title={t("staff.title")}
      />
      {school?.name ? (
        <section className="notice-box">
          <p className="text-sm font-medium">{school.name}</p>
        </section>
      ) : null}

      <CollapsibleFormSection
        description={t("staff.create.description")}
        hideLabel={t("common.hideForm")}
        id="create-teacher"
        showLabel={t("common.showForm")}
        title={t("staff.create.title")}
      >
        <CreateTeacherForm
          labels={{
            create: t("staff.actions.createTeacher"),
            creating: t("staff.actions.creating"),
            email: t("staff.form.email"),
            fullName: t("staff.form.fullName"),
            temporaryPassword: t("staff.form.temporaryPassword"),
          }}
        />
      </CollapsibleFormSection>

      <FilterPanel
        action="/staff"
        clearHref="/staff"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: filteredStaff.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SearchField
          defaultValue={searchQuery}
          label={t("filters.search")}
          placeholder={t("filters.searchStaff")}
        />
        <SelectFilter
          defaultValue={selectedRole}
          label={t("filters.role")}
          name="role"
          options={[
            { label: t("filters.all"), value: "" },
            { label: t("roles.schoolAdmin"), value: "school_admin" },
            { label: t("roles.teacher"), value: "teacher" },
          ]}
        />
        <SelectFilter
          defaultValue={selectedStatus}
          label={t("filters.status")}
          name="status"
          options={[
            { label: t("filters.all"), value: "" },
            { label: t("filters.active"), value: "active" },
            { label: t("filters.inactive"), value: "inactive" },
          ]}
        />
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">{t("staff.profiles.title")}</h2>
          {staffError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("staff.errors.loadFailed", { error: staffError.message })}
            </p>
          ) : null}
        </div>
        {staffList.length && filteredStaff.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("staff.table.fullName")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("staff.table.email")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("staff.table.role")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("staff.table.status")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("staff.table.created")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("staff.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {staff.full_name}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {emailByProfileId.get(staff.id) ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {roleLabel(staff.role, t)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={statusLabel(staff.status, t)}
                          status={staff.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(staff.created_at, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <TeacherStatusForm
                          currentAdminId={profile.id}
                          labels={{
                            deactivate: t("staff.actions.deactivateTeacher"),
                            protectedAccount: t("staff.actions.protectedAccount"),
                            reactivate: t("staff.actions.reactivateTeacher"),
                            saving: t("common.saving"),
                          }}
                          staff={staff}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-200 md:hidden">
              {filteredStaff.map((staff) => (
                <article className="p-4" key={staff.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {staff.full_name}
                      </h3>
                      <p className="mt-1 break-all text-sm text-zinc-600">
                        {emailByProfileId.get(staff.id) ??
                          t("staff.fallback.emailUnavailable")}
                      </p>
                    </div>
                    <StatusBadge
                      label={statusLabel(staff.status, t)}
                      status={staff.status}
                    />
                  </div>
                  <DetailsDisclosure label={t("common.viewDetails")}>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-zinc-500">{t("staff.table.role")}</dt>
                        <dd className="text-zinc-800">{roleLabel(staff.role, t)}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">
                          {t("staff.table.created")}
                        </dt>
                        <dd className="text-zinc-800">
                          {formatDate(staff.created_at, locale)}
                        </dd>
                      </div>
                    </dl>
                  </DetailsDisclosure>
                  <div className="mt-4">
                    <TeacherStatusForm
                      currentAdminId={profile.id}
                      labels={{
                        deactivate: t("staff.actions.deactivateTeacher"),
                        protectedAccount: t("staff.actions.protectedAccount"),
                        reactivate: t("staff.actions.reactivateTeacher"),
                        saving: t("common.saving"),
                      }}
                      staff={staff}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : staffList.length && hasFilters ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/staff"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              description={t("staff.empty.description")}
              title={t("staff.empty.title")}
            />
          </div>
        )}
      </section>
    </div>
  );
}

async function getAuthEmailsByProfileId(staffProfiles: StaffProfile[]) {
  const admin = createAdminClient();
  const emailEntries = await Promise.all(
    staffProfiles.map(async (staff) => {
      const { data, error } = await admin.auth.admin.getUserById(staff.id);

      return [staff.id, error ? null : data.user?.email ?? null] as const;
    }),
  );

  return new Map(emailEntries);
}

function TeacherStatusForm({
  currentAdminId,
  labels,
  staff,
}: {
  currentAdminId: string;
  labels: {
    deactivate: string;
    protectedAccount: string;
    reactivate: string;
    saving: string;
  };
  staff: StaffProfile;
}) {
  if (staff.role !== "teacher" || staff.id === currentAdminId) {
    return <span className="text-sm text-zinc-500">{labels.protectedAccount}</span>;
  }

  const nextStatus = staff.status === "active" ? "inactive" : "active";

  return (
    <form action={updateTeacherStatus}>
      <input name="profile_id" type="hidden" value={staff.id} />
      <input name="status" type="hidden" value={nextStatus} />
      <PendingSubmitButton
        className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        pendingLabel={labels.saving}
      >
        {nextStatus === "inactive" ? labels.deactivate : labels.reactivate}
      </PendingSubmitButton>
    </form>
  );
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-zinc-100 text-zinc-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function roleLabel(role: StaffProfile["role"], t: (key: string) => string) {
  if (role === "school_admin") {
    return t("roles.schoolAdmin");
  }

  return t(`roles.${role}`);
}

function statusLabel(status: string, t: (key: string) => string) {
  return t(`status.${status}`);
}

function parseStaffRole(value: string) {
  return value === "school_admin" || value === "teacher" ? value : "";
}

function parseProfileStatus(value: string) {
  return value === "active" || value === "inactive" ? value : "";
}
