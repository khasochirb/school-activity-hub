"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileState = {
  message: string;
  success: boolean;
};

export async function updateProfile(
  _state: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!fullName) {
    return { message: "Full name is required.", success: false };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return {
      message: `Profile could not be updated: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/profile");

  return { message: "Profile updated.", success: true };
}
