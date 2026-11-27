import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type ClubMember = {
  homeroom: string | null;
  joinedAt: string;
  name: string;
  rosterId: string;
  role: "leader" | "member";
};

export type ClubPost = { author: string; body: string; createdAt: string; id: string };

export type AttendanceStatus = "present" | "absent" | "excused";

export type ClubMeeting = {
  date: string;
  id: string;
  note: string | null;
  statuses: Record<string, AttendanceStatus>;
};

export type ClubLife = {
  meetings: ClubMeeting[];
  members: ClubMember[];
  myAttendance: { present: number; total: number } | null;
  posts: ClubPost[];
};

// What one person may see of a club's inside life:
//   managers (leader, supervising teacher, school admin): members, posts,
//     meetings with everyone's attendance
//   members: posts and their own attendance
//   everyone else: nothing
// Read with the service role; the caller passes the access it worked out.
export async function getClubLife(
  admin: Admin,
  clubId: string,
  access: { canManage: boolean; isMember: boolean; rosterId: string | null },
): Promise<ClubLife> {
  const empty: ClubLife = { meetings: [], members: [], myAttendance: null, posts: [] };

  if (!access.canManage && !access.isMember) return empty;

  const [{ data: posts }, { data: meetings }, memberships] = await Promise.all([
    admin
      .from("club_posts")
      .select("id, body, created_at, author_profile_id")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<Array<{ author_profile_id: string | null; body: string; created_at: string; id: string }>>(),
    admin
      .from("club_meetings")
      .select("id, meeting_date, note")
      .eq("club_id", clubId)
      .order("meeting_date", { ascending: false })
      .limit(access.canManage ? 40 : 200)
      .returns<Array<{ id: string; meeting_date: string; note: string | null }>>(),
    access.canManage
      ? admin
          .from("club_memberships")
          .select("student_roster_id, role, joined_at")
          .eq("club_id", clubId)
          .eq("status", "active")
          .returns<Array<{ joined_at: string; role: "leader" | "member"; student_roster_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ joined_at: string; role: "leader" | "member"; student_roster_id: string }> }),
  ]);
  const meetingIds = (meetings ?? []).map((meeting) => meeting.id);
  const authorIds = Array.from(
    new Set((posts ?? []).map((post) => post.author_profile_id).filter((id): id is string => Boolean(id))),
  );
  const rosterIds = (memberships.data ?? []).map((row) => row.student_roster_id);
  const [{ data: attendance }, { data: authors }, { data: rosters }] = await Promise.all([
    meetingIds.length
      ? (() => {
          let query = admin
            .from("club_meeting_attendance")
            .select("meeting_id, student_roster_id, status")
            .in("meeting_id", meetingIds);
          // A member only ever loads their own rows.
          if (!access.canManage) query = query.eq("student_roster_id", access.rosterId ?? "");
          return query.returns<Array<{ meeting_id: string; status: AttendanceStatus; student_roster_id: string }>>();
        })()
      : Promise.resolve({ data: [] as Array<{ meeting_id: string; status: AttendanceStatus; student_roster_id: string }> }),
    authorIds.length
      ? admin.from("profiles").select("id, full_name").in("id", authorIds).returns<Array<{ full_name: string | null; id: string }>>()
      : Promise.resolve({ data: [] as Array<{ full_name: string | null; id: string }> }),
    rosterIds.length
      ? admin
          .from("student_rosters")
          .select("id, first_name, last_name, preferred_name, homeroom")
          .in("id", rosterIds)
          .returns<Array<{ first_name: string; homeroom: string | null; id: string; last_name: string; preferred_name: string | null }>>()
      : Promise.resolve({ data: [] as Array<{ first_name: string; homeroom: string | null; id: string; last_name: string; preferred_name: string | null }> }),
  ]);
  const authorName = new Map((authors ?? []).map((author) => [author.id, author.full_name ?? ""]));
  const rosterById = new Map((rosters ?? []).map((roster) => [roster.id, roster]));
  const members: ClubMember[] = (memberships.data ?? [])
    .map((row) => {
      const roster = rosterById.get(row.student_roster_id);

      return {
        homeroom: roster?.homeroom ?? null,
        joinedAt: row.joined_at,
        name: roster ? `${roster.preferred_name?.trim() || roster.first_name} ${roster.last_name}`.trim() : "—",
        role: row.role,
        rosterId: row.student_roster_id,
      };
    })
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "leader" ? -1 : 1));
  const statusesByMeeting = new Map<string, Record<string, AttendanceStatus>>();

  (attendance ?? []).forEach((row) => {
    const statuses = statusesByMeeting.get(row.meeting_id) ?? {};
    statuses[row.student_roster_id] = row.status;
    statusesByMeeting.set(row.meeting_id, statuses);
  });

  const allMeetings: ClubMeeting[] = (meetings ?? []).map((meeting) => ({
    date: meeting.meeting_date,
    id: meeting.id,
    note: meeting.note,
    statuses: statusesByMeeting.get(meeting.id) ?? {},
  }));
  // A member's own record counts only meetings they were marked at.
  const mine = !access.canManage && access.rosterId
    ? allMeetings.filter((meeting) => meeting.statuses[access.rosterId!])
    : [];

  return {
    meetings: access.canManage ? allMeetings : [],
    members,
    myAttendance:
      access.isMember && access.rosterId && !access.canManage
        ? { present: mine.filter((meeting) => meeting.statuses[access.rosterId!] === "present").length, total: mine.length }
        : null,
    posts: (posts ?? []).map((post) => ({
      author: (post.author_profile_id && authorName.get(post.author_profile_id)) || "",
      body: post.body,
      createdAt: post.created_at,
      id: post.id,
    })),
  };
}
