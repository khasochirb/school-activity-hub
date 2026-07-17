import "server-only";

import { logServerError } from "@/lib/errors/server-error";
import type { createAdminClient } from "@/lib/supabase/admin";

export type PlatformAuditLog = {
  action: string;
  actor_profile_id: string | null;
  created_at: string;
  id: string;
  metadata: Record<string, unknown>;
  target_id: string | null;
  target_school_id: string | null;
  target_type: string;
};

export type PlatformAuditLogQueryState = "error" | "ready" | "unavailable";

export async function loadPlatformAuditLogs({
  admin,
  context,
  limit,
}: {
  admin: ReturnType<typeof createAdminClient>;
  context: string;
  limit: number;
}) {
  const result = await admin
    .from("platform_audit_logs")
    .select(
      "id, actor_profile_id, action, target_type, target_id, target_school_id, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PlatformAuditLog[]>();

  if (result.error) {
    logServerError(`${context} failed`, result.error, {
      httpStatus: result.status,
      statusText: result.statusText,
      table: "public.platform_audit_logs",
    });

    return {
      logs: [] as PlatformAuditLog[],
      state: isAuditTableUnavailable(result.error.code)
        ? ("unavailable" as const)
        : ("error" as const),
    };
  }

  return {
    logs: result.data ?? [],
    state: "ready" as const,
  };
}

function isAuditTableUnavailable(code: string) {
  return code === "PGRST205" || code === "42P01";
}
