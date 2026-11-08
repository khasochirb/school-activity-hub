import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
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
  FormSectionToggleButton,
  NoResultsState,
} from "../_components/page-ui";
import { updateTeacherStatus } from "./actions";
import Link from "next/link";
import { PageHead, Widget } from "../_components/clean-ui";
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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .eq("status", "active")
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

  const teachers = staffList.filter((staff) => staff.role === "teacher");
  const admins = staffList.filter((staff) => staff.role === "school_admin");
  const activeCount = staffList.filter((staff) => staff.status === "active").length;
  const chip = (overrides: { role?: string; status?: string }) => {
    const query = new URLSearchParams();
    const role = overrides.role ?? selectedRole;
    const status = overrides.status ?? selectedStatus;
    if (searchQuery) query.set("q", searchQuery);
    if (role) query.set("role", role);
    if (status) query.set("status", status);
    const search = query.toString();
    return search ? `/staff?${search}` : "/staff";
  };

  return (
    <div className="cl-page">
      <PageHead
        action={
          <FormSectionToggleButton targetId="create-teacher">
            + {t("staff.actions.createTeacher")}
          </FormSectionToggleButton>
        }
        subtitle={tf("staff.list.subtitle", {
          admins: admins.length,
          school: school?.name ?? "",
          teachers: teachers.filter((staff) => staff.status === "active").length,
        })}
        title={t("staff.title")}
      />

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

      <div className="cl-filters">
        {([
          ["", t("staff.list.everyone")],
          ["teacher", t("staff.list.teachers")],
          ["school_admin", t("staff.list.admins")],
        ] as const).map(([value, label]) => (
          <Link
            aria-current={selectedRole === value ? "page" : undefined}
            className="cl-chip"
            href={chip({ role: value })}
            key={value || "everyone"}
            prefetch={false}
          >
            {label}
          </Link>
        ))}
        <span aria-hidden="true" className="cl-filters-divider" />
        {([
          ["active", t("filters.active")],
          ["inactive", t("filters.inactive")],
          ["", t("staff.list.anyStatus")],
        ] as const).map(([value, label]) => (
          <Link
            aria-current={selectedStatus === value ? "page" : undefined}
            className="cl-chip"
            href={chip({ status: value })}
            key={value || "any"}
            prefetch={false}
          >
            {label}
          </Link>
        ))}
        <form action="/staff" className="cl-search" role="search">
          <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">{t("filters.search")}</span>
          <input defaultValue={searchQuery} name="q" placeholder={t("filters.searchStaff")} type="search" />
          {selectedRole ? <input name="role" type="hidden" value={selectedRole} /> : null}
          {selectedStatus ? <input name="status" type="hidden" value={selectedStatus} /> : null}
        </form>
      </div>

      <div className="cl-split">
        <section className="cl-sec">
          <header>
            <h2>{t("staff.profiles.title")}</h2>
            <span className="text-sm text-[var(--muted)]">
              {filteredStaff.length} / {staffList.length}
            </span>
          </header>
          {staffError ? (
            <p className="notice-box notice-warning">
              {tf("staff.errors.loadFailed", {
                error: t("common.somethingWentWrong"),
              })}
            </p>
          ) : null}
          {staffList.length && filteredStaff.length ? (
            <div className="cl-card cl-rows">
              {filteredStaff.map((staff) => (
                <div className="cl-row" key={staff.id}>
                  <span aria-hidden="true" className="cl-av">
                    {staff.full_name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="cl-grow">
                    <span className="cl-row-title">
                      {staff.full_name}
                      {staff.id === profile.id ? ` (${t("staff.list.you")})` : ""}
                    </span>
                    <span className="cl-row-sub break-all">
                      {emailByProfileId.get(staff.id) ?? t("staff.fallback.emailUnavailable")}
                    </span>
                  </span>
                  <span className="cl-row-cols">
                    <span>{tf("staff.list.added", { date: formatDate(staff.created_at, locale) })}</span>
                  </span>
                  <span className="cl-tag" data-tone={staff.role === "school_admin" ? "blue" : undefined}>
                    {roleLabel(staff.role, t)}
                  </span>
                  <span className="cl-tag" data-tone={staff.status === "active" ? "ok" : "warn"}>
                    {statusLabel(staff.status, t)}
                  </span>
                  <TeacherStatusForm
                            currentAdminId={profile.id}
                            labels={{
                              cancel: t("common.cancel"),
                              confirm: t("feedback.confirm"),
                              confirmDeactivate: t("feedback.deactivateStaff"),
                              confirmDescription: t("feedback.cannotBeUndone"),
                              confirmReactivate: t("feedback.reactivateStaff"),
                              deactivate: t("staff.actions.deactivateTeacher"),
                              protectedAccount: t("staff.actions.protectedAccount"),
                              reactivate: t("staff.actions.reactivateTeacher"),
                              saving: t("common.saving"),
                            }}
                            staff={staff}
                          />
                </div>
              ))}
            </div>
          ) : staffList.length && hasFilters ? (
            <NoResultsState
              clearHref="/staff"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          ) : (
            <p className="cl-card cl-empty">{t("staff.empty.title")}</p>
          )}
          <p className="text-[13px] text-[var(--muted)]">{t("staff.list.protectedNote")}</p>
        </section>

        <aside className="cl-side">
          <Widget title={t("staff.list.yourTeam")}>
            <p className="cl-statline">
              <span>
                <b>{activeCount}</b>
                {t("filters.active")}
              </span>
              <span>
                <b>{staffList.length - activeCount}</b>
                {t("filters.inactive")}
              </span>
            </p>
            {([
              [t("staff.list.teachers"), teachers.length, "var(--primary)"],
              [t("staff.list.admins"), admins.length, "var(--cl-sun)"],
              [t("filters.inactive"), staffList.length - activeCount, "var(--cl-faint)"],
            ] as const).map(([label, count, color]) => (
              <div className="cl-goal" key={label}>
                <div>
                  <span>{label}</span>
                  <b>{count}</b>
                </div>
                <div className="cl-bar" style={{ "--c": color } as React.CSSProperties}>
                  <i style={{ width: `${staffList.length ? (count / staffList.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </Widget>
          <Widget title={t("staff.list.recentlyAdded")}>
            {staffList.slice(0, 3).map((staff) => (
              <div key={staff.id}>
                <b className="block text-sm">{staff.full_name}</b>
                <span className="text-[13px] text-[var(--muted)]">
                  {roleLabel(staff.role, t)} · {formatDate(staff.created_at, locale)}
                </span>
              </div>
            ))}
          </Widget>
        </aside>
      </div>
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
    cancel: string;
    confirm: string;
    confirmDeactivate: string;
    confirmDescription: string;
    confirmReactivate: string;
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
      <ConfirmSubmitButton
        cancelLabel={labels.cancel}
        className="btn btn-quiet min-h-9 px-3"
        confirmDescription={labels.confirmDescription}
        confirmLabel={labels.confirm}
        confirmTitle={
          nextStatus === "inactive"
            ? labels.confirmDeactivate
            : labels.confirmReactivate
        }
        pendingLabel={labels.saving}
      >
        {nextStatus === "inactive" ? labels.deactivate : labels.reactivate}
      </ConfirmSubmitButton>
    </form>
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
