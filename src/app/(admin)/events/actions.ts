"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseActivityCategory } from "@/lib/activity-categories";
import {
  parseEventDecisionInfo,
  type EventDecisionInfoError,
} from "@/lib/events/event-decision-info";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
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

type EventRiskLevel = "low" | "medium" | "high";
type EventPermissionStatus =
  | "declined"
  | "not_required"
  | "pending"
  | "received";

type EventRecord = {
  id: string;
  school_id: string;
  status: string;
  starts_at: string;
  capacity: number | null;
  allow_connected_school_registration: boolean;
  permission_required: boolean;
};

type ResponsibleStaffProfile = {
  id: string;
  role: "school_admin" | "teacher" | "student";
  school_id: string;
  status: "active" | "inactive";
};

export type CreateEventState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function createEvent(
  _state: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const i18n = await getServerI18n();
  const profile = await getCurrentProfile();

  if (!profile) {
    return { message: i18n.t("events.errors.unauthenticated"), success: false };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryInput = String(formData.get("category") ?? "").trim();
  const category = parseActivityCategory(categoryInput);
  const location = String(formData.get("location") ?? "").trim();
  const startsAtInput = String(formData.get("starts_at") ?? "").trim();
  const endsAtInput = String(formData.get("ends_at") ?? "").trim();
  const maxParticipantsInput = String(formData.get("max_participants") ?? "").trim();
  const clubId = String(formData.get("club_id") ?? "").trim();
  const riskLevel = parseRiskLevel(formData.get("risk_level"));
  const permissionRequired =
    String(formData.get("permission_required") ?? "") === "true";
  const permissionNote = String(formData.get("permission_note") ?? "").trim();
  const decisionInfoResult = parseEventDecisionInfo(formData);
  const isStaff = isSchoolStaff(profile);
  const isLeaderEvent = !isStaff;

  if (!title) {
    return { message: i18n.t("events.errors.titleRequired"), success: false };
  }

  if (decisionInfoResult.error) {
    return {
      message: eventDecisionInfoErrorMessage(decisionInfoResult.error, i18n),
      success: false,
    };
  }

  const decisionInfo = decisionInfoResult.data;

  if (!location) {
    return { message: i18n.t("events.errors.locationRequired"), success: false };
  }

  if (categoryInput && !category) {
    return { message: i18n.t("events.errors.invalidCategory"), success: false };
  }

  const startsAt = parseDateTime(startsAtInput);
  const endsAt = parseDateTime(endsAtInput);

  if (!startsAt || !endsAt) {
    return { message: i18n.t("events.errors.timeRequired"), success: false };
  }

  if (endsAt <= startsAt) {
    return { message: i18n.t("events.errors.validTimeOrder"), success: false };
  }

  const capacity = parseCapacity(maxParticipantsInput);

  if (capacity === "invalid") {
    return {
      message: i18n.t("events.errors.maxParticipantsPositive"),
      success: false,
    };
  }

  if (!riskLevel) {
    return { message: i18n.t("events.errors.invalidRiskLevel"), success: false };
  }

  if (isLeaderEvent && !clubId) {
    return {
      message: i18n.t("events.errors.leaderClubRequired"),
      success: false,
    };
  }

  if (!isStaff && !(await isCurrentUserLeaderForClub(profile, clubId))) {
    return {
      message: i18n.t("events.errors.staffOrLeaderOnly"),
      success: false,
    };
  }

  if (clubId && !(await isClubInCurrentSchool(profile, clubId))) {
    return { message: i18n.t("events.errors.invalidClub"), success: false };
  }

  const responsibleStaff = await validateResponsibleStaffAssignment({
    currentResponsibleStaffId: null,
    profile,
    requestedResponsibleStaffId: decisionInfo.responsibleStaffId,
  });

  if (!responsibleStaff.valid) {
    return {
      message: i18n.t("events.errors.invalidResponsibleStaff"),
      success: false,
    };
  }

  const now = new Date().toISOString();
  const status = isStaff ? "approved" : "pending_approval";
  const supabase = await createClient();
  const { error } = await timeServer("events.action.create.insert", () =>
    supabase.from("events").insert({
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
      allow_connected_school_registration: false,
      risk_level: riskLevel,
      permission_required: permissionRequired,
      permission_note: permissionNote || null,
      responsible_staff_id: responsibleStaff.responsibleStaffId,
      eligibility_notes: decisionInfo.eligibilityNotes,
      experience_level: decisionInfo.experienceLevel,
      accessibility_notes: decisionInfo.accessibilityNotes,
      status,
      submitted_at: now,
      approved_at: isStaff ? now : null,
    }),
  );

  if (error) {
    return {
      message: i18n.tf("events.errors.createFailed", {
        error: i18n.t("common.somethingWentWrong"),
      }),
      success: false,
    };
  }

  revalidatePath("/events");

  return {
    message: isStaff
      ? i18n.t("events.success.createdApproved")
      : i18n.t("events.success.submittedForApproval"),
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

  const permissionStatus = getRegistrationPermissionStatus(
    event,
    existingAttendee?.permission_status,
  );

  if (existingAttendee) {
    await timeServer("events.action.join.update-existing-attendee", () =>
      admin
        .from("event_attendees")
        .update({
          permission_status: permissionStatus,
          registered_at: new Date().toISOString(),
          status: "registered",
        })
        .eq("id", existingAttendee.id)
        .eq("school_id", event.school_id),
    );
  } else {
    await timeServer("events.action.join.insert-attendee", () =>
      admin.from("event_attendees").insert({
        school_id: event.school_id,
        event_id: event.id,
        student_roster_id:
          event.school_id === profile.school_id ? student.id : null,
        attendee_school_id: profile.school_id,
        attendee_profile_id: profile.id,
        permission_status: permissionStatus,
        status: "registered",
      }),
    );
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
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

  await timeServer("events.action.cancel-registration.update", () =>
    admin
      .from("event_attendees")
      .update({ status: "canceled" })
      .eq("id", attendee.id)
      .eq("status", "registered"),
  );

  revalidatePath("/events");
  revalidatePath("/dashboard");
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
  await timeServer("events.action.cancel-event.update", () =>
    supabase
      .from("events")
      .update({ status: "canceled" })
      .eq("id", eventId)
      .eq("school_id", profile.school_id)
      .eq("status", "approved"),
  );

  revalidatePath("/events");
}

export async function updateEventSafety(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isSchoolStaff(profile)) {
    redirect("/events");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const riskLevel = parseRiskLevel(formData.get("risk_level"));
  const permissionRequired =
    String(formData.get("permission_required") ?? "") === "true";
  const permissionNote = String(formData.get("permission_note") ?? "").trim();

  if (!eventId || !riskLevel) {
    return;
  }

  const supabase = await createClient();
  await timeServer("events.action.update-safety.update", () =>
    supabase
      .from("events")
      .update({
        risk_level: riskLevel,
        permission_required: permissionRequired,
        permission_note: permissionNote || null,
      })
      .eq("id", eventId)
      .eq("school_id", profile.school_id),
  );

  revalidatePath("/events");
  revalidatePath("/approvals");
}

export async function updateEventDecisionInfo(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isSchoolStaff(profile)) {
    redirect("/events");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const decisionInfoResult = parseEventDecisionInfo(formData);

  if (!eventId || decisionInfoResult.error) {
    return;
  }

  const admin = createAdminClient();
  const { data: event } = await timeServer(
    "events.action.update-decision-info.event",
    () =>
      admin
        .from("events")
        .select("id, responsible_staff_id")
        .eq("id", eventId)
        .eq("school_id", profile.school_id)
        .maybeSingle<{ id: string; responsible_staff_id: string | null }>(),
  );

  if (!event) {
    return;
  }

  const responsibleStaff = await validateResponsibleStaffAssignment({
    currentResponsibleStaffId: event.responsible_staff_id,
    profile,
    requestedResponsibleStaffId:
      decisionInfoResult.data.responsibleStaffId,
  });

  if (!responsibleStaff.valid) {
    return;
  }

  const supabase = await createClient();
  await timeServer("events.action.update-decision-info.update", () =>
    supabase
      .from("events")
      .update({
        accessibility_notes: decisionInfoResult.data.accessibilityNotes,
        eligibility_notes: decisionInfoResult.data.eligibilityNotes,
        experience_level: decisionInfoResult.data.experienceLevel,
        responsible_staff_id: responsibleStaff.responsibleStaffId,
      })
      .eq("id", event.id)
      .eq("school_id", profile.school_id),
  );

  revalidatePath("/events");
  revalidatePath(`/events/${event.id}`);
  revalidatePath("/approvals");
}

export async function updateEventSharing(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isSchoolStaff(profile)) {
    redirect("/events");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const requestedSchoolIds = Array.from(
    new Set(
      formData
        .getAll("share_school_ids")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
  const allowConnectedRegistration =
    String(formData.get("allow_connected_registration") ?? "") === "true";

  if (!eventId) {
    return;
  }

  const admin = createAdminClient();
  const { data: event } = await timeServer(
    "events.action.update-sharing.event-lookup",
    () =>
      admin
        .from("events")
        .select("id")
        .eq("id", eventId)
        .eq("school_id", profile.school_id)
        .eq("status", "approved")
        .maybeSingle<{ id: string }>(),
  );

  if (!event) {
    return;
  }

  const connectedSchoolIds = await getConnectedSchoolIds(admin, profile.school_id);
  const connectedSchoolIdSet = new Set(connectedSchoolIds);
  const shareSchoolIds = requestedSchoolIds.filter((schoolId) =>
    connectedSchoolIdSet.has(schoolId),
  );

  await timeServer("events.action.update-sharing.delete-shares", () =>
    admin.from("event_school_shares").delete().eq("event_id", event.id),
  );

  if (shareSchoolIds.length) {
    await timeServer(
      "events.action.update-sharing.insert-shares",
      () =>
        admin.from("event_school_shares").insert(
          shareSchoolIds.map((schoolId) => ({
            event_id: event.id,
            school_id: schoolId,
          })),
        ),
    );
  }

  await timeServer("events.action.update-sharing.update-event", () =>
    admin
      .from("events")
      .update({
        allow_connected_school_registration:
          shareSchoolIds.length > 0 && allowConnectedRegistration,
      })
      .eq("id", event.id)
      .eq("school_id", profile.school_id),
  );

  revalidatePath("/events");
}

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("events.action.current-profile.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer(
    "events.action.current-profile.profile",
    () =>
      supabase
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", user.id)
        .maybeSingle<Profile>(),
  );

  return profile;
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}

async function getCurrentStudentRoster(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
): Promise<StudentRoster | null> {
  const { data: student } = await timeServer(
    "events.action.current-student",
    () =>
      admin
        .from("student_rosters")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .maybeSingle<StudentRoster>(),
  );

  return student;
}

async function getJoinableEvent(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
  eventId: string,
) {
  const { data: event } = await timeServer(
    "events.action.join.joinable-event",
    () =>
      admin
        .from("events")
        .select(
          "id, school_id, status, starts_at, capacity, allow_connected_school_registration, permission_required",
        )
        .eq("id", eventId)
        .eq("status", "approved")
        .gte("starts_at", new Date().toISOString())
        .maybeSingle<EventRecord>(),
  );

  if (!event) {
    return null;
  }

  if (event.school_id === profile.school_id) {
    return event;
  }

  if (
    event.allow_connected_school_registration &&
    (await isEventSharedWithSchool(admin, event.id, profile.school_id)) &&
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
  const { data: attendee } = await timeServer(
    "events.action.join.current-attendee",
    () =>
      admin
        .from("event_attendees")
        .select("id, status, permission_status")
        .eq("event_id", eventId)
        .or(
          `attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`,
        )
        .maybeSingle<{
          id: string;
          permission_status: EventPermissionStatus;
          status: string;
        }>(),
  );

  return attendee;
}

async function isEventSharedWithSchool(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  schoolId: string,
) {
  const { data: share } = await timeServer(
    "events.action.join.shared-with-school",
    () =>
      admin
        .from("event_school_shares")
        .select("id")
        .eq("event_id", eventId)
        .eq("school_id", schoolId)
        .maybeSingle<{ id: string }>(),
  );

  return Boolean(share);
}

async function getConnectedSchoolIds(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: connections } = await timeServer(
    "events.action.connected-school-ids",
    () =>
      admin
        .from("school_connections")
        .select("requester_school_id, receiver_school_id")
        .eq("status", "approved")
        .or(
          [
            `requester_school_id.eq.${schoolId}`,
            `receiver_school_id.eq.${schoolId}`,
          ].join(","),
        )
        .returns<
          Array<{
            requester_school_id: string;
            receiver_school_id: string;
          }>
        >(),
  );

  return (connections ?? []).map((connection) =>
    connection.requester_school_id === schoolId
      ? connection.receiver_school_id
      : connection.requester_school_id,
  );
}

async function schoolsHaveApprovedConnection(
  admin: ReturnType<typeof createAdminClient>,
  firstSchoolId: string,
  secondSchoolId: string,
) {
  const { data: connection } = await timeServer(
    "events.action.schools-have-approved-connection",
    () =>
      admin
        .from("school_connections")
        .select("id")
        .eq("status", "approved")
        .or(
          [
            `and(requester_school_id.eq.${firstSchoolId},receiver_school_id.eq.${secondSchoolId})`,
            `and(requester_school_id.eq.${secondSchoolId},receiver_school_id.eq.${firstSchoolId})`,
          ].join(","),
        )
        .maybeSingle<{ id: string }>(),
  );

  return Boolean(connection);
}

async function isEventFull(
  admin: ReturnType<typeof createAdminClient>,
  event: EventRecord,
) {
  if (!event.capacity) {
    return false;
  }

  const { count } = await timeServer("events.action.join.capacity-count", () =>
    admin
      .from("event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("school_id", event.school_id)
      .in("status", ["registered", "attended"]),
  );

  return (count ?? 0) >= event.capacity;
}

async function isCurrentUserLeaderForClub(profile: Profile, clubId: string) {
  const admin = createAdminClient();
  const student = await getCurrentStudentRoster(admin, profile);

  if (!student) {
    return false;
  }

  const { data: membership } = await timeServer(
    "events.action.leader-club-membership",
    () =>
      admin
        .from("club_memberships")
        .select("id")
        .eq("club_id", clubId)
        .eq("school_id", profile.school_id)
        .eq("student_roster_id", student.id)
        .eq("role", "leader")
        .eq("status", "active")
        .maybeSingle<{ id: string }>(),
  );

  return Boolean(membership);
}

async function isClubInCurrentSchool(profile: Profile, clubId: string) {
  const admin = createAdminClient();
  const { data: club } = await timeServer(
    "events.action.club-in-current-school",
    () =>
      admin
        .from("clubs")
        .select("id")
        .eq("id", clubId)
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .maybeSingle<{ id: string }>(),
  );

  return Boolean(club);
}

function isSchoolStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

async function validateResponsibleStaffAssignment({
  currentResponsibleStaffId,
  profile,
  requestedResponsibleStaffId,
}: {
  currentResponsibleStaffId: string | null;
  profile: Profile;
  requestedResponsibleStaffId: string | null;
}): Promise<
  | { responsibleStaffId: string | null; valid: true }
  | { responsibleStaffId: null; valid: false }
> {
  if (!requestedResponsibleStaffId) {
    const teacherCanClear =
      profile.role !== "teacher" ||
      !currentResponsibleStaffId ||
      currentResponsibleStaffId === profile.id;

    return teacherCanClear
      ? { responsibleStaffId: null, valid: true }
      : { responsibleStaffId: null, valid: false };
  }

  if (!isSchoolStaff(profile)) {
    return { responsibleStaffId: null, valid: false };
  }

  if (
    profile.role === "teacher" &&
    requestedResponsibleStaffId !== profile.id &&
    requestedResponsibleStaffId !== currentResponsibleStaffId
  ) {
    return { responsibleStaffId: null, valid: false };
  }

  const admin = createAdminClient();
  const { data: responsibleStaff } = await timeServer(
    "events.action.validate-responsible-staff",
    () =>
      admin
        .from("profiles")
        .select("id, school_id, role, status")
        .eq("id", requestedResponsibleStaffId)
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .in("role", ["school_admin", "teacher"])
        .maybeSingle<ResponsibleStaffProfile>(),
  );

  return responsibleStaff
    ? { responsibleStaffId: responsibleStaff.id, valid: true }
    : { responsibleStaffId: null, valid: false };
}

function eventDecisionInfoErrorMessage(
  error: EventDecisionInfoError,
  i18n: ServerI18n,
) {
  if (error === "eligibility_too_long") {
    return i18n.t("events.errors.eligibilityTooLong");
  }

  if (error === "accessibility_too_long") {
    return i18n.t("events.errors.accessibilityTooLong");
  }

  return i18n.t("events.errors.invalidExperienceLevel");
}

function parseRiskLevel(value: FormDataEntryValue | null): EventRiskLevel | null {
  const riskLevel = String(value ?? "").trim();

  if (
    riskLevel === "low" ||
    riskLevel === "medium" ||
    riskLevel === "high"
  ) {
    return riskLevel;
  }

  return null;
}

function getRegistrationPermissionStatus(
  event: EventRecord,
  existingStatus: EventPermissionStatus | undefined,
): EventPermissionStatus {
  if (!event.permission_required) {
    return "not_required";
  }

  return existingStatus === "received" ? "received" : "pending";
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
