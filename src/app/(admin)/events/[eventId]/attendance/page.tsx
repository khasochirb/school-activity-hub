import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentEventActor, isEventStaffActor } from "@/lib/auth/event-access";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  createQrCodeMatrix,
  createQrSvgPath,
  getQrSvgViewBox,
} from "@/lib/qr-code";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import {
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateAttendeePermissionStatus } from "./actions";
import { CopyCheckInLinkButton } from "./copy-check-in-link-button";

type EventRecord = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  risk_level: "low" | "medium" | "high";
  school_id: string;
  permission_required: boolean;
  permission_note: string | null;
  status: string;
};

type EventAttendee = {
  id: string;
  student_roster_id: string | null;
  attendee_school_id: string;
  attendee_profile_id: string | null;
  permission_status: EventPermissionStatus;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
};

type EventPermissionStatus =
  | "declined"
  | "not_required"
  | "pending"
  | "received";

type StudentRoster = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom: string | null;
  student_number: string | null;
};

type AttendanceCheckin = {
  id: string;
  event_attendee_id: string | null;
  student_roster_id: string | null;
  attendee_profile_id: string | null;
  method: string;
  result: string;
  checked_in_at: string;
};

type AttendeeProfile = {
  id: string;
  full_name: string;
};

type SchoolSummary = {
  id: string;
  name: string;
};

type AttendanceFilter = "all" | "checked-in" | "not-checked-in";

type AttendancePageSearchParams = {
  filter?: string | string[];
};

type AttendanceListRow = {
  attendee: EventAttendee;
  attendeeSchool: SchoolSummary | undefined;
  checkedInAt: string | null;
  checkin: AttendanceCheckin | undefined;
  displayName: string;
  isCheckedIn: boolean;
  student: StudentRoster | undefined;
};

type Translate = (key: string) => string;

const attendanceFilters: AttendanceFilter[] = [
  "all",
  "checked-in",
  "not-checked-in",
];

export default async function EventAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<AttendancePageSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const { eventId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeFilter = parseAttendanceFilter(resolvedSearchParams.filter);
  const actor = await getCurrentEventActor();

  if (!actor) {
    redirect("/login");
  }
  if (!isEventStaffActor(actor)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  let eventQuery = supabase
    .from("events")
    .select("id, school_id, title, location, starts_at, ends_at, risk_level, permission_required, permission_note, status")
    .eq("id", eventId)
    .eq("status", "approved");

  if (!actor.isPlatformAdmin && actor.profile) {
    eventQuery = eventQuery.eq("school_id", actor.profile.school_id);
  }

  const { data: event } = await eventQuery.maybeSingle<EventRecord>();

  if (!event) {
    redirect("/events");
  }

  const { data: attendees } = await supabase
    .from("event_attendees")
    .select(
      "id, student_roster_id, attendee_school_id, attendee_profile_id, permission_status, status, registered_at, checked_in_at",
    )
    .eq("event_id", event.id)
    .eq("school_id", event.school_id)
    .order("registered_at", { ascending: true })
    .returns<EventAttendee[]>();

  const rosterIds = (attendees ?? [])
    .map((attendee) => attendee.student_roster_id)
    .filter((id): id is string => Boolean(id));
  const attendeeProfileIds = (attendees ?? [])
    .map((attendee) => attendee.attendee_profile_id)
    .filter((id): id is string => Boolean(id));
  const attendeeSchoolIds = Array.from(
    new Set((attendees ?? []).map((attendee) => attendee.attendee_school_id)),
  );
  const rosters = rosterIds.length
    ? await getStudentRosters(admin, event.school_id, rosterIds)
    : [];
  const attendeeProfiles = attendeeProfileIds.length
    ? await getProfilesById(admin, attendeeProfileIds)
    : [];
  const attendeeSchools = attendeeSchoolIds.length
    ? await getSchoolsById(admin, attendeeSchoolIds)
    : [];
  const checkins = (attendees ?? []).length
    ? await getSuccessfulCheckins(supabase, event.school_id, event.id)
    : [];
  const rosterById = new Map(rosters.map((student) => [student.id, student]));
  const profileById = new Map(
    attendeeProfiles.map((attendeeProfile) => [
      attendeeProfile.id,
      attendeeProfile,
    ]),
  );
  const schoolById = new Map(attendeeSchools.map((school) => [school.id, school]));
  const checkinByAttendeeId = new Map<string, AttendanceCheckin>();
  const checkinByStudentId = new Map<string, AttendanceCheckin>();

  checkins.forEach((checkin) => {
    if (checkin.event_attendee_id && !checkinByAttendeeId.has(checkin.event_attendee_id)) {
      checkinByAttendeeId.set(checkin.event_attendee_id, checkin);
    }

    if (checkin.student_roster_id && !checkinByStudentId.has(checkin.student_roster_id)) {
      checkinByStudentId.set(checkin.student_roster_id, checkin);
    }
  });

  const checkInPath = `/check-in/${event.id}`;
  const checkInUrl = await getAbsoluteCheckInUrl(checkInPath);
  const qrCodeMatrix = createQrCodeMatrix(checkInUrl);
  const qrCodePath = createQrSvgPath(qrCodeMatrix);
  const qrCodeViewBox = getQrSvgViewBox(qrCodeMatrix);
  const attendanceRows = (attendees ?? []).map((attendee) =>
    buildAttendanceRow({
      attendee,
      checkinByAttendeeId,
      checkinByStudentId,
      fallbackName: t("attendance.fallback.registeredStudent"),
      profileById,
      rosterById,
      schoolById,
    }),
  );
  const registeredCount = attendanceRows.length;
  const checkedInCount = attendanceRows.filter((row) => row.isCheckedIn).length;
  const notCheckedInCount = registeredCount - checkedInCount;
  const attendanceRate = registeredCount
    ? Math.round((checkedInCount / registeredCount) * 100)
    : 0;
  const filteredRows = attendanceRows.filter((row) => {
    if (activeFilter === "checked-in") {
      return row.isCheckedIn;
    }

    if (activeFilter === "not-checked-in") {
      return !row.isCheckedIn;
    }

    return true;
  });

  return (
    <div className="page-stack">
      <section className="section-card section-card-padded">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950">
              {t("attendance.title")}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{event.title}</p>
            <p className="mt-1 text-sm text-zinc-600">
              {formatDateTime(event.starts_at, locale)} -{" "}
              {formatTime(event.ends_at, locale)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SafetyBadge riskLevel={event.risk_level} t={t} />
              {event.permission_required ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {t("events.permission.required")}
                </span>
              ) : null}
            </div>
            {event.permission_note ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                {event.permission_note}
              </p>
            ) : null}
          </div>
          <Link
            className="btn btn-secondary h-10"
            href="/events"
            prefetch={false}
          >
            {t("common.backToEvents")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(20rem,1fr)]">
        <div className="section-card section-card-padded">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex justify-center sm:block">
              <div
                className="rounded-xl border p-4 shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: "#d1d5db" }}
              >
                <svg
                  aria-label={t("attendance.qr.ariaLabel")}
                  className="h-52 w-52 sm:h-56 sm:w-56"
                  role="img"
                  shapeRendering="crispEdges"
                  style={{ backgroundColor: "#ffffff" }}
                  viewBox={qrCodeViewBox}
                >
                  <rect height="100%" width="100%" fill="#ffffff" />
                  <path d={qrCodePath} fill="#111827" />
                </svg>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("attendance.qr.title")}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-950">
                {t("attendance.checkInLink.title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {t("attendance.qr.instruction")}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {t("attendance.checkInLink.description")}
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium text-zinc-800">
                  {t("attendance.checkInLink.fullUrl")}
                </p>
                <div
                  className="mt-2 truncate rounded-md bg-zinc-50 p-3 font-mono text-sm text-zinc-800"
                  title={checkInUrl}
                >
                  {checkInUrl}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <CopyCheckInLinkButton
                    labels={{
                      copied: t("attendance.actions.copied"),
                      copy: t("attendance.actions.copyLink"),
                    }}
                    url={checkInUrl}
                  />
                  <Link
                    className="btn btn-primary min-h-11 w-full sm:w-auto"
                    href={checkInUrl}
                    prefetch={false}
                  >
                    {t("attendance.actions.openLink")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="section-card section-card-padded">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("attendance.summary.title")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">
              {t("attendance.title")}
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AttendanceSummaryCard
              label={t("attendance.summary.registeredStudents")}
              value={registeredCount}
            />
            <AttendanceSummaryCard
              label={t("attendance.summary.checkedIn")}
              value={checkedInCount}
            />
            <AttendanceSummaryCard
              label={t("attendance.summary.notCheckedIn")}
              value={notCheckedInCount}
            />
            <AttendanceSummaryCard
              label={t("attendance.summary.attendanceRate")}
              value={`${attendanceRate}%`}
            />
          </div>
          {registeredCount > 0 && checkedInCount === 0 ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              {t("attendance.empty.noCheckIns")}
            </p>
          ) : null}
        </section>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                {t("attendance.list.title")}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {tf("attendance.list.registeredCount", {
                  count: registeredCount,
                })}
              </p>
            </div>
            {registeredCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attendanceFilters.map((filter) => (
                  <Link
                    className={
                      activeFilter === filter
                        ? "inline-flex min-h-9 items-center rounded-full border border-[var(--primary)] bg-[var(--primary-soft)] px-3 text-sm font-medium text-zinc-950"
                        : "inline-flex min-h-9 items-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                    }
                    href={attendanceFilterHref(event.id, filter)}
                    key={filter}
                    prefetch={false}
                  >
                    {attendanceFilterLabel(filter, t)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {registeredCount ? (
          <>
            {filteredRows.length ? (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.student")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.school")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.grade")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.permission")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.registrationStatus")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.checkInStatus")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.checkInTime")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("attendance.table.method")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredRows.map((row) => {
                        return (
                          <tr key={row.attendee.id}>
                            <td className="px-4 py-3 font-medium text-zinc-950">
                              {row.displayName}
                              {row.student?.student_number ? (
                                <span className="block text-xs font-normal text-zinc-500">
                                  {row.student.student_number}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.attendeeSchool?.name ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.student?.grade_level || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <PermissionCell
                                attendee={row.attendee}
                                event={event}
                                t={t}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                status={row.attendee.status}
                                t={t}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <CheckInBadge
                                isCheckedIn={row.isCheckedIn}
                                t={t}
                              />
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.checkedInAt
                                ? formatDateTime(row.checkedInAt, locale)
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.checkin
                                ? checkInMethodLabel(row.checkin.method, t)
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-zinc-200 lg:hidden">
                  {filteredRows.map((row) => {
                    return (
                      <article className="p-4" key={row.attendee.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-zinc-950">
                              {row.displayName}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-600">
                              {row.attendeeSchool?.name ??
                                t("attendance.table.school")}
                              {" - "}
                              {t("attendance.table.grade")}{" "}
                              {row.student?.grade_level || "-"}
                              {row.student?.homeroom
                                ? `, ${row.student.homeroom}`
                                : ""}
                            </p>
                          </div>
                          <StatusBadge status={row.attendee.status} t={t} />
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-zinc-500">
                              {t("attendance.table.permission")}
                            </dt>
                            <dd className="text-zinc-800">
                              <PermissionCell
                                attendee={row.attendee}
                                event={event}
                                t={t}
                              />
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">
                              {t("attendance.table.checkInStatus")}
                            </dt>
                            <dd className="text-zinc-800">
                              <CheckInBadge
                                isCheckedIn={row.isCheckedIn}
                                t={t}
                              />
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">
                              {t("attendance.table.checkInTime")}
                            </dt>
                            <dd className="text-zinc-800">
                              {row.checkedInAt
                                ? formatDateTime(row.checkedInAt, locale)
                                : "-"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">
                              {t("attendance.table.method")}
                            </dt>
                            <dd className="text-zinc-800">
                              {row.checkin
                                ? checkInMethodLabel(row.checkin.method, t)
                                : "-"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-4">
                <p className="text-sm font-medium text-zinc-950">
                  {t("filters.noResults")}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {t("filters.noResultsDescription")}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-4">
            <p className="text-sm font-medium text-zinc-950">
              {t("attendance.empty.noStudentsRegistered")}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {t("attendance.empty.description")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function AttendanceSummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function CheckInBadge({
  isCheckedIn,
  t,
}: {
  isCheckedIn: boolean;
  t: Translate;
}) {
  return (
    <span
      className={
        isCheckedIn
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {isCheckedIn
        ? t("attendance.summary.checkedIn")
        : t("attendance.summary.notCheckedIn")}
    </span>
  );
}

function buildAttendanceRow({
  attendee,
  checkinByAttendeeId,
  checkinByStudentId,
  fallbackName,
  profileById,
  rosterById,
  schoolById,
}: {
  attendee: EventAttendee;
  checkinByAttendeeId: Map<string, AttendanceCheckin>;
  checkinByStudentId: Map<string, AttendanceCheckin>;
  fallbackName: string;
  profileById: Map<string, AttendeeProfile>;
  rosterById: Map<string, StudentRoster>;
  schoolById: Map<string, SchoolSummary>;
}): AttendanceListRow {
  const student = attendee.student_roster_id
    ? rosterById.get(attendee.student_roster_id)
    : undefined;
  const attendeeProfile = attendee.attendee_profile_id
    ? profileById.get(attendee.attendee_profile_id)
    : undefined;
  const checkin =
    checkinByAttendeeId.get(attendee.id) ??
    (attendee.student_roster_id
      ? checkinByStudentId.get(attendee.student_roster_id)
      : undefined);
  const checkedInAt = checkin?.checked_in_at ?? attendee.checked_in_at;

  return {
    attendee,
    attendeeSchool: schoolById.get(attendee.attendee_school_id),
    checkedInAt,
    checkin,
    displayName: attendeeName(student, attendeeProfile, fallbackName),
    isCheckedIn: Boolean(checkedInAt),
    student,
  };
}

function parseAttendanceFilter(
  filter: AttendancePageSearchParams["filter"],
): AttendanceFilter {
  const value = Array.isArray(filter) ? filter[0] : filter;

  if (value === "checked-in" || value === "not-checked-in") {
    return value;
  }

  return "all";
}

function attendanceFilterHref(eventId: string, filter: AttendanceFilter) {
  if (filter === "all") {
    return `/events/${eventId}/attendance`;
  }

  return `/events/${eventId}/attendance?filter=${filter}`;
}

function attendanceFilterLabel(filter: AttendanceFilter, t: Translate) {
  if (filter === "checked-in") {
    return t("attendance.filters.checkedIn");
  }

  if (filter === "not-checked-in") {
    return t("attendance.filters.notCheckedIn");
  }

  return t("attendance.filters.allStudents");
}

async function getStudentRosters(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  rosterIds: string[],
) {
  const { data: rosters } = await admin
    .from("student_rosters")
    .select("id, first_name, last_name, grade_level, homeroom, student_number")
    .eq("school_id", schoolId)
    .in("id", rosterIds)
    .returns<StudentRoster[]>();

  return rosters ?? [];
}

async function getSuccessfulCheckins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  eventId: string,
) {
  const { data: checkins } = await supabase
    .from("attendance_checkins")
    .select(
      "id, event_attendee_id, student_roster_id, attendee_profile_id, method, result, checked_in_at",
    )
    .eq("school_id", schoolId)
    .eq("event_id", eventId)
    .eq("result", "success")
    .order("checked_in_at", { ascending: false })
    .returns<AttendanceCheckin[]>();

  return checkins ?? [];
}

async function getProfilesById(
  admin: ReturnType<typeof createAdminClient>,
  profileIds: string[],
) {
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds)
    .returns<AttendeeProfile[]>();

  return profiles ?? [];
}

async function getSchoolsById(
  admin: ReturnType<typeof createAdminClient>,
  schoolIds: string[],
) {
  const { data: schools } = await admin
    .from("schools")
    .select("id, name")
    .in("id", schoolIds)
    .returns<SchoolSummary[]>();

  return schools ?? [];
}

async function getAbsoluteCheckInUrl(path: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const baseUrl = configuredSiteUrl
    ? normalizeBaseUrl(configuredSiteUrl)
    : await getRequestOrigin();

  return baseUrl ? `${baseUrl}${path}` : path;
}

async function getRequestOrigin() {
  const headersList = await headers();
  const forwardedHost = getFirstHeaderValue(headersList.get("x-forwarded-host"));
  const host = forwardedHost ?? getFirstHeaderValue(headersList.get("host"));

  if (!host) {
    return "";
  }

  const forwardedProto = getFirstHeaderValue(headersList.get("x-forwarded-proto"));
  const protocol = forwardedProto ?? getDefaultProtocol(host);

  return `${protocol}://${host}`;
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function getDefaultProtocol(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}


function StatusBadge({ status, t }: { status: string; t: Translate }) {
  const isAttended = status === "attended";

  return (
    <span
      className={
        isAttended
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {attendanceStatusLabel(status, t)}
    </span>
  );
}

function attendanceStatusLabel(status: string, t: Translate) {
  if (status === "attended") {
    return t("attendance.status.attended");
  }

  if (status === "registered") {
    return t("attendance.status.registered");
  }

  return status;
}

function checkInMethodLabel(method: string, t: Translate) {
  if (method === "admin" || method === "manual" || method === "qr") {
    return t(`attendance.methods.${method}`);
  }

  return method;
}

function PermissionCell({
  attendee,
  event,
  t,
}: {
  attendee: EventAttendee;
  event: EventRecord;
  t: Translate;
}) {
  const needsWarning =
    event.permission_required && attendee.permission_status !== "received";

  if (!event.permission_required) {
    return <PermissionBadge status={attendee.permission_status} t={t} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <PermissionBadge status={attendee.permission_status} t={t} />
      {needsWarning ? (
        <p className="max-w-64 text-xs leading-5 text-amber-800">
          {t("attendance.permission.warning")}
        </p>
      ) : null}
      <form action={updateAttendeePermissionStatus} className="flex flex-wrap gap-2">
        <input name="attendee_id" type="hidden" value={attendee.id} />
        <input name="event_id" type="hidden" value={event.id} />
        <select
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={attendee.permission_status}
          name="permission_status"
        >
          <option value="pending">{t("attendance.permission.status.pending")}</option>
          <option value="received">
            {t("attendance.permission.status.received")}
          </option>
          <option value="declined">
            {t("attendance.permission.status.declined")}
          </option>
        </select>
        <PendingSubmitButton
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          pendingLabel={t("common.saving")}
          toastMessage={t("common.saving")}
        >
          {t("attendance.actions.savePermission")}
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function PermissionBadge({
  status,
  t,
}: {
  status: EventPermissionStatus;
  t: Translate;
}) {
  return (
    <span
      className={
        status === "received"
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : status === "declined"
            ? "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
            : status === "pending"
              ? "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
              : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {permissionLabel(status, t)}
    </span>
  );
}

function permissionLabel(status: EventPermissionStatus, t: Translate) {
  if (status === "received") {
    return t("attendance.permission.badge.received");
  }

  if (status === "declined") {
    return t("attendance.permission.badge.declined");
  }

  if (status === "pending") {
    return t("attendance.permission.badge.pending");
  }

  return t("attendance.permission.badge.notRequired");
}

function SafetyBadge({
  riskLevel,
  t,
}: {
  riskLevel: EventRecord["risk_level"];
  t: Translate;
}) {
  const label =
    riskLevel === "high"
      ? t("events.risk.high")
      : riskLevel === "medium"
        ? t("events.risk.medium")
        : t("events.risk.low");

  return (
    <span
      className={
        riskLevel === "high"
          ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          : riskLevel === "medium"
            ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
            : "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
      }
    >
      {label}
    </span>
  );
}

function attendeeName(
  student: StudentRoster | undefined,
  attendeeProfile: AttendeeProfile | undefined,
  fallbackName: string,
) {
  if (student) {
    return `${student.first_name} ${student.last_name}`;
  }

  return attendeeProfile?.full_name ?? fallbackName;
}
