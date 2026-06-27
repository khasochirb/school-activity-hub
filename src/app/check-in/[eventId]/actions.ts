"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
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
  id: string;
  school_id: string;
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

  const { admin, attendee, event, profile, student } = contextResult.context;
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
        error: insertError.message,
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
    .select("id, school_id, status")
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

  const { data: attendee } = await admin
    .from("event_attendees")
    .select("id, status, checked_in_at")
    .eq("event_id", event.id)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .maybeSingle<EventAttendee>();

  if (!attendee || attendee.status === "canceled") {
    return {
      message: i18n.t("checkIn.errors.mustJoinFirst"),
      ok: false,
      success: false,
    };
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

  return {
    context: {
      admin,
      attendee,
      event,
      profile,
      student,
    },
    ok: true,
  };
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
