"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type InviteRecord = {
  id: string;
  school_id: string;
  student_roster_id: string | null;
  status: string;
  use_count: number;
  expires_at: string;
  redeemed_at: string | null;
};

type RosterStudent = {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  status: string;
  profile_id: string | null;
};

export type JoinState = {
  message: string;
  success: boolean;
};

export async function redeemInviteCode(
  _state: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const rawCode = String(formData.get("invite_code") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const normalizedCode = normalizeInviteCode(rawCode);
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  if (!normalizedCode) {
    return { message: t("auth.join.errors.inviteRequired"), success: false };
  }

  if (!email || !email.includes("@")) {
    return { message: t("auth.errors.invalidEmail"), success: false };
  }

  if (password.length < 8) {
    return {
      message: t("auth.errors.passwordMinLength"),
      success: false,
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: invite } = await admin
    .from("invite_codes")
    .select("id, school_id, student_roster_id, status, use_count, expires_at, redeemed_at")
    .eq("code_hash", hashInviteCode(normalizedCode))
    .maybeSingle<InviteRecord>();

  const inviteError = validateInvite(invite, now, t);

  if (inviteError || !invite) {
    return {
      message: inviteError ?? t("auth.join.errors.inviteNotFound"),
      success: false,
    };
  }

  const { data: student } = await admin
    .from("student_rosters")
    .select("id, school_id, first_name, last_name, status, profile_id")
    .eq("id", invite.student_roster_id)
    .eq("school_id", invite.school_id)
    .eq("status", "active")
    .maybeSingle<RosterStudent>();

  if (!student) {
    return {
      message: t("auth.join.errors.inactiveRoster"),
      success: false,
    };
  }

  if (student.profile_id) {
    return {
      message: t("auth.join.errors.studentAlreadyLinked"),
      success: false,
    };
  }

  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullNameForStudent(student),
      },
    });

  if (createUserError || !createdUser.user) {
    return {
      message:
        createUserError?.message ??
        t("auth.join.errors.accountCreateFailed"),
      success: false,
    };
  }

  const userId = createdUser.user.id;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      school_id: invite.school_id,
      role: "student",
      status: "active",
      username: null,
      full_name: fullNameForStudent(student),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await cleanupCreatedStudentAccount(userId);
    return {
      message: `Account was not finished: ${profileError.message}`,
      success: false,
    };
  }

  const { data: linkedStudent, error: linkError } = await admin
    .from("student_rosters")
    .update({ profile_id: userId })
    .eq("id", student.id)
    .eq("school_id", invite.school_id)
    .eq("status", "active")
    .is("profile_id", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (linkError || !linkedStudent) {
    await cleanupCreatedStudentAccount(userId);
    return {
      message:
        linkError?.message ??
        t("auth.join.errors.rosterClaimed"),
      success: false,
    };
  }

  const redeemedAt = new Date().toISOString();
  const { data: redeemedInvite, error: redeemError } = await admin
    .from("invite_codes")
    .update({
      status: "redeemed",
      use_count: 1,
      redeemed_at: redeemedAt,
      redeemed_by_profile_id: userId,
    })
    .eq("id", invite.id)
    .eq("school_id", invite.school_id)
    .eq("status", "active")
    .eq("use_count", 0)
    .is("redeemed_at", null)
    .gt("expires_at", redeemedAt)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (redeemError || !redeemedInvite) {
    await cleanupCreatedStudentAccount(userId);
    return {
      message:
        redeemError?.message ??
        t("auth.join.errors.inviteUsedDuringSignup"),
      success: false,
    };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      message: t("auth.join.success"),
      success: true,
    };
  }

  redirect("/dashboard");
}

function validateInvite(
  invite: InviteRecord | null,
  now: string,
  t: (key: string) => string,
) {
  if (!invite) {
    return t("auth.join.errors.inviteNotFound");
  }

  if (invite.status !== "active" || invite.use_count !== 0 || invite.redeemed_at) {
    return t("auth.join.errors.inviteInactive");
  }

  if (new Date(invite.expires_at).getTime() <= new Date(now).getTime()) {
    return t("auth.join.errors.inviteExpired");
  }

  if (!invite.student_roster_id) {
    return t("auth.join.errors.inviteNoRoster");
  }

  return null;
}

function normalizeInviteCode(code: string) {
  const compact = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!compact) {
    return "";
  }

  if (compact.length <= 4) {
    return compact;
  }

  if (compact.length <= 8) {
    return `${compact.slice(0, 4)}-${compact.slice(4)}`;
  }

  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8)}`;
}

function hashInviteCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function fullNameForStudent(student: RosterStudent) {
  return `${student.first_name} ${student.last_name}`.trim();
}

async function cleanupCreatedStudentAccount(userId: string) {
  const admin = createAdminClient();

  await admin
    .from("student_rosters")
    .update({ profile_id: null })
    .eq("profile_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
}
