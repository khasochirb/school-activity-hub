import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .maybeSingle<StaffProfile>();

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: students, error } = await supabase
    .from("student_rosters")
    .select(
      "id, first_name, last_name, grade_level, homeroom, student_number, status, created_at",
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .returns<Student[]>();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Students</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Build the school roster first. Students can only join after staff add
          them here and generate an invite code.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Add one student</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Use this for quick additions or small pilot rosters.
        </p>
        <div className="mt-4">
          <CreateStudentForm />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">
          Import students
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload a CSV with one row per student when you are preparing a larger
          roster.
        </p>
        <div className="mt-4">
          <ImportStudentsForm />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Roster</h2>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              Students could not be loaded: {error.message}
            </p>
          ) : null}
        </div>
        {students?.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Full name</th>
                    <th className="px-4 py-3 font-medium">Grade</th>
                    <th className="px-4 py-3 font-medium">Class group</th>
                    <th className="px-4 py-3 font-medium">Student number</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
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
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(student.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <InactiveForm student={student} />
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
                        Grade {student.grade_level}
                        {student.homeroom ? `, ${student.homeroom}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={student.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-zinc-500">Student number</dt>
                      <dd className="text-zinc-800">
                        {student.student_number || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Created</dt>
                      <dd className="text-zinc-800">
                        {formatDate(student.created_at)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <InactiveForm student={student} />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="p-6">
            <p className="text-sm font-medium text-zinc-950">No students yet</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Add one student manually or import a CSV before generating invite
              codes.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";

  return (
    <span
      className={
        isActive
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {status}
    </span>
  );
}

function InactiveForm({ student }: { student: Student }) {
  if (student.status !== "active") {
    return <span className="text-sm text-zinc-500">Already inactive</span>;
  }

  return (
    <form action={markStudentInactive}>
      <input name="student_id" type="hidden" value={student.id} />
      <PendingSubmitButton
        className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        pendingLabel="Saving..."
      >
        Mark as inactive
      </PendingSubmitButton>
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
