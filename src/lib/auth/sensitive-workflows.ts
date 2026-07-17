import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { logServerError } from "@/lib/errors/server-error";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type ActiveSchoolProfile = {
  full_name: string;
  id: string;
  role: "school_admin" | "student" | "teacher";
  school_id: string;
  status: "active";
};

export const getCurrentActiveSchoolProfile = cache(async () => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, school_id, role, status, full_name")
    .eq("id", user.id)
    .eq("status", "active")
    .maybeSingle<ActiveSchoolProfile>();

  if (error) {
    logServerError("Active school profile lookup failed", error);
    return null;
  }

  return data;
});

export const getCurrentSafeguardingAccess = cache(async () => {
  const profile = await getCurrentActiveSchoolProfile();

  if (!profile) {
    return { isDesignated: false, profile: null };
  }

  if (!["school_admin", "teacher"].includes(profile.role)) {
    return { isDesignated: false, profile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("safeguarding_staff_designations")
    .select("id")
    .eq("school_id", profile.school_id)
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (error) {
    logServerError("Safeguarding designation lookup failed", error);
  }

  return { isDesignated: Boolean(data), profile };
});

export async function requireActiveSchoolProfile() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentActiveSchoolProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  return profile;
}

export async function requireSchoolAdminForSensitiveWorkflow() {
  const profile = await requireActiveSchoolProfile();

  if (profile.role !== "school_admin") {
    redirect("/dashboard");
  }

  return profile;
}

export async function requireSafeguardingStaff() {
  const access = await getCurrentSafeguardingAccess();

  if (!access.profile) {
    redirect("/login");
  }

  if (!access.isDesignated) {
    redirect("/safety");
  }

  return access.profile;
}
