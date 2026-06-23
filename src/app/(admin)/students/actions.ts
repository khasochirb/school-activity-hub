"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StaffProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type CreateStudentState = {
  message: string;
  success: boolean;
};

export async function createStudent(
  _state: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return {
      message: "Only school admins and teachers can add students.",
      success: false,
    };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const classGroup = String(formData.get("class_group") ?? "").trim();
  const studentNumber = String(formData.get("student_number") ?? "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  if (!fullName) {
    return { message: "Student full name is required.", success: false };
  }

  if (nameParts.length < 2) {
    return {
      message: "Enter both a first and last name.",
      success: false,
    };
  }

  if (!grade) {
    return { message: "Grade is required.", success: false };
  }

  const [firstName, ...lastNameParts] = nameParts;
  const supabase = await createClient();
  const { error } = await supabase.from("student_rosters").insert({
    school_id: profile.school_id,
    first_name: firstName,
    last_name: lastNameParts.join(" "),
    grade_level: grade,
    homeroom: classGroup || null,
    student_number: studentNumber || null,
    status: "active",
    created_by_profile_id: profile.id,
  });

  if (error) {
    return {
      message:
        error.code === "23505"
          ? "A student with that student number already exists."
          : `Student could not be added: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/students");

  return { message: "Student added.", success: true };
}

export async function markStudentInactive(formData: FormData) {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const studentId = String(formData.get("student_id") ?? "").trim();

  if (!studentId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("student_rosters")
    .update({ status: "inactive" })
    .eq("id", studentId)
    .eq("school_id", profile.school_id);

  revalidatePath("/students");
}

async function getCurrentStaffProfile(): Promise<StaffProfile | null> {
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
    .maybeSingle<StaffProfile>();

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    return null;
  }

  return profile;
}
