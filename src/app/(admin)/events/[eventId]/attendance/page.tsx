import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createQrCodeMatrix,
  createQrSvgPath,
  getQrSvgViewBox,
} from "@/lib/qr-code";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateAttendeePermissionStatus } from "./actions";
import { CopyCheckInLinkButton } from "./copy-check-in-link-button";

type StaffProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type EventRecord = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  risk_level: "low" | "medium" | "high";
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

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .maybeSingle<StaffProfile>();

  if (!profile || !isSchoolStaff(profile)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, location, starts_at, ends_at, risk_level, permission_required, permission_note, status")
    .eq("id", eventId)
    .eq("school_id", profile.school_id)
    .eq("status", "approved")
    .maybeSingle<EventRecord>();

  if (!event) {
    redirect("/events");
  }

  const { data: attendees } = await admin
    .from("event_attendees")
    .select(
      "id, student_roster_id, attendee_school_id, attendee_profile_id, permission_status, status, registered_at, checked_in_at",
    )
    .eq("event_id", event.id)
    .eq("school_id", profile.school_id)
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
    ? await getStudentRosters(admin, profile.school_id, rosterIds)
    : [];
  const attendeeProfiles = attendeeProfileIds.length
    ? await getProfilesById(admin, attendeeProfileIds)
    : [];
  const attendeeSchools = attendeeSchoolIds.length
    ? await getSchoolsById(admin, attendeeSchoolIds)
    : [];
  const checkins = (attendees ?? []).length
    ? await getSuccessfulCheckins(admin, profile.school_id, event.id)
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

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950">
              Attendance
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{event.title}</p>
            <p className="mt-1 text-sm text-zinc-600">
              {formatDateTime(event.starts_at)} - {formatTime(event.ends_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SafetyBadge riskLevel={event.risk_level} />
              {event.permission_required ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  Permission required
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
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
            href="/events"
          >
            Back to events
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Check-in link</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Students must be logged in and registered for this event.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr] lg:items-start">
          <div className="flex justify-center rounded-lg border border-zinc-200 bg-white p-4">
            <svg
              aria-label="QR code for the event check-in link"
              className="h-44 w-44 text-zinc-950"
              role="img"
              shapeRendering="crispEdges"
              viewBox={qrCodeViewBox}
            >
              <rect height="100%" width="100%" fill="white" />
              <path d={qrCodePath} fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-800">
              Full check-in URL
            </p>
            <div className="mt-2 break-all rounded-md bg-zinc-50 p-3 font-mono text-sm text-zinc-800">
              {checkInUrl}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <CopyCheckInLinkButton url={checkInUrl} />
              <Link
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                href={checkInUrl}
              >
                Open check-in link
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            Attendance list
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {attendees?.length ?? 0} registered student
            {(attendees?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
        {attendees?.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">School</th>
                    <th className="px-4 py-3 font-medium">Grade</th>
                    <th className="px-4 py-3 font-medium">Permission</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Checked in</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {attendees.map((attendee) => {
                    const student = attendee.student_roster_id
                      ? rosterById.get(attendee.student_roster_id)
                      : undefined;
                    const attendeeProfile = attendee.attendee_profile_id
                      ? profileById.get(attendee.attendee_profile_id)
                      : undefined;
                    const attendeeSchool = schoolById.get(attendee.attendee_school_id);
                    const checkin =
                      checkinByAttendeeId.get(attendee.id) ??
                      (attendee.student_roster_id
                        ? checkinByStudentId.get(attendee.student_roster_id)
                        : undefined);

                    return (
                      <tr key={attendee.id}>
                        <td className="px-4 py-3 font-medium text-zinc-950">
                          {attendeeName(student, attendeeProfile)}
                          {student?.student_number ? (
                            <span className="block text-xs font-normal text-zinc-500">
                              {student.student_number}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {attendeeSchool?.name ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {student?.grade_level || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <PermissionCell
                            attendee={attendee}
                            event={event}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={attendee.status} />
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {checkin
                            ? formatDateTime(checkin.checked_in_at)
                            : attendee.checked_in_at
                              ? formatDateTime(attendee.checked_in_at)
                              : "-"}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {checkin?.method ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-200 md:hidden">
              {attendees.map((attendee) => {
                const student = attendee.student_roster_id
                  ? rosterById.get(attendee.student_roster_id)
                  : undefined;
                const attendeeProfile = attendee.attendee_profile_id
                  ? profileById.get(attendee.attendee_profile_id)
                  : undefined;
                const attendeeSchool = schoolById.get(attendee.attendee_school_id);
                const checkin =
                  checkinByAttendeeId.get(attendee.id) ??
                  (attendee.student_roster_id
                    ? checkinByStudentId.get(attendee.student_roster_id)
                    : undefined);

                return (
                  <article className="p-4" key={attendee.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-zinc-950">
                          {attendeeName(student, attendeeProfile)}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600">
                          {attendeeSchool?.name ?? "School"}
                          {" - "}
                          Grade {student?.grade_level || "-"}
                          {student?.homeroom ? `, ${student.homeroom}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={attendee.status} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-zinc-500">Permission</dt>
                        <dd className="text-zinc-800">
                          <PermissionCell
                            attendee={attendee}
                            event={event}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Checked in</dt>
                        <dd className="text-zinc-800">
                          {checkin
                            ? formatDateTime(checkin.checked_in_at)
                            : attendee.checked_in_at
                              ? formatDateTime(attendee.checked_in_at)
                              : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Method</dt>
                        <dd className="text-zinc-800">
                          {checkin?.method ?? "-"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="p-6 text-sm text-zinc-600">
            No students are registered for this event yet.
          </p>
        )}
      </section>
    </div>
  );
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
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  eventId: string,
) {
  const { data: checkins } = await admin
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

function isSchoolStaff(profile: StaffProfile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

function StatusBadge({ status }: { status: string }) {
  const isAttended = status === "attended";

  return (
    <span
      className={
        isAttended
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {status}
    </span>
  );
}

function PermissionCell({
  attendee,
  event,
}: {
  attendee: EventAttendee;
  event: EventRecord;
}) {
  const needsWarning =
    event.permission_required && attendee.permission_status !== "received";

  if (!event.permission_required) {
    return <PermissionBadge status={attendee.permission_status} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <PermissionBadge status={attendee.permission_status} />
      {needsWarning ? (
        <p className="max-w-64 text-xs leading-5 text-amber-800">
          Permission has not been received for this registered student.
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
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="declined">Declined</option>
        </select>
        <button
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          type="submit"
        >
          Save
        </button>
      </form>
    </div>
  );
}

function PermissionBadge({ status }: { status: EventPermissionStatus }) {
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
      {permissionLabel(status)}
    </span>
  );
}

function permissionLabel(status: EventPermissionStatus) {
  if (status === "received") {
    return "Permission received";
  }

  if (status === "declined") {
    return "Permission declined";
  }

  if (status === "pending") {
    return "Permission pending";
  }

  return "Permission not required";
}

function SafetyBadge({
  riskLevel,
}: {
  riskLevel: EventRecord["risk_level"];
}) {
  const label =
    riskLevel === "high"
      ? "High risk"
      : riskLevel === "medium"
        ? "Medium risk"
        : "Low risk";

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
) {
  if (student) {
    return `${student.first_name} ${student.last_name}`;
  }

  return attendeeProfile?.full_name ?? "Registered student";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
