import "server-only";

import { logServerError } from "@/lib/errors/server-error";
import { createAdminClient } from "@/lib/supabase/admin";

type AuditMetadataValue = boolean | null | number | string | undefined;

type PlatformAuditLogInput = {
  action: string;
  actor: { id: string };
  metadata?: Record<string, AuditMetadataValue>;
  targetId?: string | null;
  targetSchoolId?: string | null;
  targetType: string;
};

const SENSITIVE_METADATA_KEY_PATTERN =
  /password|secret|service|token|key|invite|code/i;

export async function createPlatformAuditLog({
  action,
  actor,
  metadata = {},
  targetId = null,
  targetSchoolId = null,
  targetType,
}: PlatformAuditLogInput) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("platform_audit_logs").insert({
      action,
      actor_profile_id: actor.id,
      metadata: sanitizeMetadata(metadata),
      target_id: targetId,
      target_school_id: targetSchoolId,
      target_type: targetType,
    });

    if (error) {
      logAuditFailure(action, targetType, error);
    }
  } catch (error) {
    logAuditFailure(action, targetType, error);
  }
}

function sanitizeMetadata(metadata: Record<string, AuditMetadataValue>) {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      if (
        SENSITIVE_METADATA_KEY_PATTERN.test(key) ||
        value === undefined ||
        (value !== null && typeof value === "object")
      ) {
        return [];
      }

      return [[key, value]];
    }),
  );
}

function logAuditFailure(action: string, targetType: string, error: unknown) {
  logServerError("Platform audit log failed", error, {
    action,
    targetType,
  });
}
