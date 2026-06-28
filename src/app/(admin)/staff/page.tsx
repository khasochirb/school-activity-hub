import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

export default async function StaffPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
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

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          {t("staff.title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("staff.description")}
        </p>
        {school?.name ? (
          <p className="mt-1 text-xs font-medium text-zinc-500">
            {school.name}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">
          {t("staff.create.title")}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          {t("staff.create.description")}
        </p>
        <div className="mt-4">
          <CreateTeacherForm
            labels={{
              create: t("staff.actions.createTeacher"),
              creating: t("staff.actions.creating"),
              email: t("staff.form.email"),
              fullName: t("staff.form.fullName"),
              temporaryPassword: t("staff.form.temporaryPassword"),
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("staff.profiles.title")}
          </h2>
          {staffError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("staff.errors.loadFailed", { error: staffError.message })}
            </p>
          ) : null}
        </div>
        {staffProfiles?.length ? (
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
                  {staffProfiles.map((staff) => (
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
              {staffProfiles.map((staff) => (
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
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
        ) : (
          <div className="p-6">
            <p className="text-sm font-medium text-zinc-950">
              {t("staff.empty.title")}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {t("staff.empty.description")}
            </p>
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
