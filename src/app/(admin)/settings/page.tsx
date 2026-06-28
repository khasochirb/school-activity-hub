import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { SchoolSettingsForm } from "./settings-form";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type School = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  status: string;
};

export default async function SettingsPage() {
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

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, name, slug, province, status")
    .eq("id", profile.school_id)
    .maybeSingle<School>();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          {t("settings.title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("settings.description")}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">
          {t("settings.schoolInfo.title")}
        </h2>
        {schoolError ? (
          <p className="mt-2 text-sm text-red-600">
            {tf("settings.errors.loadFailed", { error: schoolError.message })}
          </p>
        ) : null}
        {school ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem label={t("settings.fields.schoolName")} value={school.name} />
            <DetailItem label={t("settings.fields.slug")} value={school.slug} />
            <DetailItem
              label={t("settings.fields.province")}
              value={school.province ?? "-"}
            />
            <DetailItem
              label={t("settings.fields.status")}
              value={statusLabel(school.status, t)}
            />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            {t("settings.empty.noSchool")}
          </p>
        )}
      </section>

      {school ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("settings.update.title")}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {t("settings.update.description")}
          </p>
          <div className="mt-4">
            <SchoolSettingsForm
              labels={{
                province: t("settings.fields.province"),
                provincePlaceholder: t("settings.form.provincePlaceholder"),
                save: t("settings.actions.save"),
                saving: t("common.saving"),
                schoolName: t("settings.fields.schoolName"),
              }}
              name={school.name}
              province={school.province}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-900">
        {value}
      </dd>
    </div>
  );
}

function statusLabel(status: string, t: (key: string) => string) {
  return t(`status.${status}`);
}
