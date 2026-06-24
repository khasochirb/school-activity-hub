"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type CreateTeacherState = {
  message: string;
  success: boolean;
};

export async function createTeacher(
  _state: CreateTeacherState,
  formData: FormData,
): Promise<CreateTeacherState> {
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    return {
      message: "Only school admins can create teacher accounts.",
      success: false,
    };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) {
    return { message: "Teacher full name is required.", success: false };
  }

  if (!email) {
    return { message: "Teacher email is required.", success: false };
  }

  if (password.length < 8) {
    return { message: "Password must be at least 8 characters.", success: false };
  }

  const admin = createAdminClient();
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

  if (authError || !authData.user) {
    return {
      message: authError?.message ?? "Teacher account could not be created.",
      success: false,
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    school_id: profile.school_id,
    role: "teacher",
    status: "active",
    full_name: fullName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);

    return {
      message:
        profileError.code === "23505"
          ? "A profile already exists for that account."
          : `Teacher profile could not be created: ${profileError.message}`,
      success: false,
    };
  }

  revalidatePath("/staff");

  return { message: "Teacher account created.", success: true };
}

export async function updateTeacherStatus(formData: FormData) {
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const teacherProfileId = String(formData.get("profile_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (
    !teacherProfileId ||
    teacherProfileId === profile.id ||
    !["active", "inactive"].includes(status)
  ) {
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ status })
    .eq("id", teacherProfileId)
    .eq("school_id", profile.school_id)
    .eq("role", "teacher");

  revalidatePath("/staff");
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
