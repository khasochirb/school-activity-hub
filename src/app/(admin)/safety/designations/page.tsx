import Link from "next/link";
import { requireSchoolAdminForSensitiveWorkflow } from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "../../_components/page-ui";
import { DesignationForm } from "./designation-form";

type StaffProfile = {
  full_name: string;
  id: string;
  role: "school_admin" | "teacher";
  status: "active" | "inactive";
};

type Designation = {
  assigned_at: string;
  profile_id: string;
  status: "active" | "inactive";
};

export default async function SafeguardingDesignationsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await requireSchoolAdminForSensitiveWorkflow();
  const supabase = await createClient();
  const [staffResult, designationResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, status")
      .eq("school_id", profile.school_id)
      .in("role", ["school_admin", "teacher"])
      .order("full_name")
      .returns<StaffProfile[]>(),
    supabase
      .from("safeguarding_staff_designations")
      .select("profile_id, status, assigned_at")
      .eq("school_id", profile.school_id)
      .returns<Designation[]>(),
  ]);

  if (staffResult.error || designationResult.error) {
    logServerError(
      "Safeguarding designation page query failed",
      staffResult.error ?? designationResult.error,
    );
  }

  const designations = new Map(
    (designationResult.data ?? []).map((designation) => [
      designation.profile_id,
      designation,
    ]),
  );
  const staff = staffResult.data ?? [];
  const hasLoadError = Boolean(staffResult.error || designationResult.error);

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="btn btn-secondary" href="/safety" prefetch={false}>
            {t("safety.actions.back")}
          </Link>
        }
        description={t("safety.designations.description")}
        title={t("safety.designations.title")}
      />

      <section className="notice-box notice-warning">
        <p className="font-bold">{t("safety.designations.warningTitle")}</p>
        <p className="mt-2 text-sm leading-6">{t("safety.designations.warningDescription")}</p>
      </section>

      {hasLoadError ? (
        <section className="notice-box notice-danger" role="alert">
          {t("safety.designations.errors.loadFailed")}
        </section>
      ) : staff.length ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {staff.map((staffMember) => {
            const designation = designations.get(staffMember.id);
            const designationStatus = designation?.status ?? "unassigned";

            return (
              <article className="section-card section-card-padded" key={staffMember.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-bold text-slate-950">
                      {staffMember.full_name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {staffMember.role === "school_admin"
                        ? t("roles.schoolAdmin")
                        : t("roles.teacher")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={designationStatus}>
                        {designationStatus === "unassigned"
                          ? t("safety.designations.unassigned")
                          : designationStatus === "active"
                            ? t("common.active")
                            : t("common.inactive")}
                      </StatusBadge>
                      {staffMember.status === "inactive" ? (
                        <StatusBadge status="inactive">{t("status.inactive")}</StatusBadge>
                      ) : null}
                    </div>
                    {designation ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {t("safety.designations.assignedAt")}: {formatDateTime(designation.assigned_at, locale)}
                      </p>
                    ) : null}
                  </div>
                  {staffMember.status === "active" || designationStatus === "active" ? (
                    <DesignationForm
                      labels={{
                        activate: t("safety.designations.actions.activate"),
                        activating: t("safety.designations.actions.activating"),
                        deactivate: t("safety.designations.actions.deactivate"),
                        deactivating: t("safety.designations.actions.deactivating"),
                      }}
                      profileId={staffMember.id}
                      status={designationStatus}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          description={t("safety.designations.emptyDescription")}
          title={t("safety.designations.emptyTitle")}
        />
      )}
    </div>
  );
}
