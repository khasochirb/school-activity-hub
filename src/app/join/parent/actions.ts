"use server";

import { redirect } from "next/navigation";
import { PARENT_ACCOUNT_TYPE } from "@/lib/family/parent-paths";
import { findParentInvite, linkParentToChild, type ParentJoinState } from "@/lib/family/parent-codes";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// A parent creates their account with their child's parent code. The account
// can only see the children whose parent codes it redeems.
export async function redeemParentInviteCode(
  _state: ParentJoinState,
  formData: FormData,
): Promise<ParentJoinState> {
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);
  const fail = (key: string): ParentJoinState => ({ message: t(key), success: false });
  const code = String(formData.get("invite_code") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!fullName) return fail("family.errors.nameRequired");
  if (!email || !email.includes("@")) return fail("auth.errors.invalidEmail");
  if (password.length < 8) return fail("auth.errors.passwordMinLength");
  if (password !== confirmPassword) return fail("auth.errors.passwordMismatch");

  const found = await findParentInvite(code);

  if (found.error) return fail(`family.errors.${found.error}`);

  const invite = found.invite!;
  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("student_rosters")
    .select("id")
    .eq("id", invite.student_roster_id!)
    .eq("school_id", invite.school_id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!roster) return fail("family.errors.inactiveStudent");

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    // Only the service role can set app_metadata; the request proxy reads it
    // to keep parent accounts on the family pages.
    app_metadata: { account_type: PARENT_ACCOUNT_TYPE },
    email,
    email_confirm: true,
    password,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    logServerError("Parent account creation failed", createError);
    return fail("family.errors.accountCreateFailed");
  }

  const userId = created.user.id;
  const cleanup = async () => {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  };
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      full_name: fullName,
      id: userId,
      role: "parent",
      school_id: invite.school_id,
      status: "active",
      username: null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    logServerError("Parent profile save failed", profileError);
    await cleanup();
    return fail("family.errors.accountCreateFailed");
  }

  const linked = await linkParentToChild({ code, parentProfileId: userId, parentSchoolId: invite.school_id });

  if (linked.error) {
    await cleanup();
    return fail(`family.errors.${linked.error}`);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) return { message: t("family.join.created"), success: true };

  redirect("/family");
}
