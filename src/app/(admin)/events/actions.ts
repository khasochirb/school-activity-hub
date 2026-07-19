"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentEventActor,
  isEventStaffActor,
  type EventActor,
} from "@/lib/auth/event-access";
import { createPlatformAuditLog } from "@/lib/audit/platform-audit";
import { parseActivityCategory } from "@/lib/activity-categories";
import {
  parseEventDecisionInfo,
  type EventDecisionInfoError,
} from "@/lib/events/event-decision-info";
import {
  parseEventPracticalDetails,
  type EventPracticalDetailsError,
} from "@/lib/events/event-practical-details";
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
  category?: EventActionErrorCategory;
  fieldErrors?: Record<string, string>;
  message: string;
  success: boolean;
};

export type EventActionErrorCategory =
  | "authorization_error"
  | "conflict_error"
  | "invalid_responsible_staff"
  | "invalid_school"
  | "schema_update_required"
  | "service_unavailable"
  | "unexpected_error"
  | "validation_error";

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function createEvent(
  _state: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const i18n = await getServerI18n();
  const actor = await getCurrentEventActor();
  const profile = actor?.profile ?? null;

  if (!actor || (!profile && !actor.isPlatformAdmin)) {
    return actionError("authorization_error", i18n.t("events.errors.unauthenticated"));
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
  const practicalDetailsResult = parseEventPracticalDetails(formData);
  const isStaff = isEventStaffActor(actor);
  const isLeaderEvent = !isStaff;
  const requestedSchoolId = String(formData.get("school_id") ?? "").trim();
  const targetSchoolId = actor.isPlatformAdmin
    ? requestedSchoolId
    : profile?.school_id ?? "";

  if (actor.isPlatformAdmin && !targetSchoolId) {
    return actionError("invalid_school", i18n.t("events.platform.selectSchoolRequired"), {
      school_id: i18n.t("events.platform.selectSchoolRequired"),
    });
  }

  if (actor.isPlatformAdmin) {
    const schoolValidation = await validateActivePlatformEventSchool(targetSchoolId);
    if (!schoolValidation.valid) {
      const message =
        schoolValidation.category === "invalid_school"
          ? i18n.t("events.platform.invalidSchool")
          : i18n.t(`events.errors.${schoolValidation.category}`);
      return actionError(schoolValidation.category, message, {
        school_id: message,
      });
    }
  }

  if (!title) {
    return actionError("validation_error", i18n.t("events.errors.titleRequired"), {
      title: i18n.t("events.errors.titleRequired"),
    });
  }

  if (decisionInfoResult.error) {
    const message = eventDecisionInfoErrorMessage(decisionInfoResult.error, i18n);
    return actionError("validation_error", message, {
      [eventDecisionInfoField(decisionInfoResult.error)]: message,
    });
  }

  const decisionInfo = decisionInfoResult.data;

  if (practicalDetailsResult.error) {
    const message = eventPracticalDetailsErrorMessage(
      practicalDetailsResult.error,
      i18n,
    );
    return actionError("validation_error", message, {
      [eventPracticalDetailsField(practicalDetailsResult.error)]: message,
    });
  }

  const practicalDetails = practicalDetailsResult.data;

  if (!location) {
    return actionError("validation_error", i18n.t("events.errors.locationRequired"), {
      location: i18n.t("events.errors.locationRequired"),
    });
  }

  if (categoryInput && !category) {
    return actionError("validation_error", i18n.t("events.errors.invalidCategory"), {
      category: i18n.t("events.errors.invalidCategory"),
    });
  }

  const startsAt = parseDateTime(startsAtInput);
  const endsAt = parseDateTime(endsAtInput);

  if (!startsAt || !endsAt) {
    return actionError("validation_error", i18n.t("events.errors.timeRequired"), {
      starts_at: i18n.t("events.errors.timeRequired"),
      ends_at: i18n.t("events.errors.timeRequired"),
    });
  }

  if (endsAt <= startsAt) {
    return actionError("validation_error", i18n.t("events.errors.validTimeOrder"), {
      ends_at: i18n.t("events.errors.validTimeOrder"),
    });
  }

  const capacity = parseCapacity(maxParticipantsInput);

  if (capacity === "invalid") {
    return actionError(
      "validation_error",
      i18n.t("events.errors.maxParticipantsPositive"),
      { max_participants: i18n.t("events.errors.maxParticipantsPositive") },
    );
  }

  if (!riskLevel) {
    return actionError("validation_error", i18n.t("events.errors.invalidRiskLevel"), {
      risk_level: i18n.t("events.errors.invalidRiskLevel"),
    });
  }

  if (isLeaderEvent && !clubId) {
    return actionError("validation_error", i18n.t("events.errors.leaderClubRequired"), {
      club_id: i18n.t("events.errors.leaderClubRequired"),
    });
  }

  if (!isStaff && (!profile || !(await isCurrentUserLeaderForClub(profile, clubId)))) {
    return actionError("authorization_error", i18n.t("events.errors.staffOrLeaderOnly"));
  }

  if (clubId && !(await isClubInSchool(targetSchoolId, clubId))) {
    return actionError("validation_error", i18n.t("events.errors.invalidClub"), {
      club_id: i18n.t("events.errors.invalidClub"),
    });
  }

  const responsibleStaff = await validateResponsibleStaffAssignment({
    actor,
    currentResponsibleStaffId: null,
    schoolId: targetSchoolId,
    requestedResponsibleStaffId: decisionInfo.responsibleStaffId,
  });

  if (!responsibleStaff.valid) {
    return actionError(
      "invalid_responsible_staff",
      i18n.t("events.errors.invalidResponsibleStaff"),
      { responsible_staff_id: i18n.t("events.errors.invalidResponsibleStaff") },
    );
  }

  const now = new Date().toISOString();
  const status = isStaff ? "approved" : "pending_approval";
  const supabase = await createClient();
  const { data: createdEvent, error } = await timeServer("events.action.create.insert", () =>
    supabase.from("events").insert({
      school_id: targetSchoolId,
      club_id: clubId || null,
      created_by_profile_id: actor.isPlatformAdmin ? null : profile?.id ?? null,
      submitted_by_profile_id: actor.isPlatformAdmin ? null : profile?.id ?? null,
      approved_by_profile_id:
        isStaff && !actor.isPlatformAdmin ? profile?.id ?? null : null,
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
      cost_type: practicalDetails.costType,
      cost_amount: practicalDetails.costAmount,
      cost_currency: practicalDetails.costCurrency,
      cost_notes: practicalDetails.costNotes,
      required_materials: practicalDetails.requiredMaterials,
      expected_commitment: practicalDetails.expectedCommitment,
      status,
      submitted_at: now,
      approved_at: isStaff ? now : null,
    }).select("id").single<{ id: string }>(),
  );

  if (error) {
    console.error("events.action.create failed", {
      code: error.code,
      platformAdmin: actor.isPlatformAdmin,
      schoolId: targetSchoolId,
    });
    const category = error.code === "42P01" || error.code === "42703"
      ? "schema_update_required"
      : error.code === "23505"
        ? "conflict_error"
        : "service_unavailable";
    return actionError(category, i18n.t(`events.errors.${category}`));
  }

  if (actor.isPlatformAdmin && createdEvent) {
    await createPlatformEventAudit(actor, "platform.event.created", createdEvent.id, targetSchoolId);
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
  const actor = await requireEventStaffActor();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return;
  }

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .update({ status: "canceled" })
    .eq("id", eventId)
    .eq("status", "approved");

  if (!actor.isPlatformAdmin && actor.profile) {
    query = query.eq("school_id", actor.profile.school_id);
  }

  const { data: event } = await timeServer("events.action.cancel-event.update", () =>
    query.select("id, school_id").maybeSingle<{ id: string; school_id: string }>(),
  );
  if (event) {
    await createPlatformEventAudit(actor, "platform.event.canceled", event.id, event.school_id);
  }

  revalidatePath("/events");
}

export async function updateEventSafety(formData: FormData) {
  const actor = await requireEventStaffActor();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const riskLevel = parseRiskLevel(formData.get("risk_level"));
  const permissionRequired =
    String(formData.get("permission_required") ?? "") === "true";
  const permissionNote = String(formData.get("permission_note") ?? "").trim();

  if (!eventId || !riskLevel) {
    return;
  }

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .update({
      risk_level: riskLevel,
      permission_required: permissionRequired,
      permission_note: permissionNote || null,
    })
    .eq("id", eventId);
  if (!actor.isPlatformAdmin && actor.profile) {
    query = query.eq("school_id", actor.profile.school_id);
  }
  const { data: event } = await timeServer("events.action.update-safety.update", () =>
    query.select("id, school_id").maybeSingle<{ id: string; school_id: string }>(),
  );
  if (event) {
    await createPlatformEventAudit(actor, "platform.event.safety_updated", event.id, event.school_id);
  }

  revalidatePath("/events");
  revalidatePath("/approvals");
}

export async function updateEventDecisionInfo(formData: FormData) {
  const actor = await requireEventStaffActor();

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
        .select("id, school_id, responsible_staff_id")
        .eq("id", eventId)
        .maybeSingle<{ id: string; school_id: string; responsible_staff_id: string | null }>(),
  );

  if (!event) {
    return;
  }

  if (!actor.isPlatformAdmin && actor.profile?.school_id !== event.school_id) {
    return;
  }

  const responsibleStaff = await validateResponsibleStaffAssignment({
    actor,
    currentResponsibleStaffId: event.responsible_staff_id,
    schoolId: event.school_id,
    requestedResponsibleStaffId:
      decisionInfoResult.data.responsibleStaffId,
  });

  if (!responsibleStaff.valid) {
    return;
  }

  const supabase = await createClient();
  const { data: updatedEvent } = await timeServer("events.action.update-decision-info.update", () =>
    supabase
      .from("events")
      .update({
        accessibility_notes: decisionInfoResult.data.accessibilityNotes,
        eligibility_notes: decisionInfoResult.data.eligibilityNotes,
        experience_level: decisionInfoResult.data.experienceLevel,
        responsible_staff_id: responsibleStaff.responsibleStaffId,
      })
      .eq("id", event.id)
      .eq("school_id", event.school_id)
      .select("id")
      .maybeSingle<{ id: string }>(),
  );

  if (updatedEvent) {
    await createPlatformEventAudit(actor, "platform.event.decision_info_updated", event.id, event.school_id);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${event.id}`);
  revalidatePath("/approvals");
}

export async function updateEventPracticalDetails(formData: FormData) {
  const actor = await requireEventStaffActor();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const practicalDetailsResult = parseEventPracticalDetails(formData);

  if (!eventId || practicalDetailsResult.error) {
    return;
  }

  const event = await getManageableEvent(actor, eventId);
  if (!event) {
    return;
  }
  const supabase = await createClient();
  const { data: updatedEvent } = await timeServer("events.action.update-practical-details", () =>
    supabase
      .from("events")
      .update({
        cost_amount: practicalDetailsResult.data.costAmount,
        cost_currency: practicalDetailsResult.data.costCurrency,
        cost_notes: practicalDetailsResult.data.costNotes,
        cost_type: practicalDetailsResult.data.costType,
        expected_commitment: practicalDetailsResult.data.expectedCommitment,
        required_materials: practicalDetailsResult.data.requiredMaterials,
      })
      .eq("id", eventId)
      .eq("school_id", event.school_id)
      .select("id")
      .maybeSingle<{ id: string }>(),
  );

  if (updatedEvent) {
    await createPlatformEventAudit(actor, "platform.event.practical_details_updated", event.id, event.school_id);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/approvals");
}

export async function updateEventSharing(formData: FormData) {
  const actor = await requireEventStaffActor();

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
  const supabase = await createClient();
  const { data: event } = await timeServer(
    "events.action.update-sharing.event-lookup",
    () =>
      admin
        .from("events")
        .select("id, school_id")
        .eq("id", eventId)
        .eq("status", "approved")
        .maybeSingle<{ id: string; school_id: string }>(),
  );

  if (!event) {
    return;
  }

  if (!actor.isPlatformAdmin && actor.profile?.school_id !== event.school_id) {
    return;
  }

  const connectedSchoolIds = await getConnectedSchoolIds(admin, event.school_id);
  const connectedSchoolIdSet = new Set(connectedSchoolIds);
  const shareSchoolIds = requestedSchoolIds.filter((schoolId) =>
    connectedSchoolIdSet.has(schoolId),
  );

  const { error: deleteError } = await timeServer("events.action.update-sharing.delete-shares", () =>
    supabase.from("event_school_shares").delete().eq("event_id", event.id),
  );
  if (deleteError) {
    console.error("events.action.update-sharing.delete failed", { code: deleteError.code });
    return;
  }

  if (shareSchoolIds.length) {
    const { error: insertError } = await timeServer(
      "events.action.update-sharing.insert-shares",
      () =>
        supabase.from("event_school_shares").insert(
          shareSchoolIds.map((schoolId) => ({
            event_id: event.id,
            school_id: schoolId,
          })),
      ),
    );
    if (insertError) {
      console.error("events.action.update-sharing.insert failed", { code: insertError.code });
      return;
    }
  }

  const { data: updatedEvent } = await timeServer("events.action.update-sharing.update-event", () =>
    supabase
      .from("events")
      .update({
        allow_connected_school_registration:
          shareSchoolIds.length > 0 && allowConnectedRegistration,
      })
      .eq("id", event.id)
      .eq("school_id", event.school_id)
      .select("id")
      .maybeSingle<{ id: string }>(),
  );

  if (updatedEvent) {
    await createPlatformEventAudit(actor, "platform.event.sharing_updated", event.id, event.school_id);
  }

  revalidatePath("/events");
}

async function requireEventStaffActor() {
  const actor = await getCurrentEventActor();

  if (!actor) {
    redirect("/login");
  }

  if (!isEventStaffActor(actor)) {
    redirect("/events");
  }

  return actor;
}

async function getManageableEvent(actor: EventActor, eventId: string) {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("id, school_id")
    .eq("id", eventId);

  if (!actor.isPlatformAdmin && actor.profile) {
    query = query.eq("school_id", actor.profile.school_id);
  }

  const { data } = await query.maybeSingle<{ id: string; school_id: string }>();
  return data;
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

async function isClubInSchool(schoolId: string, clubId: string) {
  const admin = createAdminClient();
  const { data: club } = await timeServer(
    "events.action.club-in-current-school",
    () =>
      admin
        .from("clubs")
        .select("id")
        .eq("id", clubId)
        .eq("school_id", schoolId)
        .eq("status", "active")
        .maybeSingle<{ id: string }>(),
  );

  return Boolean(club);
}

async function validateResponsibleStaffAssignment({
  actor,
  currentResponsibleStaffId,
  schoolId,
  requestedResponsibleStaffId,
}: {
  actor: EventActor;
  currentResponsibleStaffId: string | null;
  schoolId: string;
  requestedResponsibleStaffId: string | null;
}): Promise<
  | { responsibleStaffId: string | null; valid: true }
  | { responsibleStaffId: null; valid: false }
> {
  if (!requestedResponsibleStaffId) {
    const teacherCanClear =
      actor.isPlatformAdmin ||
      actor.profile?.role !== "teacher" ||
      !currentResponsibleStaffId ||
      currentResponsibleStaffId === actor.profile?.id;

    return teacherCanClear
      ? { responsibleStaffId: null, valid: true }
      : { responsibleStaffId: null, valid: false };
  }

  if (!isEventStaffActor(actor)) {
    return { responsibleStaffId: null, valid: false };
  }

  if (
    !actor.isPlatformAdmin &&
    actor.profile?.role === "teacher" &&
    requestedResponsibleStaffId !== actor.profile.id &&
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
        .eq("school_id", schoolId)
        .eq("status", "active")
        .in("role", ["school_admin", "teacher"])
        .maybeSingle<ResponsibleStaffProfile>(),
  );

  return responsibleStaff
    ? { responsibleStaffId: responsibleStaff.id, valid: true }
    : { responsibleStaffId: null, valid: false };
}

async function validateActivePlatformEventSchool(
  schoolId: string,
): Promise<
  | { valid: true }
  | {
      category: "invalid_school" | "schema_update_required" | "service_unavailable";
      valid: false;
    }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_platform_event_school_options");

  if (error) {
    console.error("events.action.platform-school-options failed", {
      code: error.code,
    });
    return {
      category: ["42P01", "42703", "42883", "PGRST202"].includes(error.code)
        ? "schema_update_required"
        : "service_unavailable",
      valid: false,
    };
  }

  return (data as Array<{ id: string }> | null)?.some(
    (school) => school.id === schoolId,
  )
    ? { valid: true }
    : { category: "invalid_school", valid: false };
}

function actionError(
  category: EventActionErrorCategory,
  message: string,
  fieldErrors?: Record<string, string>,
): CreateEventState {
  return { category, fieldErrors, message, success: false };
}

function eventDecisionInfoField(error: EventDecisionInfoError) {
  if (error === "eligibility_too_long") return "eligibility_notes";
  if (error === "accessibility_too_long") return "accessibility_notes";
  return "experience_level";
}

function eventPracticalDetailsField(error: EventPracticalDetailsError) {
  if (error === "commitment_too_long") return "expected_commitment";
  if (error === "materials_too_long") return "required_materials";
  if (error === "invalid_cost_amount" || error === "paid_cost_required") {
    return "cost_amount";
  }
  if (error === "invalid_cost_currency") return "cost_currency";
  if (error === "invalid_cost_type") return "cost_type";
  return "cost_notes";
}

async function createPlatformEventAudit(
  actor: EventActor,
  action: string,
  eventId: string,
  schoolId: string,
) {
  if (!actor.isPlatformAdmin) {
    return;
  }

  await createPlatformAuditLog({
    action,
    actor: { id: actor.userId },
    metadata: { outcome: "success" },
    targetId: eventId,
    targetSchoolId: schoolId,
    targetType: "event",
  });
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

function eventPracticalDetailsErrorMessage(
  error: EventPracticalDetailsError,
  i18n: ServerI18n,
) {
  const keyByError: Record<EventPracticalDetailsError, string> = {
    commitment_too_long: "events.errors.commitmentTooLong",
    cost_notes_too_long: "events.errors.costNotesTooLong",
    invalid_cost_amount: "events.errors.invalidCostAmount",
    invalid_cost_currency: "events.errors.invalidCostCurrency",
    invalid_cost_type: "events.errors.invalidCostType",
    materials_too_long: "events.errors.materialsTooLong",
    paid_cost_required: "events.errors.paidCostRequired",
    unexpected_cost_details: "events.errors.unexpectedCostDetails",
    variable_cost_notes_required: "events.errors.variableCostNotesRequired",
  };

  return i18n.t(keyByError[error]);
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
