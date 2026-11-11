import Link from "next/link";
import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import { formatDateTime } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import {
  buildStudentMilestones,
  initialsForName,
} from "@/lib/students/student-journey";
import type { StudentProfileData } from "@/lib/students/student-profile-data";
import { CategoryLabel, ClubAvatar, Section } from "../_components/clean-ui";

type Translate = (key: string) => string;
type TranslateFormat = (
  key: string,
  values: Record<string, string | number>,
) => string;

export function StudentProfileHero({
  data,
  displayName,
  gradeLine,
  t,
}: {
  data: StudentProfileData;
  displayName: string;
  gradeLine: string | null;
  t: Translate;
}) {
  return (
    <section className="cl-pfhero">
      <div aria-hidden="true" className="cl-pfbanner" />
      <div className="cl-pfhead">
        <span aria-hidden="true" className="cl-pfav">
          {initialsForName(displayName)}
        </span>
        <div className="min-w-0 pt-14">
          <h1>{displayName}</h1>
          {gradeLine ? <p>{gradeLine}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          {t("studentProfile.interests.title")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {data.interests.map((interest) => (
            <CategoryLabel category={interest} key={interest} label={categoryLabel(interest, t)} />
          ))}
          {!data.interests.length ? (
            <span className="text-sm text-[var(--muted)]">{t("studentProfile.interests.empty")}</span>
          ) : null}
          {data.interestsAvailable ? (
            <Link className="cl-widget-link ml-1" href="/profile/interests" prefetch={false}>
              {data.interests.length
                ? t("studentProfile.interests.edit")
                : t("studentProfile.interests.pick")}
            </Link>
          ) : null}
        </div>
        <p className="text-[13px] text-[var(--muted)]">{t("studentProfile.privacyNote")}</p>
      </div>
    </section>
  );
}

export function StudentProfile({
  data,
  locale,
  timeZone,
  t,
  tf,
}: {
  data: StudentProfileData;
  locale: Locale;
  timeZone?: string;
  t: Translate;
  tf: TranslateFormat;
}) {
  const milestones = buildStudentMilestones(data.counts);
  const done = milestones.filter((milestone) => milestone.achieved).length;

  return (
    <>
      <Section title={t("studentProfile.journey.title")}>
        <p className="-mt-1 text-[13.5px] text-[var(--muted)]">
          {t("studentProfile.journey.description")}
        </p>
        <dl className="cl-stats">
          <JourneyCount label={t("studentProfile.journey.clubsJoined")} value={data.counts.clubsJoined} />
          <JourneyCount label={t("studentProfile.journey.sessionsAttended")} value={data.counts.sessionsAttended} />
          <JourneyCount label={t("studentProfile.journey.categoriesTried")} value={data.counts.categoriesTried} />
          <JourneyCount label={t("studentProfile.journey.ideasProposed")} value={data.counts.ideasProposed} />
        </dl>
      </Section>

      <section className="cl-sec">
        <header>
          <h2>{t("studentProfile.milestones.title")}</h2>
          <span className="text-sm text-[var(--muted)]">
            {done} / {milestones.length}
          </span>
        </header>
        <ul className="cl-goals">
          {milestones.map((milestone) => {
            const percent = Math.round((milestone.progress / milestone.target) * 100);

            return (
              <li className="cl-card" key={milestone.key}>
                <span className="min-w-0">
                  <b className="flex flex-wrap items-center gap-2 text-sm">
                    {t(`studentProfile.milestones.${milestone.key}.title`)}
                    {milestone.achieved ? (
                      <span className="cl-tag" data-tone="ok">
                        {t("studentProfile.milestones.done")}
                      </span>
                    ) : null}
                  </b>
                  <span className="mt-0.5 block text-[13px] text-[var(--muted)]">
                    {t(`studentProfile.milestones.${milestone.key}.hint`)}
                  </span>
                </span>
                <span
                  aria-label={tf("studentProfile.milestones.progress", {
                    progress: milestone.progress,
                    target: milestone.target,
                  })}
                  className="cl-ring cl-ring-sm"
                  role="img"
                  style={{
                    background: `conic-gradient(${milestone.achieved ? "var(--cl-green)" : "var(--cl-sun)"} ${percent * 3.6}deg, var(--card-soft) 0)`,
                  }}
                >
                  <b>
                    {milestone.progress}/{milestone.target}
                  </b>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <Section
        link={{ href: "/clubs", label: t("dashboard.home.allClubs") }}
        title={t("studentProfile.clubs.title")}
      >
        {data.clubs.length ? (
          <div className="cl-card cl-rows">
            {data.clubs.map((club) => (
              <Link className="cl-row" href={`/clubs/${club.id}`} key={club.id} prefetch={false}>
                <ClubAvatar category={club.category} name={club.name} />
                <span className="cl-grow cl-row-title">{club.name}</span>
                <CategoryLabel
                  category={club.category}
                  label={club.category ? categoryLabel(club.category, t) : null}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="cl-card cl-row">
            <span className="cl-grow text-sm text-[var(--muted)]">{t("studentProfile.clubs.empty")}</span>
            <Link className="cl-btn-soft" href="/clubs" prefetch={false}>
              {t("studentProfile.clubs.find")}
            </Link>
          </div>
        )}
      </Section>

      <Section title={t("studentProfile.upcoming.title")}>
        {data.upcoming.length ? (
          <div className="cl-card cl-rows">
            {data.upcoming.map((event) => (
              <Link className="cl-row" href={`/events/${event.id}`} key={event.id} prefetch={false}>
                <span className="cl-grow">
                  <span className="cl-row-title">{event.title}</span>
                  <span className="cl-row-sub">
                    {formatDateTime(event.starts_at, locale, timeZone)}
                    {event.location ? ` · ${event.location}` : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="cl-card cl-empty">{t("studentProfile.upcoming.empty")}</p>
        )}
      </Section>
    </>
  );
}

function JourneyCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="cl-card cl-stat">
      <dt className="cl-muted">{label}</dt>
      <dd>
        <b>{value}</b>
      </dd>
    </div>
  );
}

function categoryLabel(category: string, t: Translate) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
