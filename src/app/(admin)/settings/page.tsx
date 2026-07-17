import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import {
  DetailsDisclosure,
  PageHeader,
} from "../_components/page-ui";
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
  const user = await getCurrentUser();

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
    <div className="page-stack">
      <PageHeader
        description={t("settings.description")}
        title={t("settings.title")}
      />

      <section className="section-card section-card-padded">
        <h2 className="section-title">{t("settings.schoolInfo.title")}</h2>
        {schoolError ? (
          <p className="mt-2 text-sm text-red-600">
            {tf("settings.errors.loadFailed", { error: schoolError.message })}
          </p>
        ) : null}
        {school ? (
          <>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailItem
                label={t("settings.fields.schoolName")}
                value={school.name}
              />
              <DetailItem
                label={t("settings.fields.province")}
                value={school.province ?? "-"}
              />
            </dl>
            <DetailsDisclosure label={t("common.viewDetails")}>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label={t("settings.fields.slug")}
                  value={school.slug}
                />
                <DetailItem
                  label={t("settings.fields.status")}
                  value={statusLabel(school.status, t)}
                />
              </dl>
            </DetailsDisclosure>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            {t("settings.empty.noSchool")}
          </p>
        )}
      </section>

      {school ? (
        <section className="section-card section-card-padded">
          <h2 className="section-title">{t("settings.update.title")}</h2>
          <p className="section-description">{t("settings.update.description")}</p>
          <div className="mt-3">
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
    <div className="detail-card">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value">{value}</dd>
    </div>
  );
}

function statusLabel(status: string, t: (key: string) => string) {
  return t(`status.${status}`);
}
