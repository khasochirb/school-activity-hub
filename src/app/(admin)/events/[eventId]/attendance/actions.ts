"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEventActor, isEventStaffActor } from "@/lib/auth/event-access";
import { createPlatformAuditLog } from "@/lib/audit/platform-audit";
import { createClient } from "@/lib/supabase/server";

type EventPermissionStatus =
  | "declined"
  | "not_required"
  | "pending"
  | "received";

export async function updateAttendeePermissionStatus(formData: FormData) {
  const supabase = await createClient();
  const actor = await getCurrentEventActor();

  if (!actor) {
    redirect("/login");
  }
  if (!isEventStaffActor(actor)) {
    redirect("/dashboard");
  }

  const attendeeId = String(formData.get("attendee_id") ?? "").trim();
  const eventId = String(formData.get("event_id") ?? "").trim();
  const permissionStatus = parsePermissionStatus(
    formData.get("permission_status"),
  );

  if (!attendeeId || !eventId || !permissionStatus) {
    return;
  }

  let eventQuery = supabase
    .from("events")
    .select("id, school_id, permission_required")
    .eq("id", eventId);

  if (!actor.isPlatformAdmin && actor.profile) {
    eventQuery = eventQuery.eq("school_id", actor.profile.school_id);
  }

  const { data: event } = await eventQuery.maybeSingle<{
    id: string;
    permission_required: boolean;
    school_id: string;
  }>();

  if (!event?.permission_required) {
    return;
  }

  const { data: updatedAttendee } = await supabase
    .from("event_attendees")
    .update({ permission_status: permissionStatus })
    .eq("id", attendeeId)
    .eq("event_id", event.id)
    .eq("school_id", event.school_id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (actor.isPlatformAdmin && updatedAttendee) {
    await createPlatformAuditLog({
      action: "platform.event.attendee_permission_updated",
      actor: { id: actor.userId },
      metadata: { outcome: "success" },
      targetId: event.id,
      targetSchoolId: event.school_id,
      targetType: "event",
    });
  }

  revalidatePath(`/events/${event.id}/attendance`);
  revalidatePath("/events");
}

// A teacher marks a registered student present by hand: a student without a
// phone, or one who arrived after the QR check-in closed. Recorded as a manual
// check-in by that teacher, so attendance figures can show the method mix.
// Row-level security on attendance_checkins repeats the "manages this school"
// rule for the insert.
export async function markAttendeePresent(formData: FormData) {
  const supabase = await createClient();
  const actor = await getCurrentEventActor();

  if (!actor) {
    redirect("/login");
  }
  if (!isEventStaffActor(actor)) {
    redirect("/dashboard");
  }

  const attendeeId = String(formData.get("attendee_id") ?? "").trim();
  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!attendeeId || !eventId) {
    return;
  }

  let eventQuery = supabase.from("events").select("id, school_id").eq("id", eventId);

  if (!actor.isPlatformAdmin && actor.profile) {
    eventQuery = eventQuery.eq("school_id", actor.profile.school_id);
  }

  const { data: event } = await eventQuery.maybeSingle<{ id: string; school_id: string }>();

  if (!event) {
    return;
  }

  const { data: attendee } = await supabase
    .from("event_attendees")
    .select("id, status, student_roster_id, attendee_school_id, attendee_profile_id")
    .eq("id", attendeeId)
    .eq("event_id", event.id)
    .eq("school_id", event.school_id)
    .maybeSingle<{
      attendee_profile_id: string | null;
      attendee_school_id: string;
      id: string;
      status: string;
      student_roster_id: string | null;
    }>();

  // Only someone who registered and has not been marked yet.
  if (!attendee || (attendee.status !== "registered" && attendee.status !== "attended")) {
    return;
  }

  const checkedInAt = new Date().toISOString();
  const { error } = await supabase.from("attendance_checkins").insert({
    attendee_profile_id: attendee.attendee_profile_id,
    attendee_school_id: attendee.attendee_school_id,
    checked_in_at: checkedInAt,
    checked_in_by_profile_id: actor.userId,
    event_attendee_id: attendee.id,
    event_id: event.id,
    metadata: { source: "staff_attendance_page" },
    method: "manual",
    result: "success",
    school_id: event.school_id,
    student_roster_id: attendee.student_roster_id,
  });

  // 23505: already checked in (by QR or by another teacher), which is fine.
  if (error && error.code !== "23505") {
    return;
  }

  await supabase
    .from("event_attendees")
    .update({ checked_in_at: checkedInAt, checked_in_by_profile_id: actor.userId, status: "attended" })
    .eq("id", attendee.id)
    .eq("school_id", event.school_id)
    .eq("status", "registered");

  if (actor.isPlatformAdmin) {
    await createPlatformAuditLog({
      action: "platform.event.attendee_marked_present",
      actor: { id: actor.userId },
      metadata: { outcome: "success" },
      targetId: event.id,
      targetSchoolId: event.school_id,
      targetType: "event",
    });
  }

  revalidatePath(`/events/${event.id}/attendance`);
  revalidatePath("/events");
}

function parsePermissionStatus(
  value: FormDataEntryValue | null,
): EventPermissionStatus | null {
  const status = String(value ?? "").trim();

  if (
    status === "declined" ||
    status === "not_required" ||
    status === "pending" ||
    status === "received"
  ) {
    return status;
  }

  return null;
}
