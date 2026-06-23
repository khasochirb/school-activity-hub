"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StaffProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type GenerateInviteState = {
  code: string | null;
  message: string;
  success: boolean;
};

export async function generateInviteCode(
  _state: GenerateInviteState,
  formData: FormData,
): Promise<GenerateInviteState> {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return {
      code: null,
      message: "Only school admins and teachers can create invite codes.",
      success: false,
    };
  }

  const studentId = String(formData.get("student_roster_id") ?? "").trim();

  if (!studentId) {
    return {
      code: null,
      message: "Choose an active student.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("student_rosters")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!student) {
    return {
      code: null,
      message: "That student is not active or is not in your school.",
      success: false,
    };
  }

  const { data: existingInvite } = await supabase
    .from("invite_codes")
    .select("id")
    .eq("student_roster_id", student.id)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .eq("use_count", 0)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<{ id: string }>();

  if (existingInvite) {
    return {
      code: null,
      message: "This student already has an active invite code.",
      success: false,
    };
  }

  const plainCode = createPlainInviteCode();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from("invite_codes").insert({
    school_id: profile.school_id,
    student_roster_id: student.id,
    created_by_profile_id: profile.id,
    code_hash: hashInviteCode(plainCode),
    code_hint: `${plainCode.slice(0, 4)}...`,
    status: "active",
    max_uses: 1,
    use_count: 0,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return {
      code: null,
      message: `Invite code could not be created: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/invite-codes");

  return {
    code: plainCode,
    message: "Invite code created. Copy it now; it will not be shown again.",
    success: true,
  };
}

export async function revokeInviteCode(formData: FormData) {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const inviteId = String(formData.get("invite_code_id") ?? "").trim();

  if (!inviteId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("invite_codes")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .eq("use_count", 0)
    .is("redeemed_at", null);

  revalidatePath("/invite-codes");
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

function createPlainInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  const characters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4, 8).join("")}-${characters.slice(8).join("")}`;
}

function hashInviteCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
