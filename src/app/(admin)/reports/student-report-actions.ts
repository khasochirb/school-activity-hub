"use server";

import { parseActivityCategory } from "@/lib/activity-categories";
import type { ReportAttendanceFilter } from "@/lib/reports/activity-report";
import {
  getStudentActivityDetailsData,
  requireAuthorizedReportSchool,
} from "./report-explorer-data";

export type StudentReportRequest = {
  attendance: string;
  category: string;
  endsAt: string;
  eventId: string;
  schoolId: string;
  startsAt: string;
  studentId: string;
};

export async function loadStudentActivityDetails(
  request: StudentReportRequest,
) {
  const schoolId = safeUuid(request.schoolId);
  const studentId = safeUuid(request.studentId);

  if (!schoolId || !studentId) {
    return { data: null, ok: false } as const;
  }

  const access = await requireAuthorizedReportSchool(schoolId);
  if (!access) {
    return { data: null, ok: false } as const;
  }

  const startsAt = safeIsoDate(request.startsAt);
  const endsAt = safeIsoDate(request.endsAt);
  if (!endsAt || (startsAt && startsAt > endsAt)) {
    return { data: null, ok: false } as const;
  }

  const data = await getStudentActivityDetailsData({
    filters: {
      attendance: parseAttendance(request.attendance),
      category: parseActivityCategory(request.category),
      dateRange: { endsAt, startsAt },
      eventId: safeUuid(request.eventId),
    },
    schoolId,
    schoolName: access.schoolName ?? "",
    studentId,
  });

  return data
    ? ({ data, ok: true } as const)
    : ({ data: null, ok: false } as const);
}

function parseAttendance(value: string): ReportAttendanceFilter {
  return value === "recorded" || value === "not_recorded" ? value : "all";
}

function safeIsoDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function safeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}
