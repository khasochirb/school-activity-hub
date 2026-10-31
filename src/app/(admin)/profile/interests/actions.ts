"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACTIVITY_CATEGORIES } from "@/lib/activity-categories";
import { logServerError } from "@/lib/errors/server-error";
import { parseInterestSelection } from "@/lib/students/student-journey";
import { createClient } from "@/lib/supabase/server";

type StudentProfile = {
  id: string;
  role: "school_admin" | "teacher" | "student";
  school_id: string;
};

export async function saveStudentInterests(formData: FormData) {
  const returnTo = safeReturnPath(formData.get("return_to"));
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
    .eq("status", "active")
    .maybeSingle<StudentProfile>();

  if (!profile || profile.role !== "student") {
    redirect("/profile");
  }

  const selected = parseInterestSelection(
    formData.getAll("interests"),
    ACTIVITY_CATEGORIES,
  );

  // Writes run as the student under row-level security; no privileged client.
  const { data: existingRows, error: loadError } = await supabase
    .from("student_interests")
    .select("category")
    .eq("profile_id", profile.id)
    .returns<Array<{ category: string }>>();

  if (loadError) {
    logServerError("Student interests load before save failed", loadError);
    redirect("/profile/interests?error=save");
  }

  const existing = new Set((existingRows ?? []).map((row) => row.category));
  const wanted = new Set(selected);
  const toRemove = [...existing].filter((category) => !wanted.has(category));
  const toAdd = selected.filter((category) => !existing.has(category));

  if (toRemove.length) {
    const { error } = await supabase
      .from("student_interests")
      .delete()
      .eq("profile_id", profile.id)
      .in("category", toRemove);

    if (error) {
      logServerError("Student interests removal failed", error);
      redirect("/profile/interests?error=save");
    }
  }

  if (toAdd.length) {
    const { error } = await supabase.from("student_interests").insert(
      toAdd.map((category) => ({
        category,
        profile_id: profile.id,
        school_id: profile.school_id,
      })),
    );

    if (error) {
      logServerError("Student interests insert failed", error);
      redirect("/profile/interests?error=save");
    }
  }

  revalidatePath("/profile");
  revalidatePath("/clubs");
  redirect(returnTo);
}

function safeReturnPath(value: FormDataEntryValue | null) {
  const path = String(value ?? "");

  return path === "/clubs" ? "/clubs" : "/profile";
}
