"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StaffProfile = {
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type EventPermissionStatus =
  | "declined"
  | "not_required"
  | "pending"
  | "received";

export async function updateAttendeePermissionStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .maybeSingle<StaffProfile>();

  if (!profile || !isSchoolStaff(profile)) {
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

  const { data: event } = await supabase
    .from("events")
    .select("id, permission_required")
    .eq("id", eventId)
    .eq("school_id", profile.school_id)
    .maybeSingle<{ id: string; permission_required: boolean }>();

  if (!event?.permission_required) {
    return;
  }

  await supabase
    .from("event_attendees")
    .update({ permission_status: permissionStatus })
    .eq("id", attendeeId)
    .eq("event_id", event.id)
    .eq("school_id", profile.school_id);

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

function isSchoolStaff(profile: StaffProfile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}
