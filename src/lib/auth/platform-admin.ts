import "server-only";

import { redirect } from "next/navigation";
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

export async function getCurrentPlatformAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: platformAdmin, error: platformAdminError } = await supabase
    .from("platform_admins")
    .select("profile_id, status, created_at")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle<PlatformAdminRow>();

  if (platformAdminError || !platformAdmin) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, school_id, role, status, full_name")
    .eq("id", user.id)
    .maybeSingle<CurrentProfile>();

  if (profileError || !profile || profile.status !== "active") {
    return null;
  }

  return {
    ...profile,
    email: user.email ?? null,
    platform_admin_created_at: platformAdmin.created_at,
  } satisfies PlatformAdminProfile;
}

export async function requirePlatformAdmin() {
  const platformAdmin = await getCurrentPlatformAdminProfile();

  if (!platformAdmin) {
    redirect("/dashboard");
  }

  return platformAdmin;
}
