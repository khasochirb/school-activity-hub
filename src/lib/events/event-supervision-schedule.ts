export const EVENT_SUPERVISION_MAX_LENGTH = 1000;
export const EVENT_SCHEDULE_NOTICE_MAX_LENGTH = 1000;

export type EventSupervisionScheduleInfo = {
  scheduleChangeNotice: string | null;
  supervisionInformation: string | null;
};

export type EventSupervisionScheduleError =
  | "schedule_notice_too_long"
  | "supervision_too_long";

export function parseEventSupervisionSchedule(formData: FormData):
  | { data: EventSupervisionScheduleInfo; error: null }
  | { data: null; error: EventSupervisionScheduleError } {
  const supervisionInformation = normalizeOptionalText(
    formData.get("supervision_information"),
  );
  const scheduleChangeNotice = normalizeOptionalText(
    formData.get("schedule_change_notice"),
  );

  if (
    supervisionInformation &&
    supervisionInformation.length > EVENT_SUPERVISION_MAX_LENGTH
  ) {
    return { data: null, error: "supervision_too_long" };
  }

  if (
    scheduleChangeNotice &&
    scheduleChangeNotice.length > EVENT_SCHEDULE_NOTICE_MAX_LENGTH
  ) {
    return { data: null, error: "schedule_notice_too_long" };
  }

  return {
    data: { scheduleChangeNotice, supervisionInformation },
    error: null,
  };
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
