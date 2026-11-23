"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

// Marks every unread notification of the signed-in user as read. Runs as the
// user, so row security limits it to their own rows and to read_at.
export async function markAllNotificationsRead() {
  const user = await getCurrentUser();

  if (!user) return;

  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_profile_id", user.id)
    .is("read_at", null);

  revalidatePath("/", "layout");
}
