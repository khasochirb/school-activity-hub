import "server-only";

import { logServerError } from "@/lib/errors/server-error";
import type { createAdminClient } from "@/lib/supabase/admin";

// Every kind of in-app notification. The text lives in the dictionaries under
// notifications.kinds.<kind>, filled from `data`, so it shows in the reader's
// language whatever the sender's.
export const NOTIFICATION_KINDS = [
  "founder_invited",
  "founder_confirmed",
  "founder_declined",
  "proposal_ready",
  "proposal_submitted",
  "proposal_approved",
  "proposal_rejected",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NewNotification = {
  data?: Record<string, string | number>;
  kind: NotificationKind;
  link?: string | null;
  recipientProfileId: string;
  schoolId: string;
};

// Written with the service role: users can only read and mark their own.
// A failed notification never blocks the action that caused it.
export async function notify(
  admin: ReturnType<typeof createAdminClient>,
  notifications: NewNotification[],
) {
  const rows = notifications
    .filter((item) => item.recipientProfileId)
    .map((item) => ({
      data: item.data ?? {},
      kind: item.kind,
      link: safeLink(item.link),
      recipient_profile_id: item.recipientProfileId,
      school_id: item.schoolId,
    }));

  if (!rows.length) return;

  const { error } = await admin.from("notifications").insert(rows);

  if (error) logServerError("Notification insert failed", error, { count: rows.length });
}

// Only internal paths: a notification never sends anyone off the site.
export function safeLink(link: string | null | undefined) {
  if (!link) return null;

  return /^\/(?!\/)[A-Za-z0-9/_?=&#.-]*$/.test(link) && link.length <= 300 ? link : null;
}
