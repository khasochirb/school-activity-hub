import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { DetailsDisclosure } from "@/app/(admin)/_components/page-ui";
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
          helpText={t("checkIn.helpText")}
          message={t("checkIn.errors.activeStudentsOnly")}
          statusTitle={t("checkIn.failedTitle")}
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
          helpText={t("checkIn.helpText")}
          message={
            !student
              ? t("checkIn.errors.noRoster")
              : t("checkIn.errors.eventUnavailable")
          }
          statusTitle={t("checkIn.failedTitle")}
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
      <section className="section-card p-5 sm:p-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
          {t("checkIn.title")}
        </h1>
        <p className="mt-2 text-base font-semibold text-zinc-800">
          {event.title}
        </p>
        <dl className="mt-4 grid gap-3 rounded-lg bg-zinc-50 p-3 text-sm sm:grid-cols-2">
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
        </dl>

        {event.permission_required ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {t("events.permission.studentNotice")}
          </p>
        ) : null}

        <DetailsDisclosure label={t("common.viewDetails")}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
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

          {event.permission_note ? (
            <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">
                {t("checkIn.permissionNote")}
              </p>
              <p className="mt-1 leading-6">{event.permission_note}</p>
            </div>
          ) : null}
        </DetailsDisclosure>

        {canCheckIn ? (
          <CheckInForm
            eventId={event.id}
            labels={{
              checkIn: t("checkIn.actions.checkIn"),
              checkingIn: t("checkIn.actions.checkingIn"),
              failedTitle: t("checkIn.failedTitle"),
              helpText: t("checkIn.helpText"),
            }}
          />
        ) : null}

        {!attendee || attendee.status === "canceled" ? (
          <StatusMessage
            helpText={t("checkIn.helpText")}
            message={t("checkIn.errors.mustJoinFirst")}
            title={t("checkIn.failedTitle")}
          />
        ) : null}
        {alreadyCheckedIn ? (
          <StatusMessage
            helpText={t("checkIn.helpText")}
            message={t("checkIn.success.alreadyCheckedIn")}
            success
            title={t("checkIn.successTitle")}
          />
        ) : null}
        {attendee &&
        attendee.status !== "registered" &&
        attendee.status !== "attended" ? (
          <StatusMessage
            helpText={t("checkIn.helpText")}
            message={t("checkIn.errors.invalidRegistrationStatus")}
            title={t("checkIn.failedTitle")}
          />
        ) : null}

        <Link
          className="btn btn-secondary mt-6 min-h-11 w-full sm:w-auto"
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
    <main className="app-surface min-h-screen px-4 py-5 text-zinc-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-xl">{children}</div>
    </main>
  );
}

function UnavailableMessage({
  backLabel,
  helpText,
  message,
  statusTitle,
  title,
}: {
  backLabel: string;
  helpText: string;
  message: string;
  statusTitle: string;
  title: string;
}) {
  return (
    <section className="section-card p-5 sm:p-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
        {title}
      </h1>
      <StatusMessage helpText={helpText} message={message} title={statusTitle} />
      <Link
        className="btn btn-secondary mt-6 min-h-11 w-full sm:w-auto"
        href="/dashboard"
      >
        {backLabel}
      </Link>
    </section>
  );
}

function StatusMessage({
  helpText,
  message,
  success = false,
  title,
}: {
  helpText?: string;
  message: string;
  success?: boolean;
  title?: string;
}) {
  return (
    <div
      className={
        success
          ? "notice-box notice-success mt-4"
          : "notice-box notice-danger mt-4"
      }
      role="status"
    >
      {title ? <p className="text-lg font-bold">{title}</p> : null}
      <p className={title ? "mt-1 leading-6" : "leading-6"}>{message}</p>
      {helpText ? <p className="mt-2 text-sm leading-6">{helpText}</p> : null}
    </div>
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
