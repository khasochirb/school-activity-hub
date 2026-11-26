import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import { getEventPosterDeliveryUrl } from "@/lib/events/event-poster";
import {
  formatCalendarDateBadge,
  formatLongDate,
  formatWeekdayShort,
} from "@/lib/i18n/date-format";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "../_components/page-ui";
import {
  NewsFront,
  NewsMasthead,
  type NewsAdvert,
  type NewsLabels,
  type NewsReport,
  type NewsUpcoming,
} from "./news-ui";

type Profile = {
  id: string;
  role: "school_admin" | "teacher" | "student";
  school_id: string;
  status: "active" | "inactive";
  schools: { name: string; timezone: string | null } | null;
};

type EventRow = {
  category: string | null;
  clubs: { name: string } | null;
  description: string | null;
  ends_at: string;
  id: string;
  location: string | null;
  poster_path: string | null;
  starts_at: string;
  title: string;
};

type ClubProfileFields = {
  eligibility_notes: string | null;
  logo_path: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
  tagline: string | null;
  updated_at: string;
};

type ClubRow = {
  id: string;
  name: string;
  club_profiles: ClubProfileFields | ClubProfileFields[] | null;
};

const REPORT_LIMIT = 4;
const UPCOMING_LIMIT = 5;
const ADVERT_LIMIT = 3;

export default async function NewsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, school_id, status, schools(name, timezone)")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || profile.status !== "active") {
    redirect("/dashboard");
  }

  const isStaff = profile.role === "school_admin" || profile.role === "teacher";
  const timeZone = profile.schools?.timezone ?? undefined;
  const now = new Date().toISOString();
  const eventFields =
    "id, title, description, category, location, starts_at, ends_at, poster_path, clubs!events_club_school_fk(name)";

  const [{ data: pastEvents }, { data: upcomingEvents }, { data: clubs }] =
    await Promise.all([
      supabase
        .from("events")
        .select(eventFields)
        .eq("school_id", profile.school_id)
        .eq("status", "approved")
        .lt("ends_at", now)
        .order("ends_at", { ascending: false })
        .limit(REPORT_LIMIT)
        .returns<EventRow[]>(),
      supabase
        .from("events")
        .select(eventFields)
        .eq("school_id", profile.school_id)
        .eq("status", "approved")
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(UPCOMING_LIMIT)
        .returns<EventRow[]>(),
      supabase
        .from("clubs")
        .select(
          "id, name, club_profiles!club_profiles_club_school_fk(tagline, meeting_schedule, meeting_location, eligibility_notes, logo_path, updated_at)",
        )
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(12)
        .returns<ClubRow[]>(),
    ]);

  const reportRows = pastEvents ?? [];
  const leadAttendance =
    isStaff && reportRows[0]
      ? await getAttendanceFigures(supabase, reportRows[0].id, profile.school_id)
      : null;

  const reports: NewsReport[] = reportRows.map((event, index) => ({
    attendance: index === 0 ? leadAttendance : null,
    category: event.category,
    categoryLabel: categoryLabel(event.category, t),
    clubName: event.clubs?.name ?? null,
    dateLabel: formatLongDate(event.starts_at, locale, timeZone),
    description: event.description?.trim() || null,
    href: `/events/${event.id}`,
    id: event.id,
    location: event.location,
    posterUrl: event.poster_path
      ? getEventPosterDeliveryUrl(event.id, event.poster_path)
      : null,
    title: event.title,
  }));

  const upcoming: NewsUpcoming[] = (upcomingEvents ?? []).map((event) => ({
    dateLabel: formatUpcomingDate(event.starts_at, locale, timeZone),
    href: `/events/${event.id}`,
    id: event.id,
    location: event.location,
    title: event.title,
  }));

  const advertClubs = (clubs ?? [])
    .map((club) => ({ club, details: firstProfile(club.club_profiles) }))
    .filter(({ details }) => details?.tagline || details?.meeting_schedule)
    .slice(0, ADVERT_LIMIT);
  const memberCounts = await Promise.all(
    advertClubs.map(async ({ club }) => {
      const { data } = await supabase.rpc("get_club_member_count", {
        target_club_id: club.id,
      });

      return typeof data === "number" ? data : null;
    }),
  );
  const adverts: NewsAdvert[] = advertClubs.map(({ club, details }, index) => ({
    eligibility: details?.eligibility_notes ?? null,
    href: `/clubs/${club.id}`,
    id: club.id,
    logoUrl: details?.logo_path
      ? `/clubs/${club.id}/media/logo?v=${encodeURIComponent(details.updated_at)}`
      : null,
    meetingLocation: details?.meeting_location ?? null,
    meetingSchedule: details?.meeting_schedule ?? null,
    memberCount: memberCounts[index],
    name: club.name,
    tagline: details?.tagline ?? null,
  }));

  const labels: NewsLabels = {
    advertKicker: t("news.advertKicker"),
    attendanceHeading: t("news.attendanceHeading"),
    checkedIn: t("news.checkedIn"),
    clubNotices: t("news.clubNotices"),
    comingUp: t("news.comingUp"),
    eventReport: t("news.eventReport"),
    heldOn: (date) => tf("news.heldOn", { date }),
    meets: t("news.meets"),
    members: (count) => tf("news.members", { count }),
    moreReports: t("news.moreReports"),
    noSummary: t("news.noSummary"),
    noUpcoming: t("news.noUpcoming"),
    posterAlt: (event) => tf("news.posterAlt", { event }),
    readMore: t("news.readMore"),
    registered: t("news.registered"),
    reportFrom: (club) => tf("news.reportFrom", { club }),
    schoolEvent: t("news.schoolEvent"),
    visitClub: t("news.visitClub"),
    where: t("news.where"),
    whoCanJoin: t("news.whoCanJoin"),
  };

  return (
    <div className="news-page">
      <NewsMasthead
        dateLabel={formatLongDate(new Date(), locale, timeZone)}
        schoolName={profile.schools?.name ?? null}
        tagline={t("news.tagline")}
        title={t("news.masthead")}
      />
      {reports.length || adverts.length || upcoming.length ? (
        <NewsFront
          adverts={adverts}
          labels={labels}
          reports={reports}
          upcoming={upcoming}
        />
      ) : (
        <EmptyState
          description={t("news.emptyBody")}
          title={t("news.emptyTitle")}
        />
      )}
    </div>
  );
}

async function getAttendanceFigures(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  schoolId: string,
) {
  const [{ count: registered }, { count: checkedIn }] = await Promise.all([
    supabase
      .from("event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("school_id", schoolId)
      .neq("status", "canceled"),
    supabase
      .from("attendance_checkins")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("school_id", schoolId)
      .eq("result", "success"),
  ]);

  if (registered === null || checkedIn === null) {
    return null;
  }

  return { checkedIn, registered };
}

function formatUpcomingDate(
  value: string,
  locale: Awaited<ReturnType<typeof getCurrentLocale>>,
  timeZone: string | undefined,
) {
  const badge = formatCalendarDateBadge(value, locale, timeZone);

  return `${formatWeekdayShort(value, locale, timeZone)} · ${badge.day} ${badge.month}`;
}

function firstProfile(value: ClubRow["club_profiles"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function categoryLabel(category: string | null, t: (key: string) => string) {
  if (!category) {
    return null;
  }

  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
