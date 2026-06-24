"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type StudentRoster = {
  id: string;
};

type EventRecord = {
  id: string;
  school_id: string;
  status: string;
  starts_at: string;
  capacity: number | null;
  shared_with_connected_schools: boolean;
  allow_connected_school_registration: boolean;
};

export type CreateEventState = {
  message: string;
  success: boolean;
};

export async function createEvent(
  _state: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { message: "You must be logged in.", success: false };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAtInput = String(formData.get("starts_at") ?? "").trim();
  const endsAtInput = String(formData.get("ends_at") ?? "").trim();
  const maxParticipantsInput = String(formData.get("max_participants") ?? "").trim();
  const clubId = String(formData.get("club_id") ?? "").trim();
  const isStaff = isSchoolStaff(profile);
  const isLeaderEvent = !isStaff;

  if (!title) {
    return { message: "Event title is required.", success: false };
  }

  if (!location) {
    return { message: "Location is required.", success: false };
  }

  const startsAt = parseDateTime(startsAtInput);
  const endsAt = parseDateTime(endsAtInput);

  if (!startsAt || !endsAt) {
    return { message: "Start and end times are required.", success: false };
  }

  if (endsAt <= startsAt) {
    return { message: "End time must be after start time.", success: false };
  }

  const capacity = parseCapacity(maxParticipantsInput);

  if (capacity === "invalid") {
    return {
      message: "Max participants must be a positive number.",
      success: false,
    };
  }

  if (isLeaderEvent && !clubId) {
    return {
      message: "Club leaders must choose one of their clubs.",
      success: false,
    };
  }

  if (!isStaff && !(await isCurrentUserLeaderForClub(profile, clubId))) {
    return {
      message: "Only school staff or club leaders can create events.",
      success: false,
    };
  }

  if (clubId && !(await isClubInCurrentSchool(profile, clubId))) {
    return { message: "Choose a valid club.", success: false };
  }

  const now = new Date().toISOString();
  const status = isStaff ? "approved" : "pending_approval";
  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    school_id: profile.school_id,
    club_id: clubId || null,
    created_by_profile_id: profile.id,
    submitted_by_profile_id: profile.id,
    approved_by_profile_id: isStaff ? profile.id : null,
    title,
    description: description || null,
    category: category || null,
    location,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    capacity,
    shared_with_connected_schools: false,
    allow_connected_school_registration: false,
    status,
    submitted_at: now,
    approved_at: isStaff ? now : null,
  });

  if (error) {
    return {
      message: `Event could not be created: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/events");

  return {
    message: isStaff
      ? "Event created and approved."
      : "Event submitted for approval.",
    success: true,
  };
}

export async function joinEvent(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/events");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return;
  }

  const admin = createAdminClient();
  const student = await getCurrentStudentRoster(admin, profile);

  if (!student) {
    return;
  }

  const event = await getJoinableEvent(admin, profile, eventId);

  if (!event || (await isEventFull(admin, event))) {
    return;
  }

  const existingAttendee = await getCurrentStudentAttendee(
    admin,
    event.id,
    profile,
    student,
  );

  if (existingAttendee?.status === "registered" || existingAttendee?.status === "attended") {
    return;
  }

  if (existingAttendee) {
    await admin
      .from("event_attendees")
      .update({ status: "registered", registered_at: new Date().toISOString() })
      .eq("id", existingAttendee.id)
      .eq("school_id", event.school_id);
  } else {
    await admin.from("event_attendees").insert({
      school_id: event.school_id,
      event_id: event.id,
      student_roster_id:
        event.school_id === profile.school_id ? student.id : null,
      attendee_school_id: profile.school_id,
      attendee_profile_id: profile.id,
      status: "registered",
    });
  }

  revalidatePath("/events");
}

export async function cancelEventRegistration(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/events");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return;
  }

  const admin = createAdminClient();
  const student = await getCurrentStudentRoster(admin, profile);

  if (!student) {
    return;
  }

  const attendee = await getCurrentStudentAttendee(
    admin,
    eventId,
    profile,
    student,
  );

  if (!attendee) {
    return;
  }

  await admin
    .from("event_attendees")
    .update({ status: "canceled" })
    .eq("id", attendee.id)
    .eq("status", "registered");

  revalidatePath("/events");
}

export async function cancelEvent(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isSchoolStaff(profile)) {
    redirect("/events");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("events")
    .update({ status: "canceled" })
    .eq("id", eventId)
    .eq("school_id", profile.school_id)
    .eq("status", "approved");

  revalidatePath("/events");
}

export async function updateEventSharing(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isSchoolStaff(profile)) {
    redirect("/events");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const sharing = String(formData.get("sharing") ?? "").trim();

  const sharingState =
    sharing === "internal"
      ? {
          allow_connected_school_registration: false,
          shared_with_connected_schools: false,
        }
      : sharing === "shared_view"
        ? {
            allow_connected_school_registration: false,
            shared_with_connected_schools: true,
          }
        : sharing === "shared_registration"
          ? {
              allow_connected_school_registration: true,
              shared_with_connected_schools: true,
            }
          : null;

  if (!eventId || !sharingState) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("events")
    .update(sharingState)
    .eq("id", eventId)
    .eq("school_id", profile.school_id)
    .eq("status", "approved");

  revalidatePath("/events");
}

async function getCurrentProfile(): Promise<Profile | null> {
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

  return profile;
}

async function getCurrentStudentRoster(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
): Promise<StudentRoster | null> {
  const { data: student } = await admin
    .from("student_rosters")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<StudentRoster>();

  return student;
}

async function getJoinableEvent(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
  eventId: string,
) {
  const { data: event } = await admin
    .from("events")
    .select(
      "id, school_id, status, starts_at, capacity, shared_with_connected_schools, allow_connected_school_registration",
    )
    .eq("id", eventId)
    .eq("status", "approved")
    .gte("starts_at", new Date().toISOString())
    .maybeSingle<EventRecord>();

  if (!event) {
    return null;
  }

  if (event.school_id === profile.school_id) {
    return event;
  }

  if (
    event.shared_with_connected_schools &&
    event.allow_connected_school_registration &&
    (await schoolsHaveApprovedConnection(admin, event.school_id, profile.school_id))
  ) {
    return event;
  }

  return null;
}

async function getCurrentStudentAttendee(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  profile: Profile,
  student: StudentRoster,
) {
  const { data: attendee } = await admin
    .from("event_attendees")
    .select("id, status")
    .eq("event_id", eventId)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .maybeSingle<{ id: string; status: string }>();

  return attendee;
}

async function schoolsHaveApprovedConnection(
  admin: ReturnType<typeof createAdminClient>,
  firstSchoolId: string,
  secondSchoolId: string,
) {
  const { data: connection } = await admin
    .from("school_connections")
    .select("id")
    .eq("status", "approved")
    .or(
      [
        `and(requester_school_id.eq.${firstSchoolId},receiver_school_id.eq.${secondSchoolId})`,
        `and(requester_school_id.eq.${secondSchoolId},receiver_school_id.eq.${firstSchoolId})`,
      ].join(","),
    )
    .maybeSingle<{ id: string }>();

  return Boolean(connection);
}

async function isEventFull(
  admin: ReturnType<typeof createAdminClient>,
  event: EventRecord,
) {
  if (!event.capacity) {
    return false;
  }

  const { count } = await admin
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("school_id", event.school_id)
    .in("status", ["registered", "attended"]);

  return (count ?? 0) >= event.capacity;
}

async function isCurrentUserLeaderForClub(profile: Profile, clubId: string) {
  const admin = createAdminClient();
  const student = await getCurrentStudentRoster(admin, profile);

  if (!student) {
    return false;
  }

  const { data: membership } = await admin
    .from("club_memberships")
    .select("id")
    .eq("club_id", clubId)
    .eq("school_id", profile.school_id)
    .eq("student_roster_id", student.id)
    .eq("role", "leader")
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  return Boolean(membership);
}

async function isClubInCurrentSchool(profile: Profile, clubId: string) {
  const admin = createAdminClient();
  const { data: club } = await admin
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  return Boolean(club);
}

function isSchoolStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

function parseDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCapacity(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return "invalid";
  }

  return parsed;
}
