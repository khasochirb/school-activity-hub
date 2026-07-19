"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEventActor, isEventStaffActor } from "@/lib/auth/event-access";
import { createPlatformAuditLog } from "@/lib/audit/platform-audit";
import { createClient } from "@/lib/supabase/server";

export async function approveEvent(formData: FormData) {
  const actor = await getCurrentEventActor();
  if (!actor || !isEventStaffActor(actor)) {
    redirect("/dashboard");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return;
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const event = await getManageablePendingEvent(actor, eventId);
  if (!event) {
    return;
  }
  const { data: approvedEvent } = await supabase
    .from("events")
    .update({
      status: "approved",
      approved_by_profile_id: actor.isPlatformAdmin ? null : actor.profile?.id ?? null,
      approved_at: now,
      rejection_reason: null,
    })
    .eq("id", eventId)
    .eq("school_id", event.school_id)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (approvedEvent) {
    await auditPlatformApproval(actor, "platform.event.approved", event);
  }

  revalidatePath("/approvals");
  revalidatePath("/events");
}

export async function rejectEvent(formData: FormData) {
  const actor = await getCurrentEventActor();
  if (!actor || !isEventStaffActor(actor)) {
    redirect("/dashboard");
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!eventId) {
    return;
  }

  const supabase = await createClient();
  const event = await getManageablePendingEvent(actor, eventId);
  if (!event) {
    return;
  }
  const { data: rejectedEvent } = await supabase
    .from("events")
    .update({
      status: "rejected",
      approved_by_profile_id: null,
      approved_at: null,
      rejection_reason: rejectionReason || null,
    })
    .eq("id", eventId)
    .eq("school_id", event.school_id)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (rejectedEvent) {
    await auditPlatformApproval(actor, "platform.event.rejected", event);
  }

  revalidatePath("/approvals");
  revalidatePath("/events");
}

async function getManageablePendingEvent(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentEventActor>>>,
  eventId: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("id, school_id")
    .eq("id", eventId)
    .eq("status", "pending_approval");
  if (!actor.isPlatformAdmin && actor.profile) {
    query = query.eq("school_id", actor.profile.school_id);
  }
  const { data } = await query.maybeSingle<{ id: string; school_id: string }>();
  return data;
}

async function auditPlatformApproval(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentEventActor>>>,
  action: string,
  event: { id: string; school_id: string },
) {
  if (!actor.isPlatformAdmin) return;
  await createPlatformAuditLog({
    action,
    actor: { id: actor.userId },
    metadata: { outcome: "success" },
    targetId: event.id,
    targetSchoolId: event.school_id,
    targetType: "event",
  });
}
