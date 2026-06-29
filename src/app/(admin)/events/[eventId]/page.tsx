import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  getActivityCategoryTranslationKey,
} from "@/lib/activity-categories";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import {
  formatDate,
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CategoryBadge,
  HeaderActionLink,
  StatusBadge,
} from "../../_components/page-ui";
import {
  cancelEvent,
  cancelEventRegistration,
  joinEvent,
  updateEventSafety,
  updateEventSharing,
} from "../actions";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type EventRecord = {
  id: string;
  school_id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  allow_connected_school_registration: boolean;
  risk_level: "low" | "medium" | "high";
  permission_required: boolean;
  permission_note: string | null;
};

type StudentRoster = {
  id: string;
};

type ClubOption = {
  id: string;
  name: string;
};

type SchoolOption = {
  id: string;
  name: string;
};

type EventShare = {
  event_id: string;
  school_id: string;
};

type EventAttendee = {
  event_id: string;
  student_roster_id: string | null;
  attendee_profile_id: string | null;
  permission_status: EventPermissionStatus;
  status: string;
};

type EventPermissionStatus =
  | "declined"
  | "not_required"
  | "pending"
  | "received";

type Translate = (key: string) => string;
type FormatTranslate = (
  key: string,
  values: Record<string, string | number>,
) => string;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
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
    .maybeSingle<Profile>();

  if (!profile) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const event = await getEventById(admin, eventId);

  if (!event) {
    redirect("/events");
  }

  const isStaff = profile.role === "school_admin" || profile.role === "teacher";
  const isOwnSchoolEvent = event.school_id === profile.school_id;
  const [currentStudent, connectedSchoolIds, eventShares] = await Promise.all([
    getCurrentStudent(admin, profile),
    getConnectedSchoolIds(admin, profile.school_id),
    getEventShares(admin, [event.id]),
  ]);
  const sharedSchoolIds = eventShares.map((share) => share.school_id);
  const canView = canViewEvent({
    connectedSchoolIds,
    event,
    isOwnSchoolEvent,
    profile,
    sharedSchoolIds,
  });

  if (!canView) {
    redirect("/events");
  }

  const [attendees, club, ownerSchool, connectedSchools] = await Promise.all([
    getEventAttendees(admin, [event.id]),
    event.club_id ? getClubById(admin, event.school_id, event.club_id) : null,
    isOwnSchoolEvent
      ? Promise.resolve(null)
      : getSchoolById(admin, event.school_id),
    isStaff && isOwnSchoolEvent && connectedSchoolIds.length
      ? getSchoolsById(admin, connectedSchoolIds)
      : Promise.resolve([]),
  ]);
  const registeredCount = attendees.length;
  const isFull =
    event.capacity !== null && registeredCount >= event.capacity;
  const currentRegistration = getCurrentRegistration(
    attendees,
    profile,
    currentStudent,
  );
  const ownerSchoolName = isOwnSchoolEvent
    ? t("events.card.mySchool")
    : ownerSchool?.name ?? t("events.fallback.connectedSchool");

  return (
    <div className="page-stack">
      <section className="section-card section-card-padded">
        <div className="max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <HeaderActionLink href="/events" variant="secondary">
              {t("common.backToEvents")}
            </HeaderActionLink>
            <span className="page-eyebrow">{t("events.detail.overview")}</span>
          </div>
          <div className="min-w-0 space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-zinc-950 sm:text-3xl">
                {event.title}
              </h1>
              <p className="mt-2 text-sm font-medium text-zinc-700">
                {formatDateTime(event.starts_at, locale)} -{" "}
                {formatTime(event.ends_at, locale)}
              </p>
              {event.location ? (
                <p className="mt-1 text-sm text-zinc-600">{event.location}</p>
              ) : null}
            </div>
            <EventBadges
              clubName={club?.name ?? null}
              event={event}
              ownerSchoolName={ownerSchoolName}
              permissionStatus={currentRegistration?.permission_status}
              registrationStatus={currentRegistration?.status}
              sharedSchoolIds={sharedSchoolIds}
              showOwner={!isOwnSchoolEvent}
              t={t}
              tf={tf}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          <article className="section-card section-card-padded order-2 lg:order-none">
            <h2 className="section-title">{t("events.detail.eventInformation")}</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <DetailItem label={t("events.form.startsAt")}>
                {formatDateTime(event.starts_at, locale)}
              </DetailItem>
              <DetailItem label={t("events.form.endsAt")}>
                {formatDateTime(event.ends_at, locale)}
              </DetailItem>
              <DetailItem label={t("events.card.location")}>
                {event.location || "-"}
              </DetailItem>
              <DetailItem label={t("events.card.eventType")}>
                {club ? t("events.fallback.clubEvent") : t("events.card.schoolEvent")}
              </DetailItem>
              {club ? (
                <DetailItem label={t("events.form.club")}>{club.name}</DetailItem>
              ) : null}
              <DetailItem label={t("events.card.hostedBy")}>
                {ownerSchoolName}
              </DetailItem>
              <DetailItem label={t("filters.category")}>
                {event.category ? categoryLabel(event.category, t) : "-"}
              </DetailItem>
              <DetailItem label={t("filters.status")}>
                {eventStatusLabel(event.status, t)}
              </DetailItem>
            </dl>
          </article>

          <article className="section-card section-card-padded order-4 lg:order-none">
            <h2 className="section-title">{t("events.form.description")}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700">
              {event.description || t("events.detail.noDescription")}
            </p>
          </article>

          <article className="section-card section-card-padded order-5 lg:order-none">
            <h2 className="section-title">{t("events.formGroups.safetyPermissions")}</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <DetailItem label={t("events.card.safety")}>
                {riskLabel(event.risk_level, t)}
              </DetailItem>
              <DetailItem label={t("events.card.permission")}>
                {event.permission_required
                  ? t("events.permission.mayBeRequired")
                  : t("events.permission.notRequired")}
              </DetailItem>
            </dl>
            {event.permission_note ? (
              <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--card-soft)] p-3">
                <h3 className="text-sm font-semibold text-zinc-950">
                  {t("events.permission.note")}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">
                  {event.permission_note}
                </p>
              </div>
            ) : null}
            {isStaff && isOwnSchoolEvent ? (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <SafetyForm event={event} t={t} />
              </div>
            ) : null}
          </article>
        </div>

        <aside className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4 lg:self-start">
          <article className="section-card section-card-padded order-1 lg:order-none">
            <h2 className="section-title">{t("common.primaryAction")}</h2>
            <div className="mt-3">
              <PrimaryActionPanel
                currentRegistration={currentRegistration}
                currentStudent={currentStudent}
                event={event}
                isFull={isFull}
                isOwnSchoolEvent={isOwnSchoolEvent}
                isStaff={isStaff}
                t={t}
                userSchoolId={profile.school_id}
              />
            </div>
          </article>

          <article className="section-card section-card-padded order-3 lg:order-none">
            <h2 className="section-title">{t("events.detail.registrationSummary")}</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <DetailItem label={t("events.card.registration")}>
                {tf("events.registration.count", { count: registeredCount })}
                {event.capacity
                  ? ` ${tf("events.registration.maxSuffix", {
                      count: event.capacity,
                    })}`
                  : ""}
              </DetailItem>
              <DetailItem label={t("events.card.maxParticipants")}>
                {event.capacity ?? t("events.capacity.noLimit")}
              </DetailItem>
              {currentStudent ? (
                <DetailItem label={t("filters.status")}>
                  {currentRegistration?.status === "attended"
                    ? t("events.detail.youHaveCheckedIn")
                    : currentRegistration?.status === "registered"
                      ? t("events.registration.youAreRegistered")
                      : t("events.registration.notJoined")}
                </DetailItem>
              ) : null}
              {currentRegistration && event.permission_required ? (
                <DetailItem label={t("events.card.permission")}>
                  {permissionLabel(currentRegistration.permission_status, t)}
                </DetailItem>
              ) : null}
            </dl>
          </article>

          {isStaff && isOwnSchoolEvent ? (
            <article className="section-card section-card-padded order-6 lg:order-none">
              <h2 className="section-title">{t("events.detail.management")}</h2>
              <p className="section-description">{t("events.detail.staffTools")}</p>
              <form action={cancelEvent} className="mt-3">
                <input name="event_id" type="hidden" value={event.id} />
                <ConfirmSubmitButton
                  cancelLabel={t("common.cancel")}
                  className="btn btn-secondary min-h-10 w-full px-3"
                  confirmDescription={t("feedback.cannotBeUndone")}
                  confirmLabel={t("feedback.confirm")}
                  confirmTitle={t("feedback.cancelEvent")}
                  pendingLabel={t("events.actions.cancelling")}
                >
                  {t("events.actions.cancel")}
                </ConfirmSubmitButton>
              </form>
            </article>
          ) : null}

          {isStaff && isOwnSchoolEvent ? (
            <article className="section-card section-card-padded order-7 lg:order-none">
              <h2 className="section-title">{t("events.detail.sharing")}</h2>
              <p className="section-description">
                {sharingLabel(event, sharedSchoolIds, t, tf)}
              </p>
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <SharingForm
                  connectedSchools={connectedSchools}
                  event={event}
                  sharedSchoolIds={sharedSchoolIds}
                  t={t}
                />
              </div>
            </article>
          ) : null}

          <article className="section-card section-card-padded order-8 lg:order-none">
            <h2 className="section-title">{t("events.detail.timeline")}</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <DetailItem label={t("filters.status")}>
                {eventStatusLabel(event.status, t)}
              </DetailItem>
              <DetailItem label={t("events.detail.createdAt")}>
                {formatDate(event.created_at, locale)}
              </DetailItem>
              <DetailItem label={t("events.detail.submittedAt")}>
                {event.submitted_at ? formatDate(event.submitted_at, locale) : "-"}
              </DetailItem>
              <DetailItem label={t("events.detail.approvedAt")}>
                {event.approved_at ? formatDate(event.approved_at, locale) : "-"}
              </DetailItem>
            </dl>
            {event.rejection_reason ? (
              <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--card-soft)] p-3">
                <h3 className="text-sm font-semibold text-zinc-950">
                  {t("events.detail.rejectionReason")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {event.rejection_reason}
                </p>
              </div>
            ) : null}
          </article>
        </aside>
      </section>
    </div>
  );
}

function EventBadges({
  clubName,
  event,
  ownerSchoolName,
  permissionStatus,
  registrationStatus,
  sharedSchoolIds,
  showOwner,
  t,
  tf,
}: {
  clubName: string | null;
  event: EventRecord;
  ownerSchoolName: string;
  permissionStatus: EventPermissionStatus | undefined;
  registrationStatus: string | undefined;
  sharedSchoolIds: string[];
  showOwner: boolean;
  t: Translate;
  tf: FormatTranslate;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <StatusBadge status={event.status}>
        {eventStatusLabel(event.status, t)}
      </StatusBadge>
      {registrationStatus ? (
        <StatusBadge
          variant={
            registrationStatus === "registered" ||
            registrationStatus === "attended"
              ? "success"
              : "default"
          }
        >
          {registrationStatus === "attended"
            ? t("events.detail.youHaveCheckedIn")
            : t("events.registration.youAreRegistered")}
        </StatusBadge>
      ) : null}
      {clubName ? <StatusBadge>{clubName}</StatusBadge> : null}
      {event.category ? (
        <CategoryBadge>{categoryLabel(event.category, t)}</CategoryBadge>
      ) : null}
      <StatusBadge variant={riskBadgeVariant(event.risk_level)}>
        {riskLabel(event.risk_level, t)}
      </StatusBadge>
      {event.permission_required ? (
        <StatusBadge variant="warning">
          {t("events.permission.required")}
        </StatusBadge>
      ) : null}
      {registrationStatus && event.permission_required ? (
        <StatusBadge variant={permissionBadgeVariant(permissionStatus)}>
          {permissionLabel(permissionStatus, t)}
        </StatusBadge>
      ) : null}
      <StatusBadge variant={sharedSchoolIds.length ? "info" : "default"}>
        {sharingLabel(event, sharedSchoolIds, t, tf)}
      </StatusBadge>
      {showOwner ? (
        <StatusBadge variant="info">{ownerSchoolName}</StatusBadge>
      ) : null}
    </div>
  );
}

function PrimaryActionPanel({
  currentRegistration,
  currentStudent,
  event,
  isFull,
  isOwnSchoolEvent,
  isStaff,
  t,
  userSchoolId,
}: {
  currentRegistration: CurrentRegistration | undefined;
  currentStudent: StudentRoster | null;
  event: EventRecord;
  isFull: boolean;
  isOwnSchoolEvent: boolean;
  isStaff: boolean;
  t: Translate;
  userSchoolId: string;
}) {
  if (isStaff && isOwnSchoolEvent) {
    return (
      <Link
        className="btn btn-primary min-h-10 w-full px-3"
        href={`/events/${event.id}/attendance`}
      >
        {t("events.actions.attendanceQr")}
      </Link>
    );
  }

  if (isStaff) {
    return (
      <span className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-700">
        {t("events.sharing.sharedEvent")}
      </span>
    );
  }

  if (!currentStudent) {
    return null;
  }

  if (currentRegistration?.status === "registered") {
    return (
      <form action={cancelEventRegistration} className="w-full">
        <input name="event_id" type="hidden" value={event.id} />
        <PendingSubmitButton
          className="btn btn-secondary min-h-12 w-full px-4 text-base sm:min-h-10 sm:text-sm"
          pendingLabel={t("events.actions.cancelling")}
          toastMessage={t("events.actions.cancelling")}
        >
          {t("events.actions.cancelMyRegistration")}
        </PendingSubmitButton>
      </form>
    );
  }

  if (currentRegistration?.status === "attended") {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-50 px-3 text-sm font-medium text-emerald-700">
        {t("events.detail.youHaveCheckedIn")}
      </span>
    );
  }

  if (!canCurrentStudentRegister(event, currentStudent, userSchoolId)) {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-700">
        {t("events.registration.unavailable")}
      </span>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {event.permission_required ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          {t("events.permission.studentNotice")}
        </p>
      ) : null}
      <form action={joinEvent} className="w-full">
        <input name="event_id" type="hidden" value={event.id} />
        <PendingSubmitButton
          className="btn btn-primary min-h-12 w-full px-4 text-base disabled:cursor-not-allowed disabled:bg-zinc-400 sm:min-h-10 sm:text-sm"
          disabled={isFull}
          pendingLabel={t("events.actions.joining")}
          toastMessage={t("events.actions.joining")}
        >
          {isFull ? t("events.actions.eventFull") : t("events.actions.join")}
        </PendingSubmitButton>
      </form>
    </div>
  );
}
function DetailItem({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-900">{children}</dd>
    </div>
  );
}

type CurrentRegistration = {
  permission_status: EventPermissionStatus;
  status: string;
};

function SafetyForm({ event, t }: { event: EventRecord; t: Translate }) {
  return (
    <form action={updateEventSafety} className="compact-form flex flex-col gap-3">
      <input name="event_id" type="hidden" value={event.id} />
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        {t("events.form.riskLevel")}
        <select
          className="h-10 cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={event.risk_level}
          name="risk_level"
        >
          <option value="low">{t("events.risk.low")}</option>
          <option value="medium">{t("events.risk.medium")}</option>
          <option value="high">{t("events.risk.high")}</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          className="h-4 w-4 cursor-pointer"
          defaultChecked={event.permission_required}
          name="permission_required"
          type="checkbox"
          value="true"
        />
        {t("events.form.permissionRequired")}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        {t("events.form.permissionNote")}
        <textarea
          className="min-h-20 rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none transition focus:border-zinc-900"
          defaultValue={event.permission_note ?? ""}
          name="permission_note"
        />
      </label>
      <PendingSubmitButton
        className="btn btn-secondary min-h-10 px-3"
        pendingLabel={t("common.saving")}
        toastMessage={t("common.saving")}
      >
        {t("events.actions.saveSafety")}
      </PendingSubmitButton>
    </form>
  );
}

function SharingForm({
  connectedSchools,
  event,
  sharedSchoolIds,
  t,
}: {
  connectedSchools: SchoolOption[];
  event: EventRecord;
  sharedSchoolIds: string[];
  t: Translate;
}) {
  const sharedSchoolIdSet = new Set(sharedSchoolIds);

  return (
    <form action={updateEventSharing} className="compact-form flex flex-col gap-3">
      <input name="event_id" type="hidden" value={event.id} />
      {connectedSchools.length ? (
        <fieldset className="rounded-md border border-zinc-200 p-3">
          <legend className="px-1 text-xs font-medium text-zinc-600">
            {t("events.sharing.shareWith")}
          </legend>
          <div className="flex flex-col gap-2">
            {connectedSchools.map((school) => (
              <label
                className="flex items-center gap-2 text-sm text-zinc-700"
                key={school.id}
              >
                <input
                  className="h-4 w-4 cursor-pointer"
                  defaultChecked={sharedSchoolIdSet.has(school.id)}
                  name="share_school_ids"
                  type="checkbox"
                  value={school.id}
                />
                {school.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-zinc-500">
          {t("events.sharing.noConnections")}
        </p>
      )}
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          className="h-4 w-4 cursor-pointer"
          defaultChecked={event.allow_connected_school_registration}
          name="allow_connected_registration"
          type="checkbox"
          value="true"
        />
        {t("events.sharing.allowConnectedRegistration")}
      </label>
      <PendingSubmitButton
        className="btn btn-secondary min-h-10 px-3 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
        disabled={!connectedSchools.length && !sharedSchoolIds.length}
        pendingLabel={t("common.saving")}
        toastMessage={t("common.saving")}
      >
        {t("events.actions.saveSharing")}
      </PendingSubmitButton>
    </form>
  );
}

function canViewEvent({
  connectedSchoolIds,
  event,
  isOwnSchoolEvent,
  profile,
  sharedSchoolIds,
}: {
  connectedSchoolIds: string[];
  event: EventRecord;
  isOwnSchoolEvent: boolean;
  profile: Profile;
  sharedSchoolIds: string[];
}) {
  const isStaff = profile.role === "school_admin" || profile.role === "teacher";

  if (isOwnSchoolEvent) {
    return isStaff || event.status === "approved";
  }

  return (
    event.status === "approved" &&
    sharedSchoolIds.includes(profile.school_id) &&
    connectedSchoolIds.includes(event.school_id)
  );
}

function canCurrentStudentRegister(
  event: EventRecord,
  currentStudent: StudentRoster | null,
  userSchoolId: string,
) {
  return (
    Boolean(currentStudent) &&
    event.status === "approved" &&
    (event.school_id === userSchoolId ||
      event.allow_connected_school_registration)
  );
}

async function getEventById(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
) {
  const { data: event } = await timeServer("events.detail.query.event", () =>
    admin
      .from("events")
      .select(
        "id, school_id, club_id, title, description, category, location, starts_at, ends_at, capacity, status, submitted_at, approved_at, rejection_reason, created_at, updated_at, allow_connected_school_registration, risk_level, permission_required, permission_note",
      )
      .eq("id", eventId)
      .maybeSingle<EventRecord>(),
  );

  return event;
}

async function getCurrentStudent(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
) {
  if (profile.role !== "student") {
    return null;
  }

  const { data: student } = await timeServer(
    "events.detail.query.current-student",
    () =>
      admin
        .from("student_rosters")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .maybeSingle<StudentRoster>(),
  );

  return student;
}

async function getClubById(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  clubId: string,
) {
  const { data: club } = await timeServer("events.detail.query.club", () =>
    admin
      .from("clubs")
      .select("id, name")
      .eq("id", clubId)
      .eq("school_id", schoolId)
      .maybeSingle<ClubOption>(),
  );

  return club;
}

async function getSchoolById(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: school } = await timeServer("events.detail.query.school", () =>
    admin
      .from("schools")
      .select("id, name")
      .eq("id", schoolId)
      .maybeSingle<SchoolOption>(),
  );

  return school;
}

async function getSchoolsById(
  admin: ReturnType<typeof createAdminClient>,
  schoolIds: string[],
) {
  const { data: schools } = await timeServer(
    "events.detail.query.schools-by-id",
    () =>
      admin
        .from("schools")
        .select("id, name")
        .in("id", schoolIds)
        .returns<SchoolOption[]>(),
  );

  return schools ?? [];
}

async function getConnectedSchoolIds(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
) {
  const { data: connections } = await timeServer(
    "events.detail.query.connected-school-ids",
    () =>
      admin
        .from("school_connections")
        .select("requester_school_id, receiver_school_id")
        .eq("status", "approved")
        .or(
          [
            `requester_school_id.eq.${schoolId}`,
            `receiver_school_id.eq.${schoolId}`,
          ].join(","),
        )
        .returns<
          Array<{
            requester_school_id: string;
            receiver_school_id: string;
          }>
        >(),
  );

  return (connections ?? []).map((connection) =>
    connection.requester_school_id === schoolId
      ? connection.receiver_school_id
      : connection.requester_school_id,
  );
}

async function getEventShares(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
) {
  const { data: shares } = await timeServer(
    "events.detail.query.event-shares",
    () =>
      admin
        .from("event_school_shares")
        .select("event_id, school_id")
        .in("event_id", eventIds)
        .returns<EventShare[]>(),
  );

  return shares ?? [];
}

async function getEventAttendees(
  admin: ReturnType<typeof createAdminClient>,
  eventIds: string[],
) {
  const { data: attendees } = await timeServer(
    "events.detail.query.event-attendees",
    () =>
      admin
        .from("event_attendees")
        .select(
          "event_id, student_roster_id, attendee_profile_id, permission_status, status",
        )
        .in("event_id", eventIds)
        .in("status", ["registered", "attended"])
        .returns<EventAttendee[]>(),
  );

  return attendees ?? [];
}

function getCurrentRegistration(
  attendees: EventAttendee[],
  profile: Profile,
  currentStudent: StudentRoster | null,
): CurrentRegistration | undefined {
  const attendee = attendees.find(
    (item) =>
      item.attendee_profile_id === profile.id ||
      item.student_roster_id === currentStudent?.id,
  );

  return attendee
    ? {
        permission_status: attendee.permission_status,
        status: attendee.status,
      }
    : undefined;
}

function riskBadgeVariant(riskLevel: EventRecord["risk_level"]) {
  if (riskLevel === "high") {
    return "danger";
  }

  return riskLevel === "medium" ? "warning" : "success";
}

function riskLabel(riskLevel: EventRecord["risk_level"], t: Translate) {
  if (riskLevel === "high") {
    return t("events.risk.high");
  }

  return riskLevel === "medium"
    ? t("events.risk.medium")
    : t("events.risk.low");
}

function eventStatusLabel(status: string, t: Translate) {
  if (status === "approved") {
    return t("status.approved");
  }

  if (status === "canceled") {
    return t("status.canceled");
  }

  if (status === "draft") {
    return t("status.draft");
  }

  if (status === "pending_approval") {
    return t("status.pendingApproval");
  }

  if (status === "rejected") {
    return t("status.rejected");
  }

  return status;
}

function permissionBadgeVariant(
  permissionStatus: EventPermissionStatus | undefined,
) {
  if (permissionStatus === "received") {
    return "success";
  }

  if (permissionStatus === "declined") {
    return "danger";
  }

  return permissionStatus === "pending" ? "warning" : "default";
}

function permissionLabel(
  permissionStatus: EventPermissionStatus | undefined,
  t: Translate,
) {
  if (permissionStatus === "received") {
    return t("events.permission.status.received");
  }

  if (permissionStatus === "declined") {
    return t("events.permission.status.declined");
  }

  if (permissionStatus === "pending") {
    return t("events.permission.status.pending");
  }

  return t("events.permission.status.notRequired");
}

function sharingLabel(
  event: EventRecord,
  sharedSchoolIds: string[],
  t: Translate,
  tf: FormatTranslate,
) {
  if (!sharedSchoolIds.length) {
    return t("events.detail.internalEvent");
  }

  if (event.allow_connected_school_registration && sharedSchoolIds.length > 1) {
    return tf("events.sharing.sharedManyRegistration", {
      count: sharedSchoolIds.length,
    });
  }

  if (sharedSchoolIds.length === 1) {
    return event.allow_connected_school_registration
      ? t("events.sharing.sharedOneRegistration")
      : t("events.sharing.sharedOne");
  }

  return tf("events.sharing.sharedMany", { count: sharedSchoolIds.length });
}

function categoryLabel(category: string, t: Translate) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
