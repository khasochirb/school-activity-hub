import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  ACTIVITY_CATEGORIES,
  getActivityCategoryTranslationKey,
} from "@/lib/activity-categories";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getSearchParam } from "@/lib/list-filters";
import { loadStudentInterests } from "@/lib/students/student-interests";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../_components/page-ui";
import { saveStudentInterests } from "./actions";

type Profile = {
  id: string;
  role: "school_admin" | "teacher" | "student";
};

type InterestsSearchParams = {
  error?: string | string[];
  from?: string | string[];
};

export default async function StudentInterestsPage({
  searchParams,
}: {
  searchParams: Promise<InterestsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const params = await searchParams;
  const returnTo = getSearchParam(params.from) === "clubs" ? "/clubs" : "/profile";
  const hasSaveError = getSearchParam(params.error) === "save";
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .eq("status", "active")
    .maybeSingle<Profile>();

  if (!profile || profile.role !== "student") {
    redirect("/profile");
  }

  const { available, interests } = await loadStudentInterests(
    supabase,
    profile.id,
  );
  const selected = new Set(interests);

  return (
    <div className="page-stack">
      <PageHeader
        description={t("studentProfile.interestsPage.description")}
        eyebrow={t("studentProfile.interests.title")}
        title={t("studentProfile.interestsPage.title")}
      />

      <section className="section-card section-card-padded">
        {hasSaveError ? (
          <p className="notice-danger mb-4 rounded-md p-3 text-sm" role="alert">
            {t("studentProfile.interestsPage.saveFailed")}
          </p>
        ) : null}
        {!available ? (
          <p className="mb-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
            {t("studentProfile.interestsPage.notReady")}
          </p>
        ) : null}
        <form action={saveStudentInterests} className="flex flex-col gap-5">
          <input name="return_to" type="hidden" value={returnTo} />
          <fieldset disabled={!available}>
            <legend className="sr-only">
              {t("studentProfile.interestsPage.title")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_CATEGORIES.map((category) => (
                <label
                  className="interactive-chip inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white px-4 text-base font-semibold text-zinc-800 has-[:checked]:border-[var(--ink)] has-[:checked]:bg-[var(--ink)] has-[:checked]:text-[var(--ink-contrast)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--primary)] sm:min-h-10 sm:text-sm"
                  key={category}
                >
                  <input
                    className="peer sr-only"
                    defaultChecked={selected.has(category)}
                    name="interests"
                    type="checkbox"
                    value={category}
                  />
                  <span aria-hidden="true" className="text-xs peer-checked:hidden">
                    +
                  </span>
                  <span aria-hidden="true" className="hidden text-xs peer-checked:inline">
                    ✓
                  </span>
                  {categoryLabel(category, t)}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-zinc-600">
            {t("studentProfile.privacyNote")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PendingSubmitButton
              className="btn btn-primary min-h-12 w-full px-5 text-base sm:min-h-10 sm:w-auto sm:text-sm"
              disabled={!available}
              pendingLabel={t("common.saving")}
            >
              {t("studentProfile.interestsPage.save")}
            </PendingSubmitButton>
            <Link
              className="btn btn-secondary min-h-12 w-full px-5 text-base sm:min-h-10 sm:w-auto sm:text-sm"
              href={returnTo}
              prefetch={false}
            >
              {t("studentProfile.interestsPage.notNow")}
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function categoryLabel(category: string, t: (key: string) => string) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
