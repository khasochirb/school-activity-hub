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
