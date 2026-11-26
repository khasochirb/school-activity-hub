import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type ParentJoinState = { message: string; success: boolean };

type InviteRow = {
  audience: string;
  expires_at: string;
  id: string;
  redeemed_at: string | null;
  school_id: string;
  status: string;
  student_roster_id: string | null;
  use_count: number;
};

export function normalizeInviteCode(code: string) {
  const compact = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!compact) return "";
  if (compact.length <= 4) return compact;
  if (compact.length <= 8) return `${compact.slice(0, 4)}-${compact.slice(4)}`;

  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8)}`;
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

// Looks up a parent code and checks it can still be used. Returns an error
// key under family.errors.
export async function findParentInvite(rawCode: string) {
  const code = normalizeInviteCode(rawCode);

  if (!code) return { error: "codeRequired" as const };

  const { data: invite } = await createAdminClient()
    .from("invite_codes")
    .select("id, school_id, student_roster_id, status, use_count, expires_at, redeemed_at, audience")
    .eq("code_hash", hashInviteCode(code))
    .maybeSingle<InviteRow>();

  if (!invite) return { error: "codeNotFound" as const };
  if (invite.audience !== "parent") return { error: "studentCode" as const };
  if (invite.status !== "active" || invite.use_count !== 0 || invite.redeemed_at) {
    return { error: "codeUsed" as const };
  }
  if (new Date(invite.expires_at).getTime() <= Date.now()) return { error: "codeExpired" as const };
  if (!invite.student_roster_id) return { error: "codeNotFound" as const };

  return { invite };
}

// Redeems a parent code for an existing parent account: marks the code used
// (only if nobody beat us to it) and links the parent to the child.
export async function linkParentToChild({
  code,
  parentProfileId,
  parentSchoolId,
}: {
  code: string;
  parentProfileId: string;
  parentSchoolId: string;
}): Promise<{ error?: string }> {
  const found = await findParentInvite(code);

  if (found.error) return { error: found.error };

  const invite = found.invite!;

  // One parent account belongs to one school.
  if (invite.school_id !== parentSchoolId) return { error: "otherSchool" };

  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("student_rosters")
    .select("id")
    .eq("id", invite.student_roster_id!)
    .eq("school_id", invite.school_id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!roster) return { error: "inactiveStudent" };

  const { data: existing } = await admin
    .from("parent_links")
    .select("id")
    .eq("parent_profile_id", parentProfileId)
    .eq("student_roster_id", roster.id)
    .maybeSingle<{ id: string }>();

  if (existing) return { error: "alreadyLinked" };

  const now = new Date().toISOString();
  const { data: redeemed } = await admin
    .from("invite_codes")
    .update({ redeemed_at: now, redeemed_by_profile_id: parentProfileId, status: "redeemed", use_count: 1 })
    .eq("id", invite.id)
    .eq("status", "active")
    .eq("use_count", 0)
    .is("redeemed_at", null)
    .gt("expires_at", now)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!redeemed) return { error: "codeUsed" };

  const { error } = await admin.from("parent_links").insert({
    invite_code_id: invite.id,
    parent_profile_id: parentProfileId,
    school_id: invite.school_id,
    student_roster_id: roster.id,
  });

  if (error) return { error: "linkFailed" };

  return {};
}
