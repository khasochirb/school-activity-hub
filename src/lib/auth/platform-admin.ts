import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

type PlatformAdminRow = {
  created_at: string;
  profile_id: string;
  status: "active" | "inactive";
};

type CurrentProfile = {
  full_name: string;
  id: string;
  role: "school_admin" | "teacher" | "student";
  school_id: string;
  status: "active" | "inactive";
};

export type PlatformAdminProfile = CurrentProfile & {
  email: string | null;
  platform_admin_created_at: string;
};

export type PlatformAdminIdentity = {
  email: string | null;
  id: string;
  platform_admin_created_at: string;
};

export const getCurrentPlatformAdminIdentity = cache(async () => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data: platformAdmin, error } = await supabase
    .from("platform_admins")
    .select("profile_id, status, created_at")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle<PlatformAdminRow>();

  if (error || !platformAdmin) {
    return null;
  }

  return {
    email: user.email ?? null,
    id: user.id,
    platform_admin_created_at: platformAdmin.created_at,
  } satisfies PlatformAdminIdentity;
});

export const getCurrentPlatformAdminProfile = cache(async () => {
  const supabase = await createClient();
  const platformAdminIdentity = await getCurrentPlatformAdminIdentity();

  if (!platformAdminIdentity) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, school_id, role, status, full_name")
    .eq("id", platformAdminIdentity.id)
    .maybeSingle<CurrentProfile>();

  if (profileError || !profile || profile.status !== "active") {
    return null;
  }

  return {
    ...profile,
    email: platformAdminIdentity.email,
    platform_admin_created_at: platformAdminIdentity.platform_admin_created_at,
  } satisfies PlatformAdminProfile;
});

export async function requirePlatformAdmin() {
  const platformAdmin = await getCurrentPlatformAdminProfile();

  if (!platformAdmin) {
    redirect("/dashboard");
  }

  return platformAdmin;
}
