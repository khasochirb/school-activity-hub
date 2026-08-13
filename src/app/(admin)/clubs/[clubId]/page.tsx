import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getCurrentClubActor } from "@/lib/auth/club-access";
import {
  getActivityCategoryTranslationKey,
} from "@/lib/activity-categories";
import { type ClubProfileTheme, isUuid } from "@/lib/clubs/club-profile";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDateTime, formatTime } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import {
  CategoryBadge,
  StatusBadge,
} from "../../_components/page-ui";
import { joinClub, leaveClub } from "../actions";

type Club = {
  category: string | null;
  description: string | null;
  id: string;
  name: string;
  school_id: string;
  status: "active" | "archived";
};

type ClubProfileRow = {
  about: string | null;
  accessibility_notes: string | null;
  commitment_notes: string | null;
  cost_notes: string | null;
  eligibility_notes: string | null;
  materials_notes: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
  tagline: string | null;
  theme_key: ClubProfileTheme | null;
};

type MyMembership = {
  role: "leader" | "member";
  status: "active" | "inactive";
};

type UpcomingEvent = {
  ends_at: string;
  id: string;
  location: string | null;
  starts_at: string;
  title: string;
};

type Registration = {
  event_id: string;
  status: "attended" | "canceled" | "registered";
};

type ClubProfileSearchParams = {
  updated?: string | string[];
};

export default async function ClubProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<ClubProfileSearchParams>;
}) {
  const { clubId } = await params;

  if (!isUuid(clubId)) {
    notFound();
  }

  const actor = await getCurrentClubActor();

  if (!actor) {
    redirect("/login");
  }

  if (!actor.profile && !actor.isPlatformAdmin) {
    redirect("/dashboard");
  }

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const supabase = await createClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("id, school_id, name, description, category, status")
    .eq("id", clubId)
    .maybeSingle<Club>();

  if (!club) {
    notFound();
  }

  const [{ data: membership }, { data: canEdit }] = await Promise.all([
    actor.profile?.role === "student"
      ? supabase
          .rpc("get_my_club_membership", { target_club_id: club.id })
          .maybeSingle<MyMembership>()
      : Promise.resolve({ data: null }),
    supabase.rpc("current_user_can_edit_club_profile", {
      target_club_id: club.id,
    }),
  ]);
  const activeMembership = membership?.status === "active" ? membership : null;
  const isLeader = activeMembership?.role === "leader";
  const isOwnSchoolStaff = Boolean(
    actor.profile &&
      actor.profile.school_id === club.school_id &&
      (actor.profile.role === "school_admin" ||
        actor.profile.role === "teacher"),
  );

  if (
    !actor.isPlatformAdmin &&
    (!actor.profile || actor.profile.school_id !== club.school_id)
  ) {
    notFound();
  }

  if (
    actor.profile?.role === "student" &&
    club.status !== "active" &&
    !isLeader
  ) {
    notFound();
  }

  const [{ data: profile }, { data: memberCount }, { data: upcomingEvents }] =
    await Promise.all([
      supabase
        .from("club_profiles")
        .select(
          "tagline, about, meeting_schedule, meeting_location, eligibility_notes, commitment_notes, accessibility_notes, cost_notes, materials_notes, theme_key",
        )
        .eq("club_id", club.id)
        .maybeSingle<ClubProfileRow>(),
      supabase.rpc("get_club_member_count", { target_club_id: club.id }),
      supabase
        .from("events")
        .select("id, title, starts_at, ends_at, location")
        .eq("club_id", club.id)
        .eq("school_id", club.school_id)
        .eq("status", "approved")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(3)
        .returns<UpcomingEvent[]>(),
    ]);
  const eventRows = upcomingEvents ?? [];
  const { data: registrations } =
    actor.profile?.role === "student" && eventRows.length
      ? await supabase
          .from("event_attendees")
          .select("event_id, status")
          .eq("attendee_profile_id", actor.userId)
          .in(
            "event_id",
            eventRows.map((event) => event.id),
          )
          .returns<Registration[]>()
      : { data: [] };
  const registrationByEvent = new Map(
    (registrations ?? []).map((registration) => [
      registration.event_id,
      registration.status,
    ]),
  );
  const details = getProfileDetails(club, profile);
  const showIncompleteNotice = details.completedCount < 3;
  const profileUpdated = getFirst((await searchParams).updated) === "1";
  const canManageProfile = canEdit === true || isLeader || isOwnSchoolStaff;
  const themeClass = getThemeClass(profile?.theme_key ?? "warm");

  return (
    <div className="page-stack">
      <section className={`overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6 ${themeClass}`}>
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]"
          href="/clubs"
          prefetch={false}
        >
          {t("clubs.profile.actions.backToClubs")}
          <PendingLinkIndicator />
        </Link>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="page-eyebrow">{t("clubs.profile.clubPage")}</p>
            <h1 className="break-words text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
              {club.name}
            </h1>
            {profile?.tagline ? (
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-base leading-7 text-slate-700">
                {profile.tagline}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {club.category ? (
                <CategoryBadge category={club.category}>
                  {categoryLabel(club.category, t)}
                </CategoryBadge>
              ) : null}
              <StatusBadge status={club.status}>
                {club.status === "active"
                  ? t("status.active")
                  : t("status.archived")}
              </StatusBadge>
              {activeMembership ? (
                <StatusBadge variant="success">
                  {isLeader
                    ? t("clubs.memberRoles.leader")
                    : t("clubs.profile.membership.joined")}
                </StatusBadge>
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:justify-end">
            {actor.profile?.role === "student" && club.status === "active" ? (
              <MembershipAction
                clubId={club.id}
                isJoined={Boolean(activeMembership)}
                labels={{
                  join: t("clubs.actions.join"),
                  joining: t("clubs.actions.joining"),
                  leave: t("clubs.actions.leave"),
                  leaving: t("clubs.actions.leaving"),
                }}
              />
            ) : null}
            {canManageProfile ? (
              <Link
                className="btn btn-secondary min-h-11 gap-2"
                href={`/clubs/${club.id}/edit`}
                prefetch={false}
              >
                {t("clubs.profile.actions.edit")}
                <PendingLinkIndicator />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {profileUpdated ? (
        <p className="notice-box notice-success" role="status">
          {t("clubs.profile.success.saved")}
        </p>
      ) : null}

      {showIncompleteNotice ? (
        <p className="notice-box notice-info">
          {t("clubs.profile.incompleteNotice")}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <main className="flex min-w-0 flex-col gap-4">
          {details.about ? (
            <ProfileSection title={t("clubs.profile.sections.about")}>
              {details.about}
            </ProfileSection>
          ) : null}

          {profile?.meeting_schedule || profile?.meeting_location ? (
            <section className="grid gap-4 md:grid-cols-2">
              {profile.meeting_schedule ? (
                <ProfileSection title={t("clubs.profile.sections.meetingSchedule")}>
                  {profile.meeting_schedule}
                </ProfileSection>
              ) : null}
              {profile.meeting_location ? (
                <ProfileSection title={t("clubs.profile.sections.meetingLocation")}>
                  {profile.meeting_location}
                </ProfileSection>
              ) : null}
            </section>
          ) : null}

          {profile?.eligibility_notes ? (
            <ProfileSection title={t("clubs.profile.sections.eligibility")}>
              {profile.eligibility_notes}
            </ProfileSection>
          ) : null}

          {profile?.commitment_notes ? (
            <ProfileSection title={t("clubs.profile.sections.commitment")}>
              {profile.commitment_notes}
            </ProfileSection>
          ) : null}

          {profile?.accessibility_notes ? (
            <ProfileSection title={t("clubs.profile.sections.accessibility")}>
              {profile.accessibility_notes}
            </ProfileSection>
          ) : null}

          {profile?.cost_notes || profile?.materials_notes ? (
            <section className="section-card section-card-padded">
              <h2 className="section-title">
                {t("clubs.profile.sections.costMaterials")}
              </h2>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                {profile.cost_notes ? (
                  <DetailItem
                    label={t("clubs.profile.fields.costNotes")}
                    value={profile.cost_notes}
                  />
                ) : null}
                {profile.materials_notes ? (
                  <DetailItem
                    label={t("clubs.profile.fields.materialsNotes")}
                    value={profile.materials_notes}
                  />
                ) : null}
              </dl>
            </section>
          ) : null}

          <section className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                {t("clubs.profile.sections.upcomingActivities")}
              </h2>
            </div>
            {eventRows.length ? (
              <ul className="divide-y divide-[var(--border)]">
                {eventRows.map((event) => {
                  const registration = registrationByEvent.get(event.id);

                  return (
                    <li className="p-4" key={event.id}>
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Link
                            className="font-bold text-slate-950 hover:text-[var(--primary-strong)]"
                            href={`/events/${event.id}`}
                            prefetch={false}
                          >
                            <span className="break-words">{event.title}</span>
                            <PendingLinkIndicator />
                          </Link>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDateTime(event.starts_at, locale)} -{" "}
                            {formatTime(event.ends_at, locale)}
                          </p>
                          {event.location ? (
                            <p className="mt-1 break-words text-sm text-slate-600">
                              {event.location}
                            </p>
                          ) : null}
                        </div>
                        {registration ? (
                          <StatusBadge variant="success">
                            {registration === "attended"
                              ? t("events.registration.checkedIn")
                              : t("events.registration.youAreRegistered")}
                          </StatusBadge>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-4 text-sm text-slate-600">
                {t("clubs.profile.upcomingEmpty")}
              </p>
            )}
          </section>
        </main>

        <aside className="flex min-w-0 flex-col gap-4 self-start">
          <section className="section-card section-card-padded">
            <h2 className="section-title">
              {t("clubs.profile.membership.title")}
            </h2>
            <dl className="mt-3 grid gap-3">
              <DetailItem
                label={t("clubs.profile.membership.status")}
                value={
                  activeMembership
                    ? isLeader
                      ? t("clubs.memberRoles.leader")
                      : t("clubs.profile.membership.joined")
                    : t("clubs.profile.membership.notJoined")
                }
              />
              <DetailItem
                label={t("clubs.profile.membership.memberCount")}
                value={tf("clubs.profile.membership.memberCountValue", {
                  count: Number(memberCount ?? 0),
                })}
              />
            </dl>
          </section>

          <section className="section-card section-card-padded">
            <h2 className="section-title">
              {t("clubs.profile.sections.clubInformation")}
            </h2>
            <dl className="mt-3 grid gap-3">
              <DetailItem
                label={t("clubs.form.category")}
                value={
                  club.category
                    ? categoryLabel(club.category, t)
                    : t("clubs.form.noCategory")
                }
              />
              <DetailItem
                label={t("clubs.form.status")}
                value={
                  club.status === "active"
                    ? t("status.active")
                    : t("status.archived")
                }
              />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ProfileSection({
  children,
  title,
}: {
  children: string;
  title: string;
}) {
  return (
    <section className="section-card section-card-padded">
      <h2 className="section-title">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
        {children}
      </p>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function MembershipAction({
  clubId,
  isJoined,
  labels,
}: {
  clubId: string;
  isJoined: boolean;
  labels: { join: string; joining: string; leave: string; leaving: string };
}) {
  return (
    <form action={isJoined ? leaveClub : joinClub} className="w-full sm:w-auto">
      <input name="club_id" type="hidden" value={clubId} />
      <PendingSubmitButton
        className={`btn min-h-11 w-full sm:w-auto ${isJoined ? "btn-secondary" : "btn-primary"}`}
        pendingLabel={isJoined ? labels.leaving : labels.joining}
        toastMessage={isJoined ? labels.leaving : labels.joining}
      >
        {isJoined ? labels.leave : labels.join}
      </PendingSubmitButton>
    </form>
  );
}

function getProfileDetails(club: Club, profile: ClubProfileRow | null) {
  const values = [
    profile?.tagline,
    profile?.about ?? club.description,
    profile?.meeting_schedule,
    profile?.meeting_location,
    profile?.eligibility_notes,
    profile?.commitment_notes,
    profile?.accessibility_notes,
    profile?.cost_notes,
    profile?.materials_notes,
  ];

  return {
    about: profile?.about ?? club.description,
    completedCount: values.filter(Boolean).length,
  };
}

function getThemeClass(theme: ClubProfileTheme) {
  const themes: Record<ClubProfileTheme, string> = {
    forest:
      "border-emerald-300/60 bg-[linear-gradient(135deg,var(--card),var(--card-soft))]",
    plum:
      "border-fuchsia-300/50 bg-[linear-gradient(135deg,var(--card),var(--card-soft))]",
    sky: "border-sky-300/60 bg-[linear-gradient(135deg,var(--card),var(--card-soft))]",
    warm:
      "border-[color:var(--primary)] bg-[linear-gradient(135deg,var(--card),var(--primary-soft))]",
  };

  return themes[theme];
}

function categoryLabel(category: string, t: (key: string) => string) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

