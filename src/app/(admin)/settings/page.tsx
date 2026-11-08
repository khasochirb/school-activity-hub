import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { PageHead, Section, Widget } from "../_components/clean-ui";
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

  const counts = school ? await getSchoolCounts(supabase, school.id) : null;
  const checklist = counts
    ? [
        { done: Boolean(school?.name && school?.province), label: t("settings.page.checkDetails") },
        { done: counts.staff > 1, label: t("settings.page.checkTeachers") },
        { done: counts.students > 0, label: t("settings.page.checkStudents") },
        { done: counts.invites > 0, label: t("settings.page.checkInvites") },
        { done: counts.clubs > 0, label: t("settings.page.checkClub") },
        { done: counts.partners > 0, label: t("settings.page.checkPartner") },
      ]
    : [];

  return (
    <div className="cl-page">
      {school ? (
        <section className="cl-schoolhero">
          <div aria-hidden="true" className="cl-pfbanner" />
          <div className="cl-pfhead">
            <span aria-hidden="true" className="cl-schoolav">
              {school.name
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join("")
                .toUpperCase()}
            </span>
            <div className="min-w-0 pt-14">
              <h1>{school.name}</h1>
              <p className="flex flex-wrap items-center gap-2">
                {[school.province, school.slug].filter(Boolean).join(" · ")}
                <span className="cl-tag" data-tone={school.status === "active" ? "ok" : "warn"}>
                  {statusLabel(school.status, t)}
                </span>
              </p>
            </div>
          </div>
        </section>
      ) : (
        <PageHead subtitle={t("settings.description")} title={t("settings.title")} />
      )}

      {schoolError ? (
        <p className="notice-box notice-warning">
          {tf("settings.errors.loadFailed", {
            error: t("common.somethingWentWrong"),
          })}
        </p>
      ) : null}

      {counts ? (
        <div className="cl-facts">
          {[
            [t("settings.page.students"), counts.students],
            [t("settings.page.staff"), counts.staff],
            [t("settings.page.clubs"), counts.clubs],
            [t("settings.page.partners"), counts.partners],
          ].map(([label, value]) => (
            <div className="cl-card" key={String(label)}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>
      ) : null}

      {school ? (
        <div className="cl-split">
          <div className="cl-main">
            <Section title={t("settings.update.title")}>
              <div className="cl-card cl-panel">
                <p className="text-[13.5px] text-[var(--muted)]">{t("settings.update.description")}</p>
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
            </Section>
            <Section title={t("settings.schoolInfo.title")}>
              <dl className="cl-card cl-panel cl-kv">
                <div>
                  <dt>{t("settings.fields.schoolName")}</dt>
                  <dd>{school.name}</dd>
                </div>
                <div>
                  <dt>{t("settings.fields.province")}</dt>
                  <dd>{school.province ?? "-"}</dd>
                </div>
                <div>
                  <dt>{t("settings.fields.slug")}</dt>
                  <dd>{school.slug}</dd>
                </div>
                <div>
                  <dt>{t("settings.fields.status")}</dt>
                  <dd>{statusLabel(school.status, t)}</dd>
                </div>
              </dl>
            </Section>
          </div>
          <aside className="cl-side">
            <Widget title={t("settings.page.checklist")}>
              <ul className="flex flex-col gap-2.5 text-[13.5px]">
                {checklist.map((item) => (
                  <li className="flex items-center justify-between gap-2" key={item.label}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="cl-dot"
                        style={{ "--c": item.done ? "var(--cl-green)" : "var(--cl-faint)" } as React.CSSProperties}
                      />
                      {item.label}
                    </span>
                    <span className="cl-tag" data-tone={item.done ? "ok" : "blue"}>
                      {item.done ? t("settings.page.done") : t("settings.page.next")}
                    </span>
                  </li>
                ))}
              </ul>
            </Widget>
            <Widget
              link={{ href: "/school-connections", label: t("settings.page.network") }}
              title={t("settings.page.partners")}
            >
              <p className="text-[13.5px] text-[var(--muted)]">
                {tf("settings.page.partnerCount", { count: counts?.partners ?? 0 })}
              </p>
            </Widget>
          </aside>
        </div>
      ) : (
        <p className="cl-card cl-empty">{t("settings.empty.noSchool")}</p>
      )}
    </div>
  );
}

async function getSchoolCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
) {
  const head = { count: "exact" as const, head: true };
  const [students, staff, clubs, invites, partners] = await Promise.all([
    supabase.from("student_rosters").select("id", head).eq("school_id", schoolId).eq("status", "active"),
    supabase.from("profiles").select("id", head).eq("school_id", schoolId).in("role", ["school_admin", "teacher"]).eq("status", "active"),
    supabase.from("clubs").select("id", head).eq("school_id", schoolId).eq("status", "active"),
    supabase.from("invite_codes").select("id", head).eq("school_id", schoolId),
    supabase
      .from("school_connections")
      .select("id", head)
      .eq("status", "approved")
      .or(`requester_school_id.eq.${schoolId},receiver_school_id.eq.${schoolId}`),
  ]);

  return {
    clubs: clubs.count ?? 0,
    invites: invites.count ?? 0,
    partners: partners.count ?? 0,
    staff: staff.count ?? 0,
    students: students.count ?? 0,
  };
}

function statusLabel(status: string, t: (key: string) => string) {
  return t(`status.${status}`);
}
