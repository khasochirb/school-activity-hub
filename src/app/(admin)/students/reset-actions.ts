"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { isUuid } from "@/lib/clubs/club-profile";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResetSignInState = { code: string | null; message: string; success: boolean };

// A student who can't get in (wrong email, forgotten password, someone else
// used their code): a school admin turns their old login off and makes a new
// one-time code. Clubs, attendance and portfolio stay with the student, so
// the new account picks them up; only the old login is retired.
//   1. the old login is renamed to a dead address and banned, freeing the
//      student's real email for the new sign-up
//   2. its profile is marked inactive and unlinked from the student
//   3. any unused codes for the student are revoked and a new one is made
export async function resetStudentSignIn(
  _state: ResetSignInState,
  formData: FormData,
): Promise<ResetSignInState> {
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);
  const fail = (key: string): ResetSignInState => ({ code: null, message: t(key), success: false });
  const actor = await requireActiveSchoolProfile();
  const rosterId = String(formData.get("student_id") ?? "");

  if (actor.role !== "school_admin") return fail("students.reset.errors.adminsOnly");
  if (!isUuid(rosterId)) return fail("students.reset.errors.notFound");

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("student_rosters")
    .select("id, school_id, profile_id")
    .eq("id", rosterId)
    .eq("school_id", actor.school_id)
    .maybeSingle<{ id: string; profile_id: string | null; school_id: string }>();

  if (!student) return fail("students.reset.errors.notFound");

  if (student.profile_id) {
    const oldId = student.profile_id;
    const { error: authError } = await admin.auth.admin.updateUserById(oldId, {
      ban_duration: "876000h",
      email: `retired+${oldId}@accounts.invalid`,
      email_confirm: true,
    });

    if (authError) {
      logServerError("Student sign-in reset: retiring the old login failed", authError);
      return fail("students.reset.errors.failed");
    }

    await admin.from("profiles").update({ status: "inactive" }).eq("id", oldId).eq("role", "student");

    const { error: unlinkError } = await admin
      .from("student_rosters")
      .update({ profile_id: null, status: "active" })
      .eq("id", student.id)
      .eq("profile_id", oldId);

    if (unlinkError) {
      logServerError("Student sign-in reset: unlinking failed", unlinkError);
      return fail("students.reset.errors.failed");
    }
  }

  await admin
    .from("invite_codes")
    .update({ status: "revoked" })
    .eq("student_roster_id", student.id)
    .eq("audience", "student")
    .eq("status", "active")
    .eq("use_count", 0);

  const code = createPlainInviteCode();
  const { error } = await admin.from("invite_codes").insert({
    audience: "student",
    code_hash: createHash("sha256").update(code.toUpperCase()).digest("hex"),
    code_hint: `${code.slice(0, 4)}...`,
    created_by_profile_id: actor.id,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    max_uses: 1,
    school_id: student.school_id,
    status: "active",
    student_roster_id: student.id,
    use_count: 0,
  });

  if (error) {
    logServerError("Student sign-in reset: new code failed", error);
    return fail("students.reset.errors.failed");
  }

  revalidatePath("/students");
  revalidatePath("/invite-codes");

  return { code, message: t("students.reset.done"), success: true };
}

function createPlainInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const characters = Array.from(randomBytes(10), (byte) => alphabet[byte % alphabet.length]);

  return `${characters.slice(0, 4).join("")}-${characters.slice(4, 8).join("")}-${characters.slice(8).join("")}`;
}
