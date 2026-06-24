import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateTeacherStatus } from "./actions";
import { CreateTeacherForm } from "./create-teacher-form";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type School = {
  name: string;
};

type StaffProfile = {
  id: string;
  full_name: string;
  role: "school_admin" | "teacher" | "student";
  status: string;
  created_at: string;
};

export default async function StaffPage() {
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

  const admin = createAdminClient();
  const [
    { data: school },
    { data: staffProfiles, error: staffError },
  ] = await Promise.all([
    admin
      .from("schools")
      .select("name")
      .eq("id", profile.school_id)
      .maybeSingle<School>(),
    admin
      .from("profiles")
      .select("id, full_name, role, status, created_at")
      .eq("school_id", profile.school_id)
      .in("role", ["school_admin", "teacher"])
      .order("created_at", { ascending: false })
      .returns<StaffProfile[]>(),
  ]);
  const emailByProfileId = await getAuthEmailsByProfileId(staffProfiles ?? []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Staff</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Manage teacher accounts for {school?.name ?? "this school"}.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">
          Create teacher account
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Create an email/password login for a teacher. Email invitations are
          not enabled yet.
        </p>
        <div className="mt-4">
          <CreateTeacherForm />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            Staff profiles
          </h2>
          {staffError ? (
            <p className="mt-2 text-sm text-red-600">
              Staff could not be loaded: {staffError.message}
            </p>
          ) : null}
        </div>
        {staffProfiles?.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Full name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {staffProfiles.map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {staff.full_name}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {emailByProfileId.get(staff.id) ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatRole(staff.role)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={staff.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(staff.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <TeacherStatusForm
                          currentAdminId={profile.id}
                          staff={staff}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-200 md:hidden">
              {staffProfiles.map((staff) => (
                <article className="p-4" key={staff.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {staff.full_name}
                      </h3>
                      <p className="mt-1 break-all text-sm text-zinc-600">
                        {emailByProfileId.get(staff.id) ?? "Email unavailable"}
                      </p>
                    </div>
                    <StatusBadge status={staff.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-zinc-500">Role</dt>
                      <dd className="text-zinc-800">{formatRole(staff.role)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Created</dt>
                      <dd className="text-zinc-800">
                        {formatDate(staff.created_at)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <TeacherStatusForm currentAdminId={profile.id} staff={staff} />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="p-6 text-sm text-zinc-600">No staff profiles yet.</p>
        )}
      </section>
    </div>
  );
}

async function getAuthEmailsByProfileId(staffProfiles: StaffProfile[]) {
  const admin = createAdminClient();
  const emailEntries = await Promise.all(
    staffProfiles.map(async (staff) => {
      const { data, error } = await admin.auth.admin.getUserById(staff.id);

      return [staff.id, error ? null : data.user?.email ?? null] as const;
    }),
  );

  return new Map(emailEntries);
}

function TeacherStatusForm({
  currentAdminId,
  staff,
}: {
  currentAdminId: string;
  staff: StaffProfile;
}) {
  if (staff.role !== "teacher" || staff.id === currentAdminId) {
    return <span className="text-sm text-zinc-500">No action</span>;
  }

  const nextStatus = staff.status === "active" ? "inactive" : "active";

  return (
    <form action={updateTeacherStatus}>
      <input name="profile_id" type="hidden" value={staff.id} />
      <input name="status" type="hidden" value={nextStatus} />
      <button
        className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        type="submit"
      >
        {nextStatus === "inactive" ? "Deactivate" : "Reactivate"}
      </button>
    </form>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-zinc-100 text-zinc-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function formatRole(role: StaffProfile["role"]) {
  return role
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
