"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StaffProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export async function approveEvent(formData: FormData) {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return;
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  await supabase
    .from("events")
    .update({
      status: "approved",
      approved_by_profile_id: profile.id,
      approved_at: now,
      rejection_reason: null,
    })
    .eq("id", eventId)
    .eq("school_id", profile.school_id)
    .eq("status", "pending_approval");

  revalidatePath("/approvals");
  revalidatePath("/events");
}

export async function rejectEvent(formData: FormData) {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!eventId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("events")
    .update({
      status: "rejected",
      approved_by_profile_id: null,
      approved_at: null,
      rejection_reason: rejectionReason || null,
    })
    .eq("id", eventId)
    .eq("school_id", profile.school_id)
    .eq("status", "pending_approval");

  revalidatePath("/approvals");
  revalidatePath("/events");
}

async function getCurrentStaffProfile(): Promise<StaffProfile | null> {
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
    .maybeSingle<StaffProfile>();

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    return null;
  }

  return profile;
}
