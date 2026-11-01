import "server-only";

import { logServerError } from "@/lib/errors/server-error";
import {
  countDistinctCategories,
  type StudentJourneyCounts,
} from "@/lib/students/student-journey";
import { loadStudentInterests } from "@/lib/students/student-interests";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type StudentProfileClub = {
  category: string | null;
  id: string;
  name: string;
};

export type StudentProfileUpcomingEvent = {
  id: string;
  location: string | null;
  starts_at: string;
  title: string;
};

export type StudentProfileData = {
  clubs: StudentProfileClub[];
  counts: StudentJourneyCounts;
  interests: string[];
  interestsAvailable: boolean;
  upcoming: StudentProfileUpcomingEvent[];
};

const UPCOMING_LIMIT = 4;

// Every query runs as the signed-in student under row-level security, so the
// profile can only show what the student is already allowed to see.
export async function loadStudentProfileData(
  supabase: SupabaseServerClient,
  profile: { id: string; school_id: string },
  rosterId: string | null,
  now: Date,
): Promise<StudentProfileData> {
  const nowIso = now.toISOString();
  const interestsPromise = loadStudentInterests(supabase, profile.id);

  const { data: memberships, error: membershipError } = rosterId
    ? await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("school_id", profile.school_id)
        .eq("student_roster_id", rosterId)
        .eq("status", "active")
        .returns<Array<{ club_id: string }>>()
    : { data: [], error: null };

  if (membershipError) {
    logServerError("Student profile memberships lookup failed", membershipError);
  }

  const clubIds = (memberships ?? []).map((membership) => membership.club_id);

  const [clubsResult, clubEventsResult, registrationsResult, checkinsResult, ideasResult] =
    await Promise.all([
      clubIds.length
        ? supabase
            .from("clubs")
            .select("id, name, category")
            .in("id", clubIds)
            .eq("status", "active")
            .order("name", { ascending: true })
            .returns<StudentProfileClub[]>()
        : Promise.resolve({ data: [] as StudentProfileClub[], error: null }),
      clubIds.length
        ? supabase
            .from("events")
            .select("id, title, starts_at, location")
            .in("club_id", clubIds)
            .eq("status", "approved")
            .gte("starts_at", nowIso)
            .order("starts_at", { ascending: true })
            .limit(UPCOMING_LIMIT)
            .returns<StudentProfileUpcomingEvent[]>()
        : Promise.resolve({ data: [] as StudentProfileUpcomingEvent[], error: null }),
      supabase
        .from("event_attendees")
        .select("event_id")
        .eq("attendee_profile_id", profile.id)
        .eq("status", "registered")
        .returns<Array<{ event_id: string }>>(),
      supabase
        .from("attendance_checkins")
        .select("event_id")
        .eq("attendee_profile_id", profile.id)
        .eq("result", "success")
        .returns<Array<{ event_id: string }>>(),
      supabase
        .from("club_requests")
        .select("id", { count: "exact", head: true })
        .eq("created_by_profile_id", profile.id),
    ]);

  for (const [context, result] of [
    ["Student profile clubs lookup failed", clubsResult],
    ["Student profile club events lookup failed", clubEventsResult],
    ["Student profile registrations lookup failed", registrationsResult],
    ["Student profile check-ins lookup failed", checkinsResult],
    ["Student profile club ideas lookup failed", ideasResult],
  ] as const) {
    if (result.error) {
      logServerError(context, result.error);
    }
  }

  const registeredEventIds = uniqueIds(
    (registrationsResult.data ?? []).map((row) => row.event_id),
  );
  const attendedEventIds = uniqueIds(
    (checkinsResult.data ?? []).map((row) => row.event_id),
  );

  const [registeredEventsResult, attendedEventsResult] = await Promise.all([
    registeredEventIds.length
      ? supabase
          .from("events")
          .select("id, title, starts_at, location")
          .in("id", registeredEventIds)
          .eq("status", "approved")
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(UPCOMING_LIMIT)
          .returns<StudentProfileUpcomingEvent[]>()
      : Promise.resolve({ data: [] as StudentProfileUpcomingEvent[], error: null }),
    attendedEventIds.length
      ? supabase
          .from("events")
          .select("category")
          .in("id", attendedEventIds)
          .returns<Array<{ category: string | null }>>()
      : Promise.resolve({ data: [] as Array<{ category: string | null }>, error: null }),
  ]);

  const clubs = clubsResult.data ?? [];
  const upcoming = mergeUpcoming(
    clubEventsResult.data ?? [],
    registeredEventsResult.data ?? [],
  );
  const { available, interests } = await interestsPromise;

  return {
    clubs,
    counts: {
      categoriesTried: countDistinctCategories([
        ...clubs.map((club) => club.category),
        ...(attendedEventsResult.data ?? []).map((event) => event.category),
      ]),
      clubsJoined: clubs.length,
      ideasProposed: ideasResult.count ?? 0,
      sessionsAttended: attendedEventIds.length,
    },
    interests,
    interestsAvailable: available,
    upcoming,
  };
}

function mergeUpcoming(
  first: StudentProfileUpcomingEvent[],
  second: StudentProfileUpcomingEvent[],
) {
  const byId = new Map<string, StudentProfileUpcomingEvent>();

  for (const event of [...first, ...second]) {
    byId.set(event.id, event);
  }

  return [...byId.values()]
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at))
    .slice(0, UPCOMING_LIMIT);
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}
