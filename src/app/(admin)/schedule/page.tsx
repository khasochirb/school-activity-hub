import Link from "next/link";
import { redirect } from "next/navigation";
import {
  eventCalendarDayKey,
  getDayQueryRange,
  resolveEventTimeZone,
} from "@/lib/events/event-calendar-range";
import {
  formatTime,
  formatTimelineDay,
  formatWeekdayLong,
} from "@/lib/i18n/date-format";
import {
  getOwnRoster,
  getPortfolioI18n,
  getPortfolioViewer,
} from "@/lib/portfolio/portfolio-data";
import {
  buildScheduleDays,
  offsetScheduleWeek,
  parseScheduleWeek,
  scheduleDayKeys,
  type ScheduleEvent,
} from "@/lib/schedule/schedule";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "../_components/clean-ui";
import { EmptyState } from "../_components/page-ui";

const WEEK_EVENT_LIMIT = 200;

// A student's week: events they registered for and events their clubs hold,
// plus when their clubs meet. Everything is read as the signed-in student, so
// row-level security decides what they may see.
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { locale, t } = await getPortfolioI18n();
  const viewer = await getPortfolioViewer();

  if (!viewer) redirect("/login");
  // Staff keep the school calendar.
  if (viewer.role !== "student") redirect("/events?view=week");

  const student = await getOwnRoster(viewer);

  if (!student) {
    return (
      <div className="cl-page">
        <EmptyState
          description={t("events.student.noRosterWarning")}
          title={t("schedule.title")}
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", viewer.schoolId)
    .maybeSingle<{ timezone: string | null }>();
  const timeZone = resolveEventTimeZone(school?.timezone);
  const todayKey = eventCalendarDayKey(new Date(), timeZone);
  const { week } = await searchParams;
  const monday = parseScheduleWeek(Array.isArray(week) ? week[0] : week, todayKey);
  const dayKeys = scheduleDayKeys(monday);
  const from = getDayQueryRange(dayKeys[0], timeZone).from;
  const to = getDayQueryRange(dayKeys[6], timeZone).to;

  const [{ data: memberships }, { data: registrations }] = await Promise.all([
    supabase
      .from("club_memberships")
      .select("club_id")
      .eq("school_id", viewer.schoolId)
      .eq("student_roster_id", student.id)
      .eq("status", "active")
      .returns<{ club_id: string }[]>(),
    supabase
      .from("event_attendees")
      .select("event_id")
      .eq("student_roster_id", student.id)
      .in("status", ["registered", "attended"])
      .returns<{ event_id: string }[]>(),
  ]);
  const clubIds = (memberships ?? []).map((row) => row.club_id);
  const registeredEventIds = (registrations ?? []).map((row) => row.event_id);
  const eventFilters = [
    registeredEventIds.length ? `id.in.(${registeredEventIds.join(",")})` : null,
    clubIds.length ? `club_id.in.(${clubIds.join(",")})` : null,
  ].filter(Boolean);
  const [{ data: events }, { data: clubs }, { data: clubProfiles }] = await Promise.all([
    eventFilters.length
      ? supabase
          .from("events")
          .select("id, title, starts_at, ends_at, location, club_id")
          .in("status", ["approved", "completed"])
          .gte("starts_at", from)
          .lt("starts_at", to)
          .or(eventFilters.join(","))
          .order("starts_at")
          .limit(WEEK_EVENT_LIMIT)
          .returns<ScheduleEvent[]>()
      : Promise.resolve({ data: [] as ScheduleEvent[] }),
    clubIds.length
      ? supabase
          .from("clubs")
          .select("id, name")
          .in("id", clubIds)
          .order("name")
          .returns<{ id: string; name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    clubIds.length
      ? supabase
          .from("club_profiles")
          .select("club_id, meeting_schedule, meeting_location")
          .in("club_id", clubIds)
          .returns<
            {
              club_id: string;
              meeting_location: string | null;
              meeting_schedule: string | null;
            }[]
          >()
      : Promise.resolve({ data: [] }),
  ]);
  const days = buildScheduleDays({
    clubIds,
    dayKeyOf: (startsAt) => eventCalendarDayKey(startsAt, timeZone),
    events: events ?? [],
    monday,
    registeredEventIds,
  });
  const clubNames = new Map((clubs ?? []).map((club) => [club.id, club.name]));
  const meetingByClub = new Map((clubProfiles ?? []).map((row) => [row.club_id, row]));
  const noon = (dayKey: string) => `${dayKey}T12:00:00Z`;
  const weekHref = (target: string) =>
    target === parseScheduleWeek(undefined, todayKey)
      ? "/schedule"
      : `/schedule?week=${target}`;

  return (
    <div className="cl-page">
      <PageHead subtitle={t("schedule.subtitle")} title={t("schedule.title")} />

      <nav aria-label={t("schedule.title")} className="schedule-weeknav">
        <Link className="cl-chip" href={weekHref(offsetScheduleWeek(monday, -1))} prefetch={false}>
          ← {t("events.week.previousWeek")}
        </Link>
        <b>
          {formatTimelineDay(noon(dayKeys[0]), locale, "UTC")} –{" "}
          {formatTimelineDay(noon(dayKeys[6]), locale, "UTC")}
        </b>
        {todayKey >= dayKeys[0] && todayKey <= dayKeys[6] ? null : (
          <Link className="cl-chip" href="/schedule" prefetch={false}>
            {t("events.calendar.today")}
          </Link>
        )}
        <Link className="cl-chip" href={weekHref(offsetScheduleWeek(monday, 1))} prefetch={false}>
          {t("events.week.nextWeek")} →
        </Link>
      </nav>

      <ol className="schedule-days">
        {days.map((day) => (
          <li data-today={day.dayKey === todayKey ? "" : undefined} key={day.dayKey}>
            <h2>
              {formatWeekdayLong(noon(day.dayKey), locale, "UTC")}
              <span>{formatTimelineDay(noon(day.dayKey), locale, "UTC")}</span>
            </h2>
            {day.items.length ? (
              <ul>
                {day.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/events/${item.id}`} prefetch={false}>
                      <time dateTime={item.starts_at}>
                        {formatTime(item.starts_at, locale, timeZone)}–
                        {formatTime(item.ends_at, locale, timeZone)}
                      </time>
                      <span className="cl-grow">
                        <span className="cl-row-title">{item.title}</span>
                        <span className="cl-row-sub">
                          {[
                            item.club_id ? clubNames.get(item.club_id) : null,
                            item.location,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span
                        className="cl-tag"
                        data-tone={item.reason === "registered" ? "ok" : "blue"}
                      >
                        {item.reason === "registered"
                          ? t("events.filters.registered")
                          : t("studentProfile.clubs.title")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("events.week.noEventsOnDay")}</p>
            )}
          </li>
        ))}
      </ol>

      <section className="schedule-clubs">
        <h2>{t("schedule.clubTimes")}</h2>
        {clubs?.length ? (
          <ul>
            {clubs.map((club) => {
              const meeting = meetingByClub.get(club.id);

              return (
                <li key={club.id}>
                  <Link href={`/clubs/${club.id}`} prefetch={false}>
                    <span className="cl-row-title">{club.name}</span>
                    <span className="cl-row-sub">
                      {meeting?.meeting_schedule
                        ? [meeting.meeting_schedule, meeting.meeting_location]
                            .filter(Boolean)
                            .join(" · ")
                        : t("schedule.noMeetingTime")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>
            {t("studentProfile.clubs.empty")}{" "}
            <Link href="/clubs" prefetch={false}>
              {t("studentProfile.clubs.find")}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
