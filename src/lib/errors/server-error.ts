import "server-only";

import { randomBytes } from "node:crypto";

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

export function createServerErrorReference(prefix: string) {
  const normalizedPrefix = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16);
  const suffix = randomBytes(4).toString("hex").toUpperCase();

  return `${normalizedPrefix || "ERR"}-${suffix}`;
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
