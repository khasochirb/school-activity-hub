export const EVENT_CANCELLATION_NOTICE_MAX_LENGTH = 1000;

export type EventCancellationNoticeError = "cancellation_notice_too_long";

export function parseEventCancellationNotice(formData: FormData):
  | { data: string | null; error: null }
  | { data: null; error: EventCancellationNoticeError } {
  const cancellationNotice = normalizeOptionalText(
    formData.get("cancellation_notice"),
  );

  if (
    cancellationNotice &&
    cancellationNotice.length > EVENT_CANCELLATION_NOTICE_MAX_LENGTH
  ) {
    return { data: null, error: "cancellation_notice_too_long" };
  }

  return { data: cancellationNotice, error: null };
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
