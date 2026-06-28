import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";
import {
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../_components/page-ui";
import { markStudentInactive } from "./actions";
import { CreateStudentForm } from "./create-student-form";
import { ImportStudentsForm } from "./import-students-form";

type StaffProfile = {
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom: string | null;
  student_number: string | null;
  status: string;
  created_at: string;
};

export default async function StudentsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("students.query.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("students.query.profile", () =>
    supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .maybeSingle<StaffProfile>(),
  );

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: students, error } = await timeServer(
    "students.query.roster-list",
    () =>
      supabase
        .from("student_rosters")
        .select(
          "id, first_name, last_name, grade_level, homeroom, student_number, status, created_at",
        )
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .returns<Student[]>(),
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <HeaderActionLink href="#add-student">
              {t("students.actions.add")}
            </HeaderActionLink>
            <HeaderActionLink href="#import-csv" variant="secondary">
              {t("students.actions.importCsv")}
            </HeaderActionLink>
          </>
        }
        description={t("students.description")}
        eyebrow={t("students.eyebrow")}
        title={t("students.title")}
      />

      <section className="section-card section-card-padded" id="add-student">
        <h2 className="section-title">{t("students.addSection.title")}</h2>
        <p className="section-description">
          {t("students.addSection.description")}
        </p>
        <div className="mt-4">
          <CreateStudentForm
            labels={{
              adding: t("students.form.adding"),
              classGroup: t("students.form.classGroup"),
              fullName: t("students.form.fullName"),
              grade: t("students.form.grade"),
              studentNumber: t("students.form.studentNumber"),
              submit: t("students.form.submit"),
            }}
          />
        </div>
      </section>

      <section className="section-card section-card-padded" id="import-csv">
        <h2 className="section-title">{t("students.importSection.title")}</h2>
        <p className="section-description">
          {t("students.importSection.description")}
        </p>
        <div className="mt-4">
          <ImportStudentsForm
            labels={{
              fileLabel: t("students.import.fileLabel"),
              importing: t("students.import.importing"),
              sampleCsv: t("students.import.sampleCsv"),
              sampleTitle: t("students.import.sampleTitle"),
              submit: t("students.import.submit"),
            }}
          />
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">{t("students.roster.title")}</h2>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("students.errors.loadFailed", { error: error.message })}
            </p>
          ) : null}
        </div>
        {students?.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("students.table.fullName")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("students.table.grade")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("students.table.classGroup")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("students.table.studentNumber")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("students.table.status")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("students.table.created")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("students.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {student.grade_level}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {student.homeroom || "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {student.student_number || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={student.status}>
                          {statusLabel(student.status, t)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(student.created_at, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <InactiveForm
                          labels={{
                            alreadyInactive: t(
                              "students.actions.alreadyInactive",
                            ),
                            markInactive: t("students.actions.markInactive"),
                            saving: t("common.saving"),
                          }}
                          student={student}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-200 md:hidden">
              {students.map((student) => (
                <article className="p-4" key={student.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {student.first_name} {student.last_name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {t("students.table.grade")} {student.grade_level}
                        {student.homeroom ? `, ${student.homeroom}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={student.status}>
                      {statusLabel(student.status, t)}
                    </StatusBadge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-zinc-500">
                        {t("students.table.studentNumber")}
                      </dt>
                      <dd className="text-zinc-800">
                        {student.student_number || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("students.table.created")}
                      </dt>
                      <dd className="text-zinc-800">
                        {formatDate(student.created_at, locale)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <InactiveForm
                      labels={{
                        alreadyInactive: t("students.actions.alreadyInactive"),
                        markInactive: t("students.actions.markInactive"),
                        saving: t("common.saving"),
                      }}
                      student={student}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                <>
                  <HeaderActionLink href="#add-student">
                    {t("students.actions.add")}
                  </HeaderActionLink>
                  <HeaderActionLink href="#import-csv" variant="secondary">
                    {t("students.actions.importCsv")}
                  </HeaderActionLink>
                </>
              }
              description={t("students.empty.description")}
              title={t("students.empty.title")}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function InactiveForm({
  labels,
  student,
}: {
  labels: {
    alreadyInactive: string;
    markInactive: string;
    saving: string;
  };
  student: Student;
}) {
  if (student.status !== "active") {
    return <span className="text-sm text-zinc-500">{labels.alreadyInactive}</span>;
  }

  return (
    <form action={markStudentInactive}>
      <input name="student_id" type="hidden" value={student.id} />
      <PendingSubmitButton
        className="btn btn-secondary min-h-9 px-3"
        pendingLabel={labels.saving}
      >
        {labels.markInactive}
      </PendingSubmitButton>
    </form>
  );
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === "active") {
    return t("status.active");
  }

  if (status === "inactive") {
    return t("status.inactive");
  }

  return status;
}
