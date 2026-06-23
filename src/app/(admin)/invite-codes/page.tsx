import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revokeInviteCode } from "./actions";
import { GenerateInviteForm } from "./generate-invite-form";

type StaffProfile = {
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type ActiveStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
};

type InviteCode = {
  id: string;
  student_roster_id: string | null;
  status: string;
  use_count: number;
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
};

export default async function InviteCodesPage() {
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

  const [{ data: activeStudents, error: studentsError }, { data: inviteCodes, error: invitesError }] =
    await Promise.all([
      supabase
        .from("student_rosters")
        .select("id, first_name, last_name, grade_level")
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .order("last_name", { ascending: true })
        .returns<ActiveStudent[]>(),
      supabase
        .from("invite_codes")
        .select("id, student_roster_id, status, use_count, created_at, expires_at, redeemed_at")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .returns<InviteCode[]>(),
    ]);

  const studentMap = new Map(
    (activeStudents ?? []).map((student) => [student.id, student]),
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Invite Codes</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Generate one-time invite codes for rostered students.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Create invite code</h2>
        {studentsError ? (
          <p className="mt-2 text-sm text-red-600">
            Students could not be loaded: {studentsError.message}
          </p>
        ) : null}
        <div className="mt-4">
          <GenerateInviteForm students={activeStudents ?? []} />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Existing codes</h2>
          {invitesError ? (
            <p className="mt-2 text-sm text-red-600">
              Invite codes could not be loaded: {invitesError.message}
            </p>
          ) : null}
        </div>
        {inviteCodes?.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">Redeemed</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {inviteCodes.map((invite) => (
                    <tr key={invite.id}>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {studentName(studentMap.get(invite.student_roster_id ?? ""))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={invite.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(invite.created_at)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(invite.expires_at)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {invite.redeemed_at ? formatDate(invite.redeemed_at) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <RevokeForm invite={invite} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-200 md:hidden">
              {inviteCodes.map((invite) => (
                <article className="p-4" key={invite.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {studentName(studentMap.get(invite.student_roster_id ?? ""))}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        Created {formatDate(invite.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={invite.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-zinc-500">Expires</dt>
                      <dd className="text-zinc-800">{formatDate(invite.expires_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Redeemed</dt>
                      <dd className="text-zinc-800">
                        {invite.redeemed_at ? formatDate(invite.redeemed_at) : "-"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <RevokeForm invite={invite} />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="p-6 text-sm text-zinc-600">No invite codes yet.</p>
        )}
      </section>
    </div>
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

function RevokeForm({ invite }: { invite: InviteCode }) {
  const canRevoke =
    invite.status === "active" && invite.use_count === 0 && !invite.redeemed_at;

  if (!canRevoke) {
    return <span className="text-sm text-zinc-500">No action</span>;
  }

  return (
    <form action={revokeInviteCode}>
      <input name="invite_code_id" type="hidden" value={invite.id} />
      <button
        className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        type="submit"
      >
        Revoke
      </button>
    </form>
  );
}

function studentName(student: ActiveStudent | undefined) {
  return student ? `${student.first_name} ${student.last_name}` : "Roster student";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
