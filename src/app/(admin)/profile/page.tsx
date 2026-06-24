import { redirect } from "next/navigation";
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
        <h1 className="text-2xl font-semibold text-zinc-950">Profile</h1>
        <p className="mt-2 text-sm text-zinc-600">
          View your account details and update your display name.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">
          Account details
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Email" value={user.email ?? "Not available"} />
          <DetailItem
            label="Full name"
            value={profile?.full_name ?? "No profile found"}
          />
          <DetailItem label="Role" value={profile ? formatRole(profile.role) : "-"} />
          <DetailItem label="School" value={school?.name ?? "-"} />
          <DetailItem label="Status" value={profile?.status ?? "-"} />
        </dl>
      </section>

      {profile ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            Profile settings
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            You can update your full name. Role and school are managed by staff.
          </p>
          <div className="mt-4">
            <ProfileForm fullName={profile.full_name} />
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            Profile settings
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            No profile row is linked to this account yet.
          </p>
        </section>
      )}

      {profile?.role === "student" ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            Student roster
          </h2>
          {studentRoster ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Roster name"
                value={studentRosterName(studentRoster)}
              />
              <DetailItem label="Grade" value={studentRoster.grade_level ?? "-"} />
              <DetailItem
                label="Class group / homeroom"
                value={studentRoster.homeroom ?? "-"}
              />
              <DetailItem
                label="Student number"
                value={studentRoster.student_number ?? "-"}
              />
              <DetailItem label="Roster status" value={studentRoster.status} />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              No linked roster record was found for this student account.
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

function formatRole(role: Profile["role"]) {
  return role
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
