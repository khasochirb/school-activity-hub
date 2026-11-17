"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { checkInTiming, CHECK_IN_OPENS_BEFORE_MINUTES } from "@/lib/events/check-in-window";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
  status: string;
};

type StudentRoster = {
  id: string;
};

type EventRecord = {
  allow_connected_school_registration: boolean;
  capacity: number | null;
  ends_at: string | null;
  id: string;
  permission_required: boolean;
  school_id: string;
  starts_at: string;
  status: string;
};

type EventAttendee = {
  id: string;
  status: string;
  checked_in_at: string | null;
};

type CheckInContext = {
  admin: ReturnType<typeof createAdminClient>;
  attendee: EventAttendee;
  event: EventRecord;
  profile: Profile;
  student: StudentRoster;
  walkIn: boolean;
};

type CheckInContextResult =
  | { context: CheckInContext; ok: true }
  | { message: string; ok: false; success: boolean };

export type CheckInState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function checkInToEvent(
  _state: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const i18n = await getServerI18n();
  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return {
      message: i18n.t("checkIn.errors.missingEvent"),
      success: false,
    };
  }

  const contextResult = await getCheckInContext(eventId, i18n);

  if (!contextResult.ok) {
    return {
      message: contextResult.message,
      success: contextResult.success,
    };
  }

  const { admin, attendee, event, profile, student, walkIn } = contextResult.context;
  const { data: existingCheckin } = await admin
    .from("attendance_checkins")
    .select("id")
    .eq("event_id", event.id)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .eq("result", "success")
    .maybeSingle<{ id: string }>();

  if (existingCheckin) {
    return {
      message: i18n.t("checkIn.success.alreadyCheckedIn"),
      success: true,
    };
  }

  const checkedInAt = new Date().toISOString();
  const { error: insertError } = await admin.from("attendance_checkins").insert({
    school_id: event.school_id,
    event_id: event.id,
    student_roster_id:
      event.school_id === profile.school_id ? student.id : null,
    event_attendee_id: attendee.id,
    attendee_school_id: profile.school_id,
    attendee_profile_id: profile.id,
    checked_in_by_profile_id: profile.id,
    method: "qr",
    result: "success",
    qr_token_hash: createCheckInLinkHash(event.id),
    checked_in_at: checkedInAt,
    metadata: {
      source: "check_in_link",
      // Joined at the door by scanning the QR, not registered beforehand.
      walk_in: walkIn,
    },
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        message: i18n.t("checkIn.success.alreadyCheckedIn"),
        success: true,
      };
    }

    return {
      message: i18n.tf("checkIn.errors.recordFailed", {
        error: i18n.t("common.somethingWentWrong"),
      }),
      success: false,
    };
  }

  await admin
    .from("event_attendees")
    .update({
      status: "attended",
      checked_in_at: checkedInAt,
      checked_in_by_profile_id: profile.id,
    })
    .eq("id", attendee.id)
    .eq("school_id", event.school_id)
    .eq("status", "registered");

  revalidatePath(`/check-in/${event.id}`);
  revalidatePath(`/events/${event.id}/attendance`);

  return { message: i18n.t("checkIn.success.checkedIn"), success: true };
}

async function getCheckInContext(
  eventId: string,
  i18n: ServerI18n,
): Promise<CheckInContextResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role, status")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || profile.role !== "student" || profile.status !== "active") {
    return {
      message: i18n.t("checkIn.errors.activeStudentsOnly"),
      ok: false,
      success: false,
    };
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("student_rosters")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<StudentRoster>();

  if (!student) {
    return {
      message: i18n.t("checkIn.errors.noRoster"),
      ok: false,
      success: false,
    };
  }

  const { data: event } = await admin
    .from("events")
    .select(
      "id, school_id, status, starts_at, ends_at, capacity, permission_required, allow_connected_school_registration",
    )
    .eq("id", eventId)
    .eq("status", "approved")
    .maybeSingle<EventRecord>();

  const canAccessEvent =
    event &&
    (event.school_id === profile.school_id ||
      ((await isEventSharedWithSchool(admin, event.id, profile.school_id)) &&
        (await schoolsHaveApprovedConnection(
          admin,
          event.school_id,
          profile.school_id,
        ))));

  if (!event || !canAccessEvent) {
    return {
      message: i18n.t("checkIn.errors.eventUnavailable"),
      ok: false,
      success: false,
    };
  }

  const { data: foundAttendee } = await admin
    .from("event_attendees")
    .select("id, status, checked_in_at")
    .eq("event_id", event.id)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .maybeSingle<EventAttendee>();

  // The QR link never changes, so it is the clock that keeps check-in honest:
  // only from 30 minutes before the start to 30 minutes after the end.
  const timing = checkInTiming(new Date(), event.starts_at, event.ends_at);
  const timingRefusal = () => ({
    message:
      timing === "early"
        ? i18n.tf("checkIn.errors.notOpenYet", { minutes: CHECK_IN_OPENS_BEFORE_MINUTES })
        : i18n.t("checkIn.errors.closed"),
    ok: false as const,
    success: false,
  });
  let attendee = foundAttendee;
  let walkIn = false;

  if (!attendee || attendee.status === "canceled") {
    if (timing !== "open") {
      return timingRefusal();
    }

    // Walk-in: a student who turned up without registering joins at the door,
    // but only where joining needs nothing else: no permission slip, room left,
    // and for a visiting school, an activity open to connected schools.
    const walkedIn = await registerWalkIn(admin, event, profile, student, attendee);

    if (!walkedIn) {
      return {
        message: i18n.t("checkIn.errors.mustJoinFirst"),
        ok: false,
        success: false,
      };
    }

    attendee = walkedIn;
    walkIn = true;
  }

  if (attendee.status === "attended" || attendee.checked_in_at) {
    return {
      message: i18n.t("checkIn.success.alreadyCheckedIn"),
      ok: false,
      success: true,
    };
  }

  if (attendee.status !== "registered") {
    return {
      message: i18n.t("checkIn.errors.invalidRegistrationStatus"),
      ok: false,
      success: false,
    };
  }

  if (timing !== "open") {
    return timingRefusal();
  }

  return {
    context: {
      admin,
      attendee,
      event,
      profile,
      student,
      walkIn,
    },
    ok: true,
  };
}

async function canWalkIn(
  admin: ReturnType<typeof createAdminClient>,
  event: EventRecord,
  profile: Profile,
) {
  if (event.permission_required) return false;
  if (event.school_id !== profile.school_id && !event.allow_connected_school_registration) return false;
  if (!event.capacity) return true;

  const { count } = await admin
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("school_id", event.school_id)
    .in("status", ["registered", "attended"]);

  return (count ?? 0) < event.capacity;
}

async function registerWalkIn(
  admin: ReturnType<typeof createAdminClient>,
  event: EventRecord,
  profile: Profile,
  student: StudentRoster,
  existing: EventAttendee | null,
): Promise<EventAttendee | null> {
  if (!(await canWalkIn(admin, event, profile))) return null;

  const registeredAt = new Date().toISOString();
  const query = existing
    ? admin
        .from("event_attendees")
        .update({ permission_status: "not_required", registered_at: registeredAt, status: "registered" })
        .eq("id", existing.id)
        .eq("school_id", event.school_id)
    : admin.from("event_attendees").insert({
        attendee_profile_id: profile.id,
        attendee_school_id: profile.school_id,
        event_id: event.id,
        permission_status: "not_required",
        school_id: event.school_id,
        status: "registered",
        student_roster_id: event.school_id === profile.school_id ? student.id : null,
      });
  const { data, error } = await query.select("id, status, checked_in_at").maybeSingle<EventAttendee>();

  return error ? null : data;
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

async function isEventSharedWithSchool(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  schoolId: string,
) {
  const { data: share } = await admin
    .from("event_school_shares")
    .select("id")
    .eq("event_id", eventId)
    .eq("school_id", schoolId)
    .maybeSingle<{ id: string }>();

  return Boolean(share);
}

function createCheckInLinkHash(eventId: string) {
  return createHash("sha256")
    .update(`check-in:${eventId}`)
    .digest("hex");
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}
