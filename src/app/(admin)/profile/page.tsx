import { redirect } from "next/navigation";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
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
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          {t("profile.title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("profile.description")}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">
          {t("profile.accountDetails")}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailItem
            label={t("profile.fields.email")}
            value={user.email ?? t("profile.fallback.notAvailable")}
          />
          <DetailItem
            label={t("profile.fields.fullName")}
            value={profile?.full_name ?? t("profile.fallback.noProfileFound")}
          />
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
      </section>

      {profile ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("profile.settings.title")}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {t("profile.settings.description")}
          </p>
          <div className="mt-4">
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
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("profile.settings.title")}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {t("profile.settings.noProfileRow")}
          </p>
        </section>
      )}

      {profile?.role === "student" ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            {t("profile.roster.title")}
          </h2>
          {studentRoster ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
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
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-900">
        {value}
      </dd>
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
