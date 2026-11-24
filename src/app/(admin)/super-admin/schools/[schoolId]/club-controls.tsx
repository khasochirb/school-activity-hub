import Link from "next/link";
import { StatusBadge } from "@/app/(admin)/_components/page-ui";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  ACTIVITY_CATEGORIES,
  getActivityCategoryTranslationKey,
} from "@/lib/activity-categories";
import { createPlatformClub, updatePlatformClubStatus } from "./actions";

export type SchoolClub = {
  id: string;
  name: string;
  status: "active" | "archived";
};

type Translator = (key: string) => string;

export function PlatformClubs({
  clubs,
  schoolId,
  t,
}: {
  clubs: SchoolClub[];
  schoolId: string;
  t: Translator;
}) {
  if (!clubs.length) {
    return <p className="mt-2 text-sm text-slate-600">{t("superAdmin.schoolDetail.clubs.empty")}</p>;
  }

  return (
    <ul className="mt-2 divide-y divide-[var(--border)]">
      {clubs.map((club) => (
        <li className="flex flex-wrap items-center justify-between gap-2 py-2" key={club.id}>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <Link className="font-medium text-zinc-950 hover:underline" href={`/clubs/${club.id}`} prefetch={false}>
              {club.name}
            </Link>
            <StatusBadge status={club.status}>{t(`status.${club.status}`)}</StatusBadge>
          </span>
          <form action={updatePlatformClubStatus}>
            <input name="school_id" type="hidden" value={schoolId} />
            <input name="club_id" type="hidden" value={club.id} />
            <input name="status" type="hidden" value={club.status === "active" ? "archived" : "active"} />
            {club.status === "active" ? (
              <ConfirmSubmitButton
                cancelLabel={t("common.cancel")}
                className="btn btn-secondary"
                confirmDescription={t("superAdmin.schoolDetail.clubs.archiveConfirm")}
                confirmLabel={t("clubs.actions.archive")}
                confirmTitle={t("clubs.actions.archive")}
                pendingLabel={t("clubs.actions.archiving")}
              >
                {t("clubs.actions.archive")}
              </ConfirmSubmitButton>
            ) : (
              <PendingSubmitButton className="btn btn-secondary" pendingLabel={t("common.saving")} toastMessage={t("common.saving")}>
                {t("superAdmin.schoolDetail.clubs.restore")}
              </PendingSubmitButton>
            )}
          </form>
        </li>
      ))}
    </ul>
  );
}

export function AddClubForm({ schoolId, t }: { schoolId: string; t: Translator }) {
  return (
    <form action={createPlatformClub} className="mt-5 grid gap-3 border-t border-[var(--border)] pt-4 md:grid-cols-2">
      <input name="school_id" type="hidden" value={schoolId} />
      <label className="flex flex-col gap-2 text-sm font-semibold">
        {t("clubs.form.name")}
        <input className="h-11 rounded-md border px-3 text-base" maxLength={120} name="name" required />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        {t("clubs.form.category")}
        <select className="h-11 rounded-md border px-3 text-base" name="category">
          <option value="">{t("clubs.form.noCategory")}</option>
          {ACTIVITY_CATEGORIES.map((category) => {
            const key = getActivityCategoryTranslationKey(category);

            return (
              <option key={category} value={category}>
                {key ? t(key) : category}
              </option>
            );
          })}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold md:col-span-2">
        {t("clubs.form.description")}
        <textarea className="min-h-20 rounded-md border px-3 py-2 text-base" name="description" />
      </label>
      <div className="md:col-span-2">
        <PendingSubmitButton className="btn btn-primary" pendingLabel={t("clubs.actions.creating")} toastMessage={t("clubs.actions.creating")}>
          {t("clubs.actions.create")}
        </PendingSubmitButton>
      </div>
    </form>
  );
}
