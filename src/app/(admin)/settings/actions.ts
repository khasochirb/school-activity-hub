"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type UpdateSchoolSettingsState = {
  message: string;
  success: boolean;
};

export async function updateSchoolSettings(
  _state: UpdateSchoolSettingsState,
  formData: FormData,
): Promise<UpdateSchoolSettingsState> {
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    return {
      message: "Only school admins can update school settings.",
      success: false,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!name) {
    return { message: "School name is required.", success: false };
  }

  if (!timezone) {
    return { message: "Timezone is required.", success: false };
  }

  if (!isValidTimeZone(timezone)) {
    return {
      message: "Enter a valid timezone, such as America/Vancouver.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({ name, timezone })
    .eq("id", profile.school_id);

  if (error) {
    return {
      message: `School settings could not be updated: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/settings");

  return { message: "School settings updated.", success: true };
}

async function getCurrentSchoolAdminProfile(): Promise<AdminProfile | null> {
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
    .maybeSingle<AdminProfile>();

  if (!profile || profile.role !== "school_admin") {
    return null;
  }

  return profile;
}

function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
