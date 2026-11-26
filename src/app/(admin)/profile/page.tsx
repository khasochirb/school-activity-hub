import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  loadStudentProfileData,
  type StudentProfileData,
} from "@/lib/students/student-profile-data";
import { createClient } from "@/lib/supabase/server";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { setShowNameToClassmates } from "./actions";
import { ProfileForm } from "./profile-form";
import { PageHead, Section, Widget } from "../_components/clean-ui";
import { StudentProfile, StudentProfileHero } from "./student-profile";

type Profile = {
  id: string;
  school_id: string;
  full_name: string;
  role: "school_admin" | "teacher" | "student";
  status: string;
};

type School = {
  name: string;
  timezone: string | null;
};

type StudentRoster = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  grade_level: string | null;
  homeroom: string | null;
  show_name_to_classmates?: boolean | null;
  student_number: string | null;
  status: string;
};

export default async function ProfilePage() {
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
    .select("id, school_id, full_name, role, status")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  let school: School | null = null;
  let studentRoster: StudentRoster | null = null;
  let studentData: StudentProfileData | null = null;

  if (profile) {
    const { data: schoolData } = await supabase
      .from("schools")
      .select("name, timezone")
      .eq("id", profile.school_id)
      .maybeSingle<School>();

    school = schoolData;

    if (profile.role === "student") {
      const { data: rosterData } = await supabase
        .from("student_rosters")
        .select(
          "id, first_name, last_name, preferred_name, grade_level, homeroom, student_number, status, show_name_to_classmates",
        )
        .eq("school_id", profile.school_id)
        .eq("profile_id", profile.id)
        .maybeSingle<StudentRoster>();

      studentRoster = rosterData;

      if (profile.status === "active") {
        studentData = await loadStudentProfileData(
          supabase,
          profile,
          studentRoster?.status === "active" ? studentRoster.id : null,
          new Date(),
        );
      }
    }
  }

  return (
    <div className="cl-page">
      {profile && studentData ? (
        <StudentProfileHero
          data={studentData}
          displayName={studentDisplayName(studentRoster, profile.full_name)}
          gradeLine={[studentGradeLine(studentRoster, t), school?.name].filter(Boolean).join(" · ") || null}
          t={t}
        />
      ) : (
        <PageHead subtitle={t("profile.description")} title={t("profile.title")} />
      )}

      <div className="cl-split">
        <div className="cl-main">
          {profile && studentData ? (
            <StudentProfile
              data={studentData}
              locale={locale}
              t={t}
              tf={tf}
              timeZone={school?.timezone ?? undefined}
            />
          ) : (
            <Section title={t("profile.settings.title")}>
              <div className="cl-card cl-panel">
                {profile ? (
                  <>
                    <p className="text-sm text-[var(--muted)]">{t("profile.settings.description")}</p>
                    <ProfileForm
                      fullName={profile.full_name}
                      labels={{
                        fullName: t("profile.fields.fullName"),
                        save: t("profile.actions.save"),
                        saving: t("common.saving"),
                      }}
                    />
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted)]">{t("profile.settings.noProfileRow")}</p>
                )}
              </div>
            </Section>
          )}
        </div>

        <aside className="cl-side">
          {profile?.role === "student" ? (
            <Widget
              link={{ href: "/portfolio", label: t("dashboard.portfolioPrompt.action") }}
              title={t("dashboard.portfolioPrompt.title")}
            >
              <p className="text-[13.5px] text-[var(--muted)]">
                {t("dashboard.portfolioPrompt.description")}
              </p>
            </Widget>
          ) : null}

          {studentRoster?.status === "active" ? (
            <Widget title={t("profile.classmates.title")}>
              <form action={setShowNameToClassmates} className="flex flex-col gap-3">
                <label className="flex items-start gap-3 text-[13.5px] text-[var(--muted)]">
                  <input
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
                    defaultChecked={studentRoster.show_name_to_classmates !== false}
                    name="show_name"
                    type="checkbox"
                  />
                  <span>{t("profile.classmates.description")}</span>
                </label>
                <PendingSubmitButton
                  className="btn btn-secondary min-h-10 w-full px-4"
                  pendingLabel={t("common.saving")}
                  toastMessage={t("common.saving")}
                >
                  {t("common.save")}
                </PendingSubmitButton>
              </form>
            </Widget>
          ) : null}

          <Widget title={t("profile.accountDetails")}>
            <dl className="cl-kv">
              <div>
                <dt>{t("profile.fields.email")}</dt>
                <dd className="break-all">{user.email ?? t("profile.fallback.notAvailable")}</dd>
              </div>
              <div>
                <dt>{t("profile.fields.fullName")}</dt>
                <dd>{profile?.full_name ?? t("profile.fallback.noProfileFound")}</dd>
              </div>
              <div>
                <dt>{t("profile.fields.role")}</dt>
                <dd>{profile ? roleLabel(profile.role, t) : "-"}</dd>
              </div>
              <div>
                <dt>{t("profile.fields.school")}</dt>
                <dd>{school?.name ?? "-"}</dd>
              </div>
              <div>
                <dt>{t("profile.fields.status")}</dt>
                <dd>{profile ? statusLabel(profile.status, t) : "-"}</dd>
              </div>
            </dl>
            {profile && studentData ? (
              <details className="cl-decline">
                <summary className="cl-widget-link">{t("profile.settings.title")}</summary>
                <div className="mt-3">
                  <ProfileForm
                    fullName={profile.full_name}
                    labels={{
                      fullName: t("profile.fields.fullName"),
                      save: t("profile.actions.save"),
                      saving: t("common.saving"),
                    }}
                  />
                </div>
              </details>
            ) : null}
          </Widget>

          {profile?.role === "student" ? (
            <Widget title={t("profile.roster.title")}>
              {studentRoster ? (
                <dl className="cl-kv">
                  <div>
                    <dt>{t("profile.roster.name")}</dt>
                    <dd>{studentRosterName(studentRoster)}</dd>
                  </div>
                  <div>
                    <dt>{t("profile.roster.grade")}</dt>
                    <dd>{studentRoster.grade_level ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>{t("profile.roster.classGroup")}</dt>
                    <dd>{studentRoster.homeroom ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>{t("profile.roster.studentNumber")}</dt>
                    <dd>{studentRoster.student_number ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>{t("profile.roster.status")}</dt>
                    <dd>{statusLabel(studentRoster.status, t)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-[var(--muted)]">{t("profile.roster.notFound")}</p>
              )}
            </Widget>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function studentRosterName(student: StudentRoster) {
  return student.preferred_name
    ? `${student.first_name} ${student.last_name} (${student.preferred_name})`
    : `${student.first_name} ${student.last_name}`;
}

function studentDisplayName(student: StudentRoster | null, fullName: string) {
  if (!student) {
    return fullName;
  }

  return student.preferred_name || `${student.first_name} ${student.last_name}`;
}

function studentGradeLine(
  student: StudentRoster | null,
  t: (key: string) => string,
) {
  if (!student) {
    return null;
  }

  const parts = [
    student.grade_level
      ? `${t("profile.roster.grade")}: ${student.grade_level}`
      : null,
    student.homeroom
      ? `${t("profile.roster.classGroup")}: ${student.homeroom}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : null;
}

function roleLabel(role: Profile["role"], t: (key: string) => string) {
  if (role === "school_admin") {
    return t("roles.schoolAdmin");
  }

  return t(`roles.${role}`);
}

function statusLabel(status: string, t: (key: string) => string) {
  return t(`status.${status}`);
}
