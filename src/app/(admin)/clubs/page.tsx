import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  archiveClub,
  assignClubLeader,
  joinClub,
  leaveClub,
} from "./actions";
import { CreateClubForm } from "./create-club-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type Club = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  created_at: string;
};

type StudentRoster = {
  id: string;
};

type ClubMembership = {
  id: string;
  club_id: string;
  student_roster_id: string;
  role: "member" | "leader";
  status: string;
  student_rosters: {
    first_name: string;
    last_name: string;
  } | null;
};

export default async function ClubsPage() {
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
    .maybeSingle<Profile>();

  if (!profile) {
    redirect("/dashboard");
  }

  const isStaff = profile.role === "school_admin" || profile.role === "teacher";

  const { data: clubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id, name, description, category, status, created_at")
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .order("name", { ascending: true })
    .returns<Club[]>();

  const { data: currentStudent } =
    profile.role === "student"
      ? await supabase
          .from("student_rosters")
          .select("id")
          .eq("school_id", profile.school_id)
          .eq("profile_id", profile.id)
          .eq("status", "active")
          .maybeSingle<StudentRoster>()
      : { data: null };

  const { data: memberships } = await supabase
    .from("club_memberships")
    .select("id, club_id, student_roster_id, role, status, student_rosters(first_name, last_name)")
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .returns<ClubMembership[]>();

  const membershipsByClub = groupMembershipsByClub(memberships ?? []);
  const currentStudentMemberships = new Set(
    (memberships ?? [])
      .filter((membership) => membership.student_roster_id === currentStudent?.id)
      .map((membership) => membership.club_id),
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Clubs</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Browse active school clubs and manage membership.
        </p>
      </section>

      {isStaff ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Create club</h2>
          <div className="mt-4">
            <CreateClubForm />
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Active clubs</h2>
          {clubsError ? (
            <p className="mt-2 text-sm text-red-600">
              Clubs could not be loaded: {clubsError.message}
            </p>
          ) : null}
          {profile.role === "student" && !currentStudent ? (
            <p className="mt-2 text-sm text-zinc-600">
              Your account is not linked to an active roster student yet.
            </p>
          ) : null}
        </div>
        {clubs?.length ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {clubs.map((club) => {
              const clubMemberships = membershipsByClub.get(club.id) ?? [];
              const isJoined = currentStudentMemberships.has(club.id);

              return (
                <article
                  className="rounded-lg border border-zinc-200 p-4"
                  key={club.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-950">
                        {club.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {club.category ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                            {club.category}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {club.status}
                        </span>
                      </div>
                    </div>
                    <ClubActions
                      club={club}
                      currentStudent={currentStudent}
                      isJoined={isJoined}
                      isStaff={isStaff}
                      role={profile.role}
                    />
                  </div>
                  {club.description ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {club.description}
                    </p>
                  ) : null}
                  <div className="mt-4 border-t border-zinc-200 pt-4">
                    <h4 className="text-sm font-medium text-zinc-950">
                      Members
                    </h4>
                    {clubMemberships.length ? (
                      <ul className="mt-2 flex flex-col gap-2">
                        {clubMemberships.map((membership) => (
                          <li
                            className="flex flex-col gap-2 rounded-md bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                            key={membership.id}
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-900">
                                {memberName(membership)}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {membership.role}
                              </p>
                            </div>
                            {isStaff && membership.role !== "leader" ? (
                              <form action={assignClubLeader}>
                                <input
                                  name="membership_id"
                                  type="hidden"
                                  value={membership.id}
                                />
                                <button
                                  className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                                  type="submit"
                                >
                                  Make leader
                                </button>
                              </form>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-600">
                        No active members yet.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-sm text-zinc-600">No active clubs yet.</p>
        )}
      </section>
    </div>
  );
}

function ClubActions({
  club,
  currentStudent,
  isJoined,
  isStaff,
  role,
}: {
  club: Club;
  currentStudent: StudentRoster | null;
  isJoined: boolean;
  isStaff: boolean;
  role: Profile["role"];
}) {
  if (isStaff) {
    return (
      <form action={archiveClub}>
        <input name="club_id" type="hidden" value={club.id} />
        <button
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          type="submit"
        >
          Archive
        </button>
      </form>
    );
  }

  if (role !== "student" || !currentStudent) {
    return null;
  }

  return (
    <form action={isJoined ? leaveClub : joinClub}>
      <input name="club_id" type="hidden" value={club.id} />
      <button
        className={
          isJoined
            ? "h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
            : "h-9 cursor-pointer rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
        }
        type="submit"
      >
        {isJoined ? "Leave" : "Join"}
      </button>
    </form>
  );
}

function groupMembershipsByClub(memberships: ClubMembership[]) {
  const grouped = new Map<string, ClubMembership[]>();

  memberships.forEach((membership) => {
    const clubMemberships = grouped.get(membership.club_id) ?? [];
    clubMemberships.push(membership);
    grouped.set(membership.club_id, clubMemberships);
  });

  return grouped;
}

function memberName(membership: ClubMembership) {
  const student = membership.student_rosters;

  if (!student) {
    return "Roster student";
  }

  return `${student.first_name} ${student.last_name}`;
}
