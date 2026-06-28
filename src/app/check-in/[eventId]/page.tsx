import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CheckInForm } from "./check-in-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
  status: string;
};

type StudentRoster = {
  id: string;
};

type EventRecord = {
  id: string;
  school_id: string;
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
  status: string;
  checked_in_at: string | null;
};

type AttendanceCheckin = {
  id: string;
};

type Translate = (key: string) => string;

export default async function StudentCheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
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
    .select("id, school_id, role, status")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || profile.role !== "student" || profile.status !== "active") {
    return (
      <CheckInShell>
        <UnavailableMessage
          backLabel={t("common.backToDashboard")}
          message={t("checkIn.errors.activeStudentsOnly")}
          title={t("checkIn.title")}
        />
      </CheckInShell>
    );
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("student_rosters")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .maybeSingle<StudentRoster>();

  const { data: event } = await admin
    .from("events")
    .select("id, school_id, title, location, starts_at, ends_at, risk_level, permission_required, permission_note, status")
    .eq("id", eventId)
    .eq("status", "approved")
    .maybeSingle<EventRecord>();

  const canAccessEvent =
    event &&
    (event.school_id === profile.school_id ||
      ((await isEventSharedWithSchool(admin, event.id, profile.school_id)) &&
        (await schoolsHaveApprovedConnection(
          admin,
          event.school_id,
          profile.school_id,
        ))));

  if (!student || !event || !canAccessEvent) {
    return (
      <CheckInShell>
        <UnavailableMessage
          backLabel={t("common.backToDashboard")}
          message={
            !student
              ? t("checkIn.errors.noRoster")
              : t("checkIn.errors.eventUnavailable")
          }
          title={t("checkIn.title")}
        />
      </CheckInShell>
    );
  }

  const { data: attendee } = await admin
    .from("event_attendees")
    .select("id, status, checked_in_at")
    .eq("event_id", event.id)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .maybeSingle<EventAttendee>();

  const { data: existingCheckin } = await admin
    .from("attendance_checkins")
    .select("id")
    .eq("event_id", event.id)
    .or(`attendee_profile_id.eq.${profile.id},student_roster_id.eq.${student.id}`)
    .eq("result", "success")
    .maybeSingle<AttendanceCheckin>();

  const alreadyCheckedIn =
    Boolean(existingCheckin) ||
    attendee?.status === "attended" ||
    Boolean(attendee?.checked_in_at);
  const canCheckIn = attendee?.status === "registered" && !alreadyCheckedIn;

  return (
    <CheckInShell>
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          {t("checkIn.title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{event.title}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">{t("checkIn.details.time")}</dt>
            <dd className="text-zinc-800">
              {formatDateTime(event.starts_at, locale)} -{" "}
              {formatTime(event.ends_at, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t("checkIn.details.location")}</dt>
            <dd className="text-zinc-800">{event.location || "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t("checkIn.details.safety")}</dt>
            <dd className="text-zinc-800">
              {riskLabel(event.risk_level, t)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">
              {t("checkIn.details.permission")}
            </dt>
            <dd className="text-zinc-800">
              {event.permission_required
                ? t("events.permission.mayBeRequired")
                : t("events.permission.notRequired")}
            </dd>
          </div>
        </dl>

        {event.permission_required ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {t("events.permission.studentNotice")}
          </p>
        ) : null}

        {event.permission_note ? (
          <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">
              {t("checkIn.permissionNote")}
            </p>
            <p className="mt-1 leading-6">{event.permission_note}</p>
          </div>
        ) : null}

        {canCheckIn ? (
          <CheckInForm
            eventId={event.id}
            labels={{
              checkIn: t("checkIn.actions.checkIn"),
              checkingIn: t("checkIn.actions.checkingIn"),
            }}
          />
        ) : null}

        {!attendee || attendee.status === "canceled" ? (
          <StatusMessage message={t("checkIn.errors.mustJoinFirst")} />
        ) : null}
        {alreadyCheckedIn ? (
          <StatusMessage message={t("checkIn.success.alreadyCheckedIn")} success />
        ) : null}
        {attendee &&
        attendee.status !== "registered" &&
        attendee.status !== "attended" ? (
          <StatusMessage
            message={t("checkIn.errors.invalidRegistrationStatus")}
          />
        ) : null}

        <Link
          className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          href="/events"
        >
          {t("common.backToEvents")}
        </Link>
      </section>
    </CheckInShell>
  );
}

function CheckInShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-xl">{children}</div>
    </main>
  );
}

function UnavailableMessage({
  backLabel,
  message,
  title,
}: {
  backLabel: string;
  message: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-950">{title}</h1>
      <StatusMessage message={message} />
      <Link
        className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        href="/dashboard"
      >
        {backLabel}
      </Link>
    </section>
  );
}

function StatusMessage({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return (
    <p
      className={
        success
          ? "mt-4 text-sm text-emerald-700"
          : "mt-4 text-sm text-zinc-600"
      }
      role="status"
    >
      {message}
    </p>
  );
}

async function schoolsHaveApprovedConnection(
  admin: ReturnType<typeof createAdminClient>,
  firstSchoolId: string,
  secondSchoolId: string,
) {
  const { data: connection } = await admin
    .from("school_connections")
    .select("id")
    .eq("status", "approved")
    .or(
      [
        `and(requester_school_id.eq.${firstSchoolId},receiver_school_id.eq.${secondSchoolId})`,
        `and(requester_school_id.eq.${secondSchoolId},receiver_school_id.eq.${firstSchoolId})`,
      ].join(","),
    )
    .maybeSingle<{ id: string }>();

  return Boolean(connection);
}

async function isEventSharedWithSchool(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  schoolId: string,
) {
  const { data: share } = await admin
    .from("event_school_shares")
    .select("id")
    .eq("event_id", eventId)
    .eq("school_id", schoolId)
    .maybeSingle<{ id: string }>();

  return Boolean(share);
}

function riskLabel(riskLevel: EventRecord["risk_level"], t: Translate) {
  if (riskLevel === "high") {
    return t("events.risk.high");
  }

  return riskLevel === "medium"
    ? t("events.risk.medium")
    : t("events.risk.low");
}
