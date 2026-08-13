import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type ClubAccessProfile = {
  id: string;
  role: "school_admin" | "student" | "teacher";
  school_id: string;
  status: "active" | "inactive";
};

export type ClubActor = {
  isPlatformAdmin: boolean;
  profile: ClubAccessProfile | null;
  userId: string;
};

export const getCurrentClubActor = cache(async (): Promise<ClubActor | null> => {
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
      .maybeSingle<ClubAccessProfile>(),
    supabase
      .from("platform_admins")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .maybeSingle<{ profile_id: string }>(),
  ]);

  return {
    isPlatformAdmin: Boolean(platformAdminResult.data),
    profile:
      profileResult.data?.status === "active" ? profileResult.data : null,
    userId: user.id,
  };
});

