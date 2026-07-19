import "server-only";

type SafeLogValue = boolean | null | number | string | undefined;

export function logServerError(
  context: string,
  error: unknown,
  metadata: Record<string, SafeLogValue> = {},
) {
  const errorRecord = isRecord(error) ? error : {};
  const safeDetails = {
    code: safeValue(errorRecord.code),
    name:
      error instanceof Error
        ? error.name
        : typeof errorRecord.name === "string"
          ? errorRecord.name
          : undefined,
    status: safeValue(errorRecord.status),
  };

  console.error(context, {
    ...sanitizeMetadata(metadata),
    ...safeDetails,
  });
}

function sanitizeMetadata(metadata: Record<string, SafeLogValue>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([, value]) =>
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string",
    ),
  );
}

function safeValue(value: unknown) {
  return typeof value === "number" || typeof value === "string"
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
