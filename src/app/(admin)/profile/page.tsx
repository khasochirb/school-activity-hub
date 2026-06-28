import { redirect } from "next/navigation";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import {
  DetailsDisclosure,
  PageHeader,
} from "../_components/page-ui";
import { ProfileForm } from "./profile-form";

type Profile = {
  id: string;
  school_id: string;
  full_name: string;
  role: "school_admin" | "teacher" | "student";
  status: string;
};

type School = {
  name: string;
};

type StudentRoster = {
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  grade_level: string | null;
  homeroom: string | null;
  student_number: string | null;
  status: string;
};

export default async function ProfilePage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  if (profile) {
    const { data: schoolData } = await supabase
      .from("schools")
      .select("name")
      .eq("id", profile.school_id)
      .maybeSingle<School>();

    school = schoolData;

    if (profile.role === "student") {
      const { data: rosterData } = await supabase
        .from("student_rosters")
        .select(
          "first_name, last_name, preferred_name, grade_level, homeroom, student_number, status",
        )
        .eq("school_id", profile.school_id)
        .eq("profile_id", profile.id)
        .maybeSingle<StudentRoster>();

      studentRoster = rosterData;
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        description={t("profile.description")}
        title={t("profile.title")}
      />

      <section className="section-card section-card-padded">
        <h2 className="section-title">{t("profile.accountDetails")}</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <DetailItem
            label={t("profile.fields.email")}
            value={user.email ?? t("profile.fallback.notAvailable")}
          />
          <DetailItem
            label={t("profile.fields.fullName")}
            value={profile?.full_name ?? t("profile.fallback.noProfileFound")}
          />
        </dl>
        <DetailsDisclosure label={t("common.viewDetails")}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailItem
              label={t("profile.fields.role")}
              value={profile ? roleLabel(profile.role, t) : "-"}
            />
            <DetailItem
              label={t("profile.fields.school")}
              value={school?.name ?? "-"}
            />
            <DetailItem
              label={t("profile.fields.status")}
              value={profile ? statusLabel(profile.status, t) : "-"}
            />
          </dl>
        </DetailsDisclosure>
      </section>

      {profile ? (
        <section className="section-card section-card-padded">
          <h2 className="section-title">{t("profile.settings.title")}</h2>
          <p className="section-description">{t("profile.settings.description")}</p>
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
        </section>
      ) : (
        <section className="section-card section-card-padded">
          <h2 className="section-title">{t("profile.settings.title")}</h2>
          <p className="section-description">{t("profile.settings.noProfileRow")}</p>
        </section>
      )}

      {profile?.role === "student" ? (
        <section className="section-card section-card-padded">
          <h2 className="section-title">{t("profile.roster.title")}</h2>
          {studentRoster ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailItem
                label={t("profile.roster.name")}
                value={studentRosterName(studentRoster)}
              />
              <DetailItem
                label={t("profile.roster.grade")}
                value={studentRoster.grade_level ?? "-"}
              />
              <DetailItem
                label={t("profile.roster.classGroup")}
                value={studentRoster.homeroom ?? "-"}
              />
              <DetailItem
                label={t("profile.roster.studentNumber")}
                value={studentRoster.student_number ?? "-"}
              />
              <DetailItem
                label={t("profile.roster.status")}
                value={statusLabel(studentRoster.status, t)}
              />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              {t("profile.roster.notFound")}
            </p>
          )}
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

function studentRosterName(student: StudentRoster) {
  return student.preferred_name
    ? `${student.first_name} ${student.last_name} (${student.preferred_name})`
    : `${student.first_name} ${student.last_name}`;
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
