import { StatusBadge } from "@/app/(admin)/_components/page-ui";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createPlatformTeacher, updatePlatformTeacherStatus } from "./actions";

export type SchoolTeacher = {
  full_name: string;
  id: string;
  status: "active" | "inactive";
};

type Translator = (key: string) => string;

export function PlatformTeachers({
  currentProfileId,
  schoolId,
  t,
  teachers,
}: {
  currentProfileId: string;
  schoolId: string;
  t: Translator;
  teachers: SchoolTeacher[];
}) {
  if (!teachers.length) {
    return <p className="mt-2 text-sm text-slate-600">{t("superAdmin.schoolDetail.teachers.empty")}</p>;
  }

  return (
    <ul className="mt-2 divide-y divide-[var(--border)]">
      {teachers.map((teacher) => {
        const active = teacher.status === "active";

        return (
          <li className="flex flex-wrap items-center justify-between gap-2 py-2" key={teacher.id}>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-950">{teacher.full_name}</span>
              <StatusBadge status={teacher.status}>{t(`status.${teacher.status}`)}</StatusBadge>
            </span>
            {teacher.id === currentProfileId ? (
              <span className="text-sm text-slate-600">{t("staff.actions.protectedAccount")}</span>
            ) : (
              <form action={updatePlatformTeacherStatus}>
                <input name="school_id" type="hidden" value={schoolId} />
                <input name="profile_id" type="hidden" value={teacher.id} />
                <input name="status" type="hidden" value={active ? "inactive" : "active"} />
                {active ? (
                  <ConfirmSubmitButton
                    cancelLabel={t("common.cancel")}
                    className="btn btn-secondary"
                    confirmDescription={t("superAdmin.schoolDetail.teachers.deactivateConfirm")}
                    confirmLabel={t("staff.actions.deactivateTeacher")}
                    confirmTitle={t("staff.actions.deactivateTeacher")}
                    pendingLabel={t("common.saving")}
                  >
                    {t("staff.actions.deactivateTeacher")}
                  </ConfirmSubmitButton>
                ) : (
                  <PendingSubmitButton className="btn btn-secondary" pendingLabel={t("common.saving")} toastMessage={t("common.saving")}>
                    {t("superAdmin.schoolDetail.teachers.reactivate")}
                  </PendingSubmitButton>
                )}
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AddTeacherForm({ schoolId, t }: { schoolId: string; t: Translator }) {
  return (
    <form action={createPlatformTeacher} className="mt-5 grid gap-3 border-t border-[var(--border)] pt-4 md:grid-cols-3">
      <input name="school_id" type="hidden" value={schoolId} />
      <label className="flex flex-col gap-2 text-sm font-semibold">
        {t("staff.form.fullName")}
        <input autoComplete="off" className="h-11 rounded-md border px-3 text-base" name="full_name" required />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        {t("staff.form.email")}
        <input autoComplete="off" className="h-11 rounded-md border px-3 text-base" name="email" required type="email" />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        {t("staff.form.temporaryPassword")}
        <input autoComplete="new-password" className="h-11 rounded-md border px-3 text-base" minLength={8} name="password" required type="password" />
      </label>
      <div className="md:col-span-3">
        <PendingSubmitButton className="btn btn-primary" pendingLabel={t("staff.actions.creating")} toastMessage={t("staff.actions.creating")}>
          {t("staff.actions.createTeacher")}
        </PendingSubmitButton>
      </div>
    </form>
  );
}
