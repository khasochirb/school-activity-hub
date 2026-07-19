import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type EventAccessProfile = {
  id: string;
  role: "school_admin" | "student" | "teacher";
  school_id: string;
  status: "active" | "inactive";
};

export type EventActor = {
  isPlatformAdmin: boolean;
  profile: EventAccessProfile | null;
  userId: string;
};

export const getCurrentEventActor = cache(async (): Promise<EventActor | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const [profileResult, platformAdminResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, school_id, role, status")
      .eq("id", user.id)
      .maybeSingle<EventAccessProfile>(),
    supabase
      .from("platform_admins")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .maybeSingle<{ profile_id: string }>(),
  ]);

  const profile =
    profileResult.data?.status === "active" ? profileResult.data : null;

  return {
    isPlatformAdmin: Boolean(platformAdminResult.data),
    profile,
    userId: user.id,
  };
});

export function isEventStaffActor(actor: EventActor) {
  return (
    actor.isPlatformAdmin ||
    actor.profile?.role === "school_admin" ||
    actor.profile?.role === "teacher"
  );
}

export function canManageEventSchool(actor: EventActor, schoolId: string) {
  return (
    actor.isPlatformAdmin ||
    (isEventStaffActor(actor) && actor.profile?.school_id === schoolId)
  );
}
