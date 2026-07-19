export type EventServiceErrorCategory =
  | "conflict_error"
  | "schema_update_required"
  | "service_unavailable";

const SCHEMA_ERROR_CODES = new Set([
  "42P01",
  "42703",
  "PGRST200",
  "PGRST201",
  "PGRST202",
  "PGRST204",
]);

export function classifyEventServiceError(
  code: string | null | undefined,
): EventServiceErrorCategory {
  if (code === "23505") {
    return "conflict_error";
  }

  return code && SCHEMA_ERROR_CODES.has(code)
    ? "schema_update_required"
    : "service_unavailable";
}

export function isEventSchemaError(code: string | null | undefined) {
  return Boolean(code && SCHEMA_ERROR_CODES.has(code));
}
