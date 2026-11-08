import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ShareClubButton } from "@/components/share-club-button";
import { getCurrentClubActor } from "@/lib/auth/club-access";
import {
  getActivityCategoryTranslationKey,
} from "@/lib/activity-categories";
import { type ClubProfileTheme, isUuid } from "@/lib/clubs/club-profile";
import { buildClubShareText } from "@/lib/clubs/club-share";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatCalendarDateBadge, formatTime } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import {
  StatusBadge,
} from "../../_components/page-ui";
import { DetailTabs } from "../../_components/detail-tabs";
import { CategoryLabel, Cover } from "../../_components/clean-ui";
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
  banner_path: string | null;
  beginners_welcome: boolean | null;
  commitment_notes: string | null;
  cost_notes: string | null;
  eligibility_notes: string | null;
  first_visit_free: boolean | null;
  materials_notes: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
  logo_path: string | null;
  tagline: string | null;
  theme_key: ClubProfileTheme | null;
  updated_at: string;
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
          "tagline, about, meeting_schedule, meeting_location, eligibility_notes, commitment_notes, accessibility_notes, cost_notes, materials_notes, theme_key, beginners_welcome, first_visit_free, logo_path, banner_path, updated_at",
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
  const bannerUrl = getMediaUrl(club.id, "banner", profile);
  const logoUrl = getMediaUrl(club.id, "logo", profile);

  const aboutFacts = [
    { label: t("clubs.profile.sections.meetingSchedule"), value: profile?.meeting_schedule },
    { label: t("clubs.profile.sections.meetingLocation"), value: profile?.meeting_location },
    { label: t("clubs.profile.fields.costNotes"), value: profile?.cost_notes },
    { label: t("clubs.profile.fields.materialsNotes"), value: profile?.materials_notes },
    { label: t("clubs.profile.sections.eligibility"), value: profile?.eligibility_notes },
    { label: t("clubs.profile.sections.commitment"), value: profile?.commitment_notes },
    { label: t("clubs.profile.sections.accessibility"), value: profile?.accessibility_notes },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
  const hasAboutDetails = Boolean(
    details.about ||
      profile?.meeting_schedule ||
      profile?.meeting_location ||
      profile?.eligibility_notes ||
      profile?.commitment_notes ||
      profile?.accessibility_notes ||
      profile?.cost_notes ||
      profile?.materials_notes,
  );

  return (
    <div className="cl-page">
      <Link className="cl-back" href="/clubs" prefetch={false}>
        ← {t("clubs.title")}
      </Link>
      <section className="cl-clubhero">
        <div
          aria-label={tf("clubs.profile.media.bannerAlt", { club: club.name })}
          className="relative aspect-[3/1] max-h-72 overflow-hidden rounded-2xl bg-[var(--card-soft)]"
          role={bannerUrl ? undefined : "img"}
        >
          {bannerUrl ? (
            <Image
              alt={tf("clubs.profile.media.bannerAlt", { club: club.name })}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1200px"
              src={bannerUrl}
              unoptimized
            />
          ) : (
            <Cover
              category={club.category}
              className="absolute inset-0"
              imageUrl={null}
              initials=""
            />
          )}
        </div>
        <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              aria-label={tf("clubs.profile.media.logoAlt", { club: club.name })}
              className="relative -mt-8 h-20 w-20 shrink-0 overflow-hidden rounded-xl border-4 border-[var(--card)] bg-[var(--primary-soft)] shadow-md sm:-mt-10 sm:h-24 sm:w-24"
              role={logoUrl ? undefined : "img"}
            >
              {logoUrl ? (
                <Image
                  alt={tf("clubs.profile.media.logoAlt", { club: club.name })}
                  className="object-cover"
                  fill
                  sizes="96px"
                  src={logoUrl}
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-black text-slate-900">
                  {club.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 pt-3">
              <h1 className="break-words text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-[2.1rem]">
                {club.name}
              </h1>
              {profile?.tagline ? (
                <p className="mt-2 max-w-3xl whitespace-pre-wrap text-base leading-7 text-slate-700">
                  {profile.tagline}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <CategoryLabel
                  category={club.category}
                  label={club.category ? categoryLabel(club.category, t) : null}
                />
                {club.status !== "active" ? (
                  <StatusBadge status={club.status}>{t("status.archived")}</StatusBadge>
                ) : null}
                {profile?.beginners_welcome ? (
                  <StatusBadge variant="info">
                    {t("clubs.profile.fields.beginnersWelcome")}
                  </StatusBadge>
                ) : null}
                {profile?.first_visit_free ? (
                  <StatusBadge variant="info">
                    {t("clubs.profile.fields.firstVisitFree")}
                  </StatusBadge>
                ) : null}
                {activeMembership ? (
                  <StatusBadge variant="success">
                    {isLeader
                      ? t("clubs.memberRoles.leader")
                      : t("clubs.profile.membership.joined")}
                  </StatusBadge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:pt-3 lg:justify-end">
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
            {club.status === "active" ? (
              <ShareClubButton
                className="cl-btn-soft min-h-11"
                clubId={club.id}
                labels={{
                  copied: t("clubs.share.copied"),
                  failed: t("clubs.share.failed"),
                  share: t("clubs.share.action"),
                }}
                text={buildClubShareText(
                  {
                    beginnersWelcome: Boolean(profile?.beginners_welcome),
                    firstVisitFree: Boolean(profile?.first_visit_free),
                    meetingLocation: profile?.meeting_location ?? null,
                    meetingSchedule: profile?.meeting_schedule ?? null,
                    name: club.name,
                  },
                  {
                    beginnersWelcome: t("clubs.profile.fields.beginnersWelcome"),
                    firstVisitFree: t("clubs.profile.fields.firstVisitFree"),
                    meetingLocation: t("studentProfile.clubFacts.where"),
                    meetingSchedule: t("studentProfile.clubFacts.when"),
                  },
                )}
                title={club.name}
              />
            ) : null}
            {canManageProfile ? (
              <Link
                className="cl-btn-soft min-h-11"
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

      <p className="cl-statline">
        <span>
          <b>{Number(memberCount ?? 0)}</b>
          {t("clubs.profile.statline.members")}
        </span>
        <span>
          <b>{eventRows.length}</b>
          {t("clubs.profile.statline.upcoming")}
        </span>
      </p>

      {actor.profile?.role === "student" &&
      club.status === "active" &&
      !activeMembership ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-20 border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-950">
              {club.name}
            </p>
            <div className="shrink-0">
              <MembershipAction
                clubId={club.id}
                isJoined={false}
                labels={{
                  join: t("clubs.actions.join"),
                  joining: t("clubs.actions.joining"),
                  leave: t("clubs.actions.leave"),
                  leaving: t("clubs.actions.leaving"),
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

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
        <div className="min-w-0">
          <DetailTabs
            label={t("clubs.profile.tabs.label")}
            tabs={[
              {
                content: (
                  <div className="detail-tab-stack">
                    {details.about ? (
                      <p className="cl-evabout">{details.about}</p>
                    ) : null}
                    {aboutFacts.length ? (
                      <div className="cl-facts">
                        {aboutFacts.map((fact) => (
                          <div className="cl-card" key={fact.label}>
                            <span>{fact.label}</span>
                            <b className="whitespace-pre-line">{fact.value}</b>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {!hasAboutDetails ? (
                      <p className="section-card section-card-padded text-sm text-slate-600">
                        {t("clubs.profile.tabs.noDetails")}
                      </p>
                    ) : null}
                  </div>
                ),
                id: "about",
                label: t("clubs.profile.tabs.about"),
              },
              {
                content: (
                  <div className="cl-card cl-rows">
                    {eventRows.length ? (
                      eventRows.map((event) => {
                        const registration = registrationByEvent.get(event.id);
                        const tile = formatCalendarDateBadge(event.starts_at, locale);

                        return (
                          <Link
                            className="cl-row"
                            href={`/events/${event.id}`}
                            key={event.id}
                            prefetch={false}
                          >
                            <span aria-hidden="true" className="cl-dtile">
                              <span>{tile.month}</span>
                              <b>{Number(tile.day)}</b>
                            </span>
                            <span className="cl-grow">
                              <span className="cl-row-title">{event.title}</span>
                              <span className="cl-row-sub">
                                {formatTime(event.starts_at, locale)}–{formatTime(event.ends_at, locale)}
                                {event.location ? ` · ${event.location}` : ""}
                              </span>
                            </span>
                            {registration ? (
                              <span className="cl-tag" data-tone="ok">
                                {registration === "attended"
                                  ? t("events.registration.checkedIn")
                                  : t("dashboard.home.going")}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })
                    ) : (
                      <p className="cl-empty">{t("clubs.profile.upcomingEmpty")}</p>
                    )}
                  </div>
                ),
                id: "events",
                label: tf("clubs.profile.tabs.events", { count: eventRows.length }),
              },
            ]}
          />
        </div>

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
      {actor.profile?.role === "student" &&
      club.status === "active" &&
      !activeMembership ? (
        <div aria-hidden="true" className="h-16 lg:hidden" />
      ) : null}
    </div>
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

function getMediaUrl(
  clubId: string,
  kind: "banner" | "logo",
  profile: ClubProfileRow | null,
) {
  const path = kind === "logo" ? profile?.logo_path : profile?.banner_path;

  return path
    ? `/clubs/${clubId}/media/${kind}?v=${encodeURIComponent(profile?.updated_at ?? "")}`
    : null;
}

function categoryLabel(category: string, t: (key: string) => string) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
