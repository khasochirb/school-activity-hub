"use server";

import { revalidatePath } from "next/cache";
import { linkParentToChild, type ParentJoinState } from "@/lib/family/parent-codes";
import { getParentViewer, isParentOf } from "@/lib/family/family-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";

// A signed-in parent adds another child with that child's parent code.
export async function addChildWithCode(
  _state: ParentJoinState,
  formData: FormData,
): Promise<ParentJoinState> {
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);
  const parent = await getParentViewer();

  if (!parent) return { message: t("family.errors.notParent"), success: false };

  const result = await linkParentToChild({
    code: String(formData.get("invite_code") ?? ""),
    parentProfileId: parent.id,
    parentSchoolId: parent.schoolId,
  });

  if (result.error) return { message: t(`family.errors.${result.error}`), success: false };

  revalidatePath("/family");

  return { message: t("family.add.success"), success: true };
}

// A parent gives or refuses permission for an activity that needs it. This
// is the same permission status teachers see (and could set by hand from a
// paper slip) on the attendance page.
export async function answerPermission(formData: FormData) {
  const parent = await getParentViewer();
  const rosterId = String(formData.get("roster_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const answer = String(formData.get("answer") ?? "");

  if (!parent || (answer !== "received" && answer !== "declined")) return;
  if (!(await isParentOf(parent.id, rosterId))) return;

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, permission_required, starts_at, status")
    .eq("id", eventId)
    .maybeSingle<{ id: string; permission_required: boolean; starts_at: string; status: string }>();

  // Only upcoming activities that ask for permission, before they start.
  if (!event?.permission_required || event.status === "canceled") return;
  if (new Date(event.starts_at).getTime() <= Date.now()) return;

  await admin
    .from("event_attendees")
    .update({ permission_status: answer })
    .eq("event_id", event.id)
    .eq("student_roster_id", rosterId)
    .eq("status", "registered");

  revalidatePath("/family");
}
